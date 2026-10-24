"use server";

import { z } from "zod";

import { AiError, aiErrorMessage, askJson } from "@/lib/ai";
import { readSource } from "@/lib/source-reader";
import { requireUser } from "@/lib/supabase-server";

async function adminClient() {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) throw new Error("管理者の権限がありません");
  return supabase;
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

const PaperDraft = z.object({
  kind: z.enum(["article", "report", "book"]),
  title: z.string(),
  title_ja: z.string(),
  authors: z.string(),
  year: z.number().int().nullable(),
  venue: z.string(),
  volume: z.string(),
  issue: z.string(),
  pages: z.string(),
  url: z.string(),
  language: z.enum(["ja", "en", "other"]),
  slug: z.string(),
  summary_ja: z.string(),
  summary_en: z.string(),
  method_ids: z.array(z.string()),
  project_ids: z.array(z.string()),
  species_ids: z.array(z.string()),
  category_ids: z.array(z.string()),
  caution: z.string(),
});
export type PaperDraftData = z.infer<typeof PaperDraft> & { doi: string };
type Option = { id: string; label: string };

// Crossref から書誌情報を取る（DOI があるとき）。著者・掲載誌・巻号はここを正とする
async function crossref(doi: string) {
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "LandscapeDatabase/1.0 (https://landscapedatabase.com)" } });
  if (!res.ok) return null;
  const m = (await res.json()).message as Record<string, unknown>;
  return JSON.stringify({
    title: m.title,
    author: (m.author as { family?: string; given?: string; name?: string }[] | undefined)?.map((a) => a.name ?? `${a.family}, ${a.given ?? ""}`.trim()),
    year: (m.issued as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0]?.[0],
    venue: (m["container-title"] as string[] | undefined)?.[0] ?? m.publisher,
    volume: m.volume,
    issue: m.issue,
    page: m.page,
    type: m.type,
    url: m.URL,
    abstract: typeof m.abstract === "string" ? m.abstract.replace(/<[^>]+>/g, " ").slice(0, 6000) : null,
  });
}

// DOI か論文のページの URL から、論文カードの下書きを作る（保存はしない）
export async function draftPaper(
  ref: string,
  options: { methods: Option[]; projects: Option[]; species: Option[]; categories: Option[] },
): Promise<{ ok: true; draft: PaperDraftData } | { ok: false; message: string }> {
  try {
    const supabase = await adminClient();
    const v = ref.trim();
    const doi = v.match(/10\.\d{4,9}\/[^\s"<>]+/)?.[0]?.replace(/[.)]+$/, "") ?? "";
    const parts: Parameters<typeof askJson>[0]["content"] = [];
    const meta = doi ? await crossref(doi) : null;
    if (meta) parts.push({ type: "text", text: `Crossref の書誌情報（DOI ${doi}）:\n${meta}` });
    if (/^https?:\/\//.test(v)) {
      try {
        parts.push(await readSource(v));
      } catch (e) {
        if (!meta) throw e;
      }
    }
    if (!parts.length) return { ok: false, message: "DOI（10.xxxx/…）か、論文のページの URL を入れてください" };
    const list = (xs: Option[]) => xs.map((x) => `${x.id}=${x.label}`).join(", ");
    const { data, usage } = await askJson({
      schema: PaperDraft,
      effort: "medium",
      system: [
        "ランドスケープの研究データベースに載せる論文カードの下書きを作ります。渡された書誌情報と本文・抄録だけを根拠にします。",
        "書誌情報（著者・年・掲載誌・巻・号・ページ）は Crossref の情報があればそれを正とし、なければ本文から読み取ります。分からない欄は空にします。著者は「姓, 名; 姓, 名」の形で原文どおりにします。",
        "summary_ja は抄録を写さず、何を調べ、何が分かり、設計や計画にどう生かせるかを自分の言葉で3〜4文にまとめます。summary_en はその英訳です。",
        "title_ja は原題が日本語でないときだけ訳を入れます。slug は「筆頭著者の姓-年-内容を表す英単語2〜3語」を英小文字とハイフンで作ります。",
        "method_ids・project_ids・species_ids・category_ids は、下の一覧の id から、論文の内容とはっきり関係するものだけを選びます。",
        "caution には、確かめたほうがよい点を日本語で一文にまとめます。なければ空にします。",
        "",
        `手法: ${list(options.methods)}`,
        `事例: ${list(options.projects)}`,
        `樹種: ${list(options.species)}`,
        `素材の分類: ${list(options.categories)}`,
      ].join("\n"),
      content: parts,
    });
    await supabase.from("ai_usage").insert({ kind: "draft", client_hash: "admin-paper", input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
    const keep = (ids: string[], xs: Option[]) => ids.filter((id) => xs.some((x) => x.id === id));
    return {
      ok: true,
      draft: {
        ...data,
        doi,
        method_ids: keep(data.method_ids, options.methods),
        project_ids: keep(data.project_ids, options.projects),
        species_ids: keep(data.species_ids, options.species),
        category_ids: keep(data.category_ids, options.categories),
      },
    };
  } catch (e) {
    if (e instanceof AiError) return { ok: false, message: aiErrorMessage(e.code, "ja") };
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

const PostDraft = z.object({
  title_ja: z.string(),
  title_en: z.string(),
  slug: z.string(),
  summary_ja: z.string(),
  body_ja: z.string(),
  summary_en: z.string(),
  body_en: z.string(),
});
export type PostDraftData = z.infer<typeof PostDraft>;

// 箇条書きのメモから、NEWS・特集の記事の下書きを作る（保存はしない）
export async function draftPost(memo: string, kind: "news" | "feature"): Promise<{ ok: true; draft: PostDraftData } | { ok: false; message: string }> {
  try {
    const supabase = await adminClient();
    if (!memo.trim()) return { ok: false, message: "メモを入れてください" };
    const { data, usage } = await askJson({
      schema: PostDraft,
      effort: "medium",
      system: [
        `Landscape Database（関西から始めるランドスケープ事例のデータベース）の${kind === "news" ? "お知らせ（NEWS）" : "特集記事"}の下書きを、管理者のメモから作ります。`,
        "メモにない事実は足しません。落ち着いた、です・ます調の日本語で書きます。",
        kind === "news" ? "本文は2〜4段落の短いお知らせにします。" : "本文は導入・本論・まとめの流れで、小見出しの後に「- 」の箇条書きを使ってもかまいません。",
        "本文の書き方: 段落は空行で区切ります。「- 」で始まる行は箇条書きになり、その前の1行は小見出しになります。",
        "summary_ja は一覧に出る1〜2文の要約です。英語の欄はそれぞれの自然な英訳です。slug は「年-内容を表す英単語2〜3語」を英小文字とハイフンで作ります。",
      ].join("\n"),
      content: memo.slice(0, 8000),
    });
    await supabase.from("ai_usage").insert({ kind: "draft", client_hash: "admin-post", input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
    return { ok: true, draft: data };
  } catch (e) {
    if (e instanceof AiError) return { ok: false, message: aiErrorMessage(e.code, "ja") };
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
