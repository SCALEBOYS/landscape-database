import "server-only";

import { createHash } from "node:crypto";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { headers } from "next/headers";
import type { z } from "zod";

import { supabase } from "./data";

// サイトの AI はすべて Claude Opus 5.5 を使う（利用者の指定）
export const AI_MODEL = "claude-opus-5-5";
// 安全上の判断で断られたとき、サーバー側で別のモデルにやり直させる
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

// 公開側の上限（Vercel の環境変数で変えられる）。端末ごと1時間あたり・サイト全体1日あたり
const PER_HOUR = Number(process.env.AI_LIMIT_PER_HOUR ?? 20);
const PER_DAY = Number(process.env.AI_LIMIT_PER_DAY ?? 500);

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
export function ai() {
  client ??= new Anthropic();
  return client;
}

// 利用者に見せる失敗の理由（内部のエラー文は出さない）
export class AiError extends Error {
  constructor(public code: "disabled" | "limit" | "refused" | "failed") {
    super(code);
  }
}

// 端末の識別子。IP アドレスをそのまま残さず、ハッシュにする
async function clientHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${ip}:${process.env.NEXT_PUBLIC_SUPABASE_URL}`).digest("hex").slice(0, 40);
}

// 公開側の AI を使う前に呼ぶ。上限を超えていたら AiError("limit")。返す関数で使ったトークン数を記録する
export async function takeQuota(kind: "search" | "ask") {
  if (!aiEnabled()) throw new AiError("disabled");
  const { data, error } = await supabase().rpc("ai_take_quota", { p_kind: kind, p_client: await clientHash(), p_per_hour: PER_HOUR, p_per_day: PER_DAY });
  if (error) throw new AiError("failed");
  if (!data) throw new AiError("limit");
  const id = data as string;
  return (usage: { input_tokens: number; output_tokens: number }) =>
    supabase().rpc("ai_record_tokens", { p_id: id, p_in: usage.input_tokens, p_out: usage.output_tokens }).then(() => {});
}

type JsonRequest<S extends z.ZodType> = {
  schema: S;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[] | string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
};

// 決まった形の JSON で答えさせる（検索条件・下書き・写真の候補）
export async function askJson<S extends z.ZodType>({ schema, system, content, effort = "medium", maxTokens = 16000 }: JsonRequest<S>) {
  if (!aiEnabled()) throw new AiError("disabled");
  try {
    const res = await ai().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: maxTokens,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system,
      output_config: { effort, format: betaZodOutputFormat(schema) },
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") throw new AiError("refused");
    if (!res.parsed_output) throw new AiError("failed");
    return { data: res.parsed_output as z.infer<S>, usage: res.usage };
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new AiError("limit");
    console.error("AI request failed", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    throw new AiError("failed");
  }
}

export const aiErrorMessage = (code: AiError["code"], lang: "ja" | "en") =>
  ({
    disabled: { ja: "AI の機能は準備中です。", en: "AI features are not available yet." },
    limit: { ja: "AI の利用が混み合っています。しばらくしてからもう一度お試しください。", en: "AI is busy right now. Please try again later." },
    refused: { ja: "この内容には AI でお答えできません。", en: "AI cannot answer this request." },
    failed: { ja: "AI の処理に失敗しました。もう一度お試しください。", en: "Something went wrong. Please try again." },
  })[code][lang];
