"use server";

import Anthropic from "@anthropic-ai/sdk";
import { updateTag } from "next/cache";

import { AI_MODEL, ai, aiEnabled, aiErrorMessage } from "@/lib/ai";
import { CHECKS, projectChecks, STATUS_SELECT, type CheckKey, type ProjectStatusSource } from "@/lib/admin-checks";
import { categoryLabels } from "@/lib/i18n";
import { readSource } from "@/lib/source-reader";
import { requireUser } from "@/lib/supabase-server";

async function adminClient() {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) throw new Error("管理者の権限がありません");
  return supabase;
}
type Db = Awaited<ReturnType<typeof adminClient>>;

// AI が直してよい事例の項目（提案として出し、管理者が「反映」を押したときだけ保存する）
const EDITABLE = ["name_en", "summary_ja", "summary_en", "completed_year", "completion_note", "site_area_m2", "municipality", "address_ja"] as const;
type Editable = (typeof EDITABLE)[number];
export type Proposal = { id: string; project_id: string; project_name: string; changes: Partial<Record<Editable, string | number>>; reason: string };

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_projects",
    description: "登録済みの事例（下書きを含む）を探す。名前・所在地の文字、公開状態、入力が足りない項目で絞り込める。各事例の id・名前・状態・所在地と、項目ごとの入力の有無を返す。",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "名前・所在地に含まれる文字。空なら全件" },
        status: { type: "string", enum: ["all", "draft", "published"] },
        missing: { type: "string", enum: CHECKS.map((c) => c.key), description: "この項目が未入力の事例だけにする" },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get_project",
    description: "事例1件の詳しい内容（基本情報・説明文・設計・受賞・出典・植栽・素材・法令・写真の枚数）を返す。",
    input_schema: { type: "object", properties: { id: { type: "string", description: "事例の id" } }, required: ["id"], additionalProperties: false },
  },
  {
    name: "read_source",
    description: "出典などのウェブページや PDF を読む。事例の情報を確かめたり、説明文の下書きを作ったりするときに使う。",
    input_schema: { type: "object", properties: { url: { type: "string" } }, required: ["url"], additionalProperties: false },
  },
  {
    name: "propose_project_update",
    description:
      "事例の項目を直す提案を、管理者の画面に出す。保存はされず、管理者が確かめて「反映」を押したときだけ保存される。直せる項目: name_en, summary_ja, summary_en, completed_year, completion_note, site_area_m2, municipality, address_ja。",
    input_schema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        changes: {
          type: "object",
          properties: {
            name_en: { type: "string" },
            summary_ja: { type: "string" },
            summary_en: { type: "string" },
            completed_year: { type: "integer" },
            completion_note: { type: "string" },
            site_area_m2: { type: "number" },
            municipality: { type: "string" },
            address_ja: { type: "string" },
          },
          additionalProperties: false,
        },
        reason: { type: "string", description: "なぜこの値にしたか、根拠（出典など）を日本語で短く" },
      },
      required: ["project_id", "changes", "reason"],
      additionalProperties: false,
    },
  },
];

const SYSTEM = [
  "あなたは Landscape Database（関西から始めるランドスケープ事例のデータベース）の管理者を手伝うアシスタントです。管理者と日本語で話します。",
  "道具を使って、登録済みの事例を調べたり、出典を読んだり、項目を直す提案を出したりできます。",
  "データを直すときは必ず propose_project_update で提案として出します。提案は保存されず、管理者が確かめてから反映します。",
  "出典で確かめられない値は提案しません。推測で埋めず、確かめられなかったことを伝えます。説明文は出典の写しではなく、自分の言葉で2〜3文にまとめます。",
  "一度にたくさんの事例を直す依頼は、数件ずつ進め、続けるかを管理者に聞きます。",
  "返事は短く、要点を箇条書きにします。",
].join("\n");

