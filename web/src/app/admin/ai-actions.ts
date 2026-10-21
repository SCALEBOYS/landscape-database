"use server";

import { z } from "zod";

import { AiError, aiErrorMessage, askJson } from "@/lib/ai";
import { requireUser } from "@/lib/supabase-server";

async function adminClient() {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) throw new Error("管理者の権限がありません");
  return supabase;
}

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_TEXT = 60000;

// 出典のページ（HTML か PDF）を取ってきて、Claude に渡せる形にする
async function readSource(url: string) {
  const u = new URL(url);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("http(s) の URL を入れてください");
  const res = await fetch(u, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "LandscapeDatabaseBot/1.0 (+https://landscapedatabase.com/ja/about)" } });
  if (!res.ok) throw new Error(`ページを読めませんでした（${res.status}）`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("ファイルが大きすぎます（15MB まで）");
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("pdf") || u.pathname.toLowerCase().endsWith(".pdf")) {
    return { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: buf.toString("base64") } };
  }
  const text = buf
    .toString("utf8")
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  if (text.length < 50) throw new Error("ページから文章を読み取れませんでした");
  return { type: "text" as const, text: `出典 ${url} の本文:\n${text.slice(0, MAX_TEXT)}` };
}

const Draft = z.object({
  name_en: z.string(),
  municipality: z.string(),
  address_ja: z.string(),
  completed_year: z.number().int().nullable(),
  site_area_m2: z.number().nullable(),
  designers: z.array(z.string()),
  awards: z.array(z.object({ award_name: z.string(), award_year: z.number().int().nullable() })),
  summary_ja: z.string(),
  summary_en: z.string(),
  plantings: z.array(z.object({ species_id: z.string(), layer: z.enum(["tall_tree", "mid_tree", "shrub", "ground_cover", "climber", "other"]) })),
  component_ids: z.array(z.string()),
  unknown_species: z.array(z.string()),
  caution: z.string(),
});
export type DraftData = z.infer<typeof Draft>;
export type DraftResult = { ok: true; draft: DraftData } | { ok: false; message: string };

type Master = { id: string; label: string };

// 出典の URL から、事例の入力欄の下書きを作る。保存はしない（管理者が確かめてから反映・保存する）
export async function draftFromSource(url: string, name_ja: string, species: Master[], categories: Master[]): Promise<DraftResult> {
  try {
    const supabase = await adminClient();
    const doc = await readSource(url.trim());
    const { data, usage } = await askJson({
      schema: Draft,
      effort: "medium",
      system: [
        "あなたはランドスケープ事例データベースの入力を手伝います。渡された出典だけを読み、事例の入力欄の下書きを作ります。",
        "出典に書かれていないことは推測で埋めず、文字列は空、数値は null、配列は空にします。",
        "summary_ja は出典を自分の言葉で2〜3文に要約します（原文を写さない）。どんな場所で、何を目指し、どんな特徴があるか。summary_en はその英訳です。",
        "designers は設計に関わった会社・事務所の正式名を1社ずつ入れます（施工だけの会社は除く）。",
        "plantings の species_id と component_ids は、下の一覧の id だけを使います。一覧にない樹種名が出典にあれば unknown_species に和名で入れます。",
        "caution には、出典の中で食い違っている点や、確かめたほうがよい点を日本語で一文にまとめます。なければ空にします。",
        "",
        `樹種の一覧: ${species.map((s) => `${s.id}=${s.label}`).join(", ")}`,
        `素材の分類の一覧: ${categories.map((c) => `${c.id}=${c.label}`).join(", ")}`,
      ].join("\n"),
      content: [doc, { type: "text", text: `事例名: ${name_ja || "（未入力）"}` }],
    });
    const sp = new Set(species.map((s) => s.id));
    const cat = new Set(categories.map((c) => c.id));
    await supabase.from("ai_usage").insert({ kind: "draft", client_hash: "admin", input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
    return {
      ok: true,
      draft: { ...data, plantings: data.plantings.filter((p) => sp.has(p.species_id)), component_ids: [...new Set(data.component_ids)].filter((id) => cat.has(id)) },
    };
  } catch (e) {
    if (e instanceof AiError) return { ok: false, message: aiErrorMessage(e.code, "ja") };
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

const PhotoGuess = z.object({
  candidates: z.array(
    z.object({
      kind: z.enum(["species", "category"]),
      id: z.string(),
      x: z.number(),
      y: z.number(),
      confidence: z.enum(["high", "medium", "low"]),
      reason: z.string(),
    }),
  ),
});
export type PhotoCandidate = z.infer<typeof PhotoGuess>["candidates"][number] & { label: string };
export type PhotoGuessResult = { ok: true; candidates: PhotoCandidate[] } | { ok: false; message: string };

// 写真に写っている樹種・素材の候補と、写真の上のおおよその位置を AI が挙げる。確定は管理者が行う
export async function guessPhotoPoints(photoId: string): Promise<PhotoGuessResult> {
  try {
    const supabase = await adminClient();
    const [{ data: photo, error }, { data: species }, { data: categories }] = await Promise.all([
      supabase.from("photos").select("storage_path").eq("id", photoId).single(),
      supabase.from("species").select("id, name_ja, scientific_name"),
      supabase.from("component_categories").select("id, name_ja, kind"),
    ]);
    if (error || !photo) throw new Error("写真が見つかりません");
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.storage_path}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`写真を読めませんでした（${res.status}）`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 4.5 * 1024 * 1024) throw new Error("写真が大きすぎます（4.5MB まで）");

    const labels = new Map<string, string>([
      ...(species ?? []).map((s) => [`species:${s.id}`, `${s.name_ja}（${s.scientific_name}）`] as [string, string]),
      ...(categories ?? []).map((c) => [`category:${c.id}`, c.name_ja] as [string, string]),
    ]);
    const { data, usage } = await askJson({
      schema: PhotoGuess,
      effort: "high",
      system: [
        "あなたはランドスケープの写真から、写っている樹種と舗装・ファニチャーなどの素材を見分けます。",
        "候補は下の一覧の id だけを使います。kind は樹種なら species、素材なら category です。",
        "x・y は写真の幅・高さに対する位置（左上が 0,0、右下が 1,1）で、その樹木や素材がはっきり写っている場所の中心です。",
        "写真から確かに見分けられるものだけを、確からしさ（high・medium・low）を付けて最大10件挙げます。葉・樹形・樹皮・目地などの手がかりを reason に日本語で短く書きます。",
        "",
        `樹種: ${(species ?? []).map((s) => `${s.id}=${s.name_ja}`).join(", ")}`,
        `素材: ${(categories ?? []).map((c) => `${c.id}=${c.name_ja}`).join(", ")}`,
      ].join("\n"),
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: buf.toString("base64") } },
        { type: "text", text: "この写真に写っている樹種と素材の候補を挙げてください。" },
      ],
    });
    await supabase.from("ai_usage").insert({ kind: "photo", client_hash: "admin", input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    return {
      ok: true,
      candidates: data.candidates
        .filter((c) => labels.has(`${c.kind}:${c.id}`))
        .map((c) => ({ ...c, x: clamp(c.x), y: clamp(c.y), label: labels.get(`${c.kind}:${c.id}`)! })),
    };
  } catch (e) {
    if (e instanceof AiError) return { ok: false, message: aiErrorMessage(e.code, "ja") };
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
