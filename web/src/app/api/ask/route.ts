import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { AI_MODEL, AiError, aiErrorMessage, ai, takeQuota } from "@/lib/ai";
import { siteKnowledge } from "@/lib/ai-knowledge";
import { hasLocale } from "@/lib/i18n";

export const maxDuration = 60;

const Body = z.object({
  lang: z.string(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(12),
});

// 質問窓口。サイトに載っている情報だけを根拠に、ページへのリンク付きで答える（文字を順に流して返す）
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") return new Response("bad request", { status: 400 });
  const lang = hasLocale(parsed.data.lang) ? parsed.data.lang : "ja";

  let record: Awaited<ReturnType<typeof takeQuota>>;
  try {
    record = await takeQuota("ask");
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return Response.json({ error: aiErrorMessage(code, lang) }, { status: code === "limit" ? 429 : 503 });
  }

  const knowledge = await siteKnowledge(lang);
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    {
      type: "text",
      text: [
        "あなたは Landscape Database（関西から始めるランドスケープ事例のデータベース）の質問窓口です。",
        "答えの根拠は、下の「サイトの情報」に書かれていることだけです。書かれていないことは推測で補わず、「このサイトにはまだ情報がありません」と伝えます。一般的な知識で補足するときは、サイトの情報ではないと分かるように書きます。",
        "事例・樹種・設計・法令・研究に触れるときは、一覧にある Markdown のリンク（例: [名前](/ja/projects/slug)）をそのまま使います。一覧にないリンクは作りません。",
        "法令の説明は要点にとどめ、実際の計画では原文と所管の窓口で確認するよう添えます。",
        "「確認前の下書き」とある研究は、そのことを添えて紹介します。",
        `答えは${lang === "en" ? "英語" : "日本語"}で、短い段落か箇条書きで簡潔に書きます。見出しは使いません。`,
        "",
        "# サイトの情報",
        knowledge,
      ].join("\n"),
      cache_control: { type: "ephemeral" },
    },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const s = ai().beta.messages.stream({
          model: AI_MODEL,
          max_tokens: 8000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium" },
          system,
          messages: parsed.data.messages,
        });
        for await (const event of s) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") controller.enqueue(encoder.encode(event.delta.text));
        }
        const final = await s.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode(aiErrorMessage("refused", lang)));
        void record(final.usage);
      } catch (e) {
        console.error("ask failed", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
        controller.enqueue(encoder.encode(`\n\n${aiErrorMessage("failed", lang)}`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