async function runTool(db: Db, name: string, input: Record<string, unknown>, proposals: Proposal[]): Promise<Anthropic.ToolResultBlockParam["content"]> {
  if (name === "search_projects") {
    const [{ data, error }, { data: points }] = await Promise.all([
      db.from("projects").select(`id, name_ja, status, use_category, prefecture, municipality, ${STATUS_SELECT}`).order("name_ja"),
      db.from("project_points").select("id, lat"),
    ]);
    if (error) throw new Error(error.message);
    const located = new Set((points ?? []).filter((p) => p.lat !== null).map((p) => p.id));
    const q = String(input.query ?? "").trim();
    const status = String(input.status ?? "all");
    const missing = input.missing as CheckKey | undefined;
    const rows = (data ?? [])
      .map((p) => ({ p, has: projectChecks(p as unknown as ProjectStatusSource, located.has(p.id)) }))
      .filter(({ p, has }) => (!q || `${p.name_ja}${p.prefecture}${p.municipality ?? ""}`.includes(q)) && (status === "all" || p.status === status) && (!missing || !has[missing]))
      .slice(0, 60)
      .map(({ p, has }) => ({
        id: p.id,
        name: p.name_ja,
        status: p.status === "published" ? "公開" : "下書き",
        use: categoryLabels[p.use_category]?.ja,
        place: `${p.prefecture}${p.municipality ?? ""}`,
        missing: CHECKS.filter((c) => !has[c.key]).map((c) => c.label),
      }));
    return JSON.stringify({ count: rows.length, projects: rows });
  }
  if (name === "get_project") {
    const { data, error } = await db
      .from("projects")
      .select(
        `id, slug, name_ja, name_en, status, use_category, prefecture, municipality, address_ja, completed_year, completion_note, site_area_m2, summary_ja, summary_en, summary_en_status,
         credits:project_credits(party:parties(name_ja)), awards:project_awards(award_name, award_year), sources(url),
         plantings:project_plantings(layer, species:species(name_ja)), components:project_components(category:component_categories(name_ja)),
         laws:project_laws(note_ja, law:laws(name_ja)), photos(count)`,
      )
      .eq("id", String(input.id))
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? JSON.stringify(data) : "その id の事例はありません";
  }
  if (name === "read_source") {
    const doc = await readSource(String(input.url));
    return doc.type === "text" ? doc.text : [doc];
  }
  if (name === "propose_project_update") {
    const id = String(input.project_id);
    const { data: p } = await db.from("projects").select("id, name_ja").eq("id", id).maybeSingle();
    if (!p) return "その id の事例はありません";
    const raw = (input.changes ?? {}) as Record<string, unknown>;
    const changes = Object.fromEntries(EDITABLE.filter((k) => raw[k] !== undefined && raw[k] !== "").map((k) => [k, raw[k] as string | number]));
    if (!Object.keys(changes).length) return "直す項目がありません";
    proposals.push({ id: crypto.randomUUID(), project_id: id, project_name: p.name_ja, changes, reason: String(input.reason ?? "") });
    return "提案を管理者の画面に出しました。管理者が「反映」を押すまで保存されません。";
  }
  return `知らない道具です: ${name}`;
}

export type AssistantResult =
  | { ok: true; history: Anthropic.MessageParam[]; reply: string; proposals: Proposal[]; steps: string[] }
  | { ok: false; message: string };

const STEP_LABELS: Record<string, string> = { search_projects: "事例を探しました", get_project: "事例を読みました", read_source: "出典を読みました", propose_project_update: "直す案を作りました" };

// 管理用 AI アシスタントの1往復。道具を使い終わるまで繰り返し、返事と提案を返す
// history には AI の返事（考えた過程の記録を含む）をそのまま入れて次の往復に渡す
export async function assistantTurn(history: Anthropic.MessageParam[], text: string): Promise<AssistantResult> {
  try {
    const db = await adminClient();
    if (!aiEnabled()) return { ok: false, message: aiErrorMessage("disabled", "ja") };
    const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: text.slice(0, 4000) }];
    const proposals: Proposal[] = [];
    const steps: string[] = [];
    let usageIn = 0, usageOut = 0;

    for (let i = 0; i < 8; i++) {
      const res = await ai().messages.create({
        model: AI_MODEL,
        max_tokens: 16000,
        output_config: { effort: "medium" },
        system: SYSTEM,
        tools: TOOLS,
        cache_control: { type: "ephemeral" },
        messages,
      });
      usageIn += res.usage.input_tokens;
      usageOut += res.usage.output_tokens;
      messages.push({ role: "assistant", content: res.content });
      if (res.stop_reason === "refusal") return { ok: false, message: aiErrorMessage("refused", "ja") };
      if (res.stop_reason !== "tool_use") break;

      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type !== "tool_use") continue;
        steps.push(STEP_LABELS[block.name] ?? block.name);
        try {
          results.push({ type: "tool_result", tool_use_id: block.id, content: await runTool(db, block.name, block.input as Record<string, unknown>, proposals) });
        } catch (e) {
          results.push({ type: "tool_result", tool_use_id: block.id, content: e instanceof Error ? e.message : String(e), is_error: true });
        }
      }
      messages.push({ role: "user", content: results });
    }

    await db.from("ai_usage").insert({ kind: "draft", client_hash: "admin-assistant", input_tokens: usageIn, output_tokens: usageOut });
    const last = messages.at(-1);
    const reply =
      last?.role === "assistant" && Array.isArray(last.content)
        ? last.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n")
        : "（作業が長くなったので、ここで止めました。続けるなら「続けて」と送ってください）";
    return { ok: true, history: messages, reply, proposals, steps };
  } catch (e) {
    console.error("assistant failed", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return { ok: false, message: e instanceof Anthropic.RateLimitError ? aiErrorMessage("limit", "ja") : aiErrorMessage("failed", "ja") };
  }
}

// 提案を事例に反映する（AI が直してよい項目だけ）
export async function applyProposal(project_id: string, changes: Proposal["changes"]): Promise<{ ok: boolean; message: string }> {
  const db = await adminClient();
  const row: Record<string, string | number | null> = {};
  for (const k of EDITABLE) {
    const v = changes[k];
    if (v === undefined) continue;
    if (k === "completed_year") {
      row[k] = Number.isInteger(Number(v)) ? Number(v) : null;
      // 年だけを直すので、月・日の記録は外す（年と食い違わないように）
      row.completed_on = null;
      row.completed_precision = "year";
    }
    else if (k === "site_area_m2") row[k] = Number.isFinite(Number(v)) ? Number(v) : null;
    else row[k] = String(v).trim() || null;
  }
  if (row.summary_en) row.summary_en_status = "machine_draft";
  if (!Object.keys(row).length) return { ok: false, message: "反映する項目がありません" };
  const { error } = await db.from("projects").update(row).eq("id", project_id);
  if (error) return { ok: false, message: error.message };
  updateTag("projects");
  return { ok: true, message: "反映しました" };
}

// 日本語の説明文から、英語の説明文の案を作る（保存はしない）
export async function translateSummary(project_id: string): Promise<{ ok: true; summary_en: string; name_en: string } | { ok: false; message: string }> {
  try {
    const db = await adminClient();
    if (!aiEnabled()) return { ok: false, message: aiErrorMessage("disabled", "ja") };
    const { data: p } = await db.from("projects").select("name_ja, name_en, summary_ja").eq("id", project_id).maybeSingle();
    if (!p?.summary_ja?.trim()) return { ok: false, message: "日本語の説明文がありません" };
    const res = await ai().messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      system:
        "ランドスケープ事例の説明文を、自然な英語に訳します。固有名詞は公式の英語表記があればそれを、なければローマ字にします。1行目に事例名の英語表記、2行目以降に説明文の英訳だけを書きます。",
      messages: [{ role: "user", content: `事例名: ${p.name_ja}${p.name_en ? `（英語名: ${p.name_en}）` : ""}\n説明文: ${p.summary_ja}` }],
    });
    await db.from("ai_usage").insert({ kind: "draft", client_hash: "admin-bulk", input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens });
    if (res.stop_reason === "refusal") return { ok: false, message: aiErrorMessage("refused", "ja") };
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    const [first, ...rest] = text.split("\n");
    return { ok: true, name_en: p.name_en || first.trim(), summary_en: rest.join("\n").trim() };
  } catch (e) {
    console.error("translate failed", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return { ok: false, message: aiErrorMessage("failed", "ja") };
  }
}
