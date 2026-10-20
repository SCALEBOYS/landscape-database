"use server";

import { updateTag } from "next/cache";

import { requireUser } from "@/lib/supabase-server";

async function adminClient() {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) throw new Error("管理者の権限がありません");
  return supabase;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const blank = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);
export type Result = { ok: boolean; message: string; id?: string };

export type PaperInput = {
  id: string | null;
  slug: string;
  kind: "article" | "report" | "book";
  title: string;
  title_ja: string;
  authors: string;
  year: string;
  venue: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  url: string;
  language: "ja" | "en" | "other";
  summary_ja: string;
  summary_en: string;
  review_status: "draft" | "reviewed";
  method_ids: string[];
  project_ids: string[];
  species_ids: string[];
  category_ids: string[];
};

// 論文の追加・修正。手法・事例・樹種・素材とのつながりは入れ直す
export async function savePaper(p: PaperInput): Promise<Result> {
  if (!SLUG.test(p.slug.trim())) return { ok: false, message: "slug は英小文字・数字・ハイフンで入力してください（例: ulrich-1984-window-view）" };
  if (!p.title.trim() || !p.authors.trim() || !p.venue.trim()) return { ok: false, message: "原題・著者・掲載誌は必須です" };
  const year = Number(p.year);
  if (!Number.isInteger(year) || year < 1800 || year > 2100) return { ok: false, message: "発行年を正しく入力してください" };
  const doi = blank(p.doi)?.replace(/^https?:\/\/(dx\.)?doi\.org\//, "") ?? null;
  if (!doi && !blank(p.url)) return { ok: false, message: "DOI か原文の URL のどちらかを入れてください" };
  if (!p.summary_ja.trim()) return { ok: false, message: "要約（日本語）を入れてください" };

  const supabase = await adminClient();
  const row = {
    slug: p.slug.trim(),
    kind: p.kind,
    title: p.title.trim(),
    title_ja: blank(p.title_ja),
    authors: p.authors.trim(),
    year,
    venue: p.venue.trim(),
    volume: blank(p.volume),
    issue: blank(p.issue),
    pages: blank(p.pages),
    doi,
    url: blank(p.url),
    language: p.language,
    summary_ja: p.summary_ja.trim(),
    summary_en: blank(p.summary_en),
    review_status: p.review_status,
    updated_at: new Date().toISOString(),
  };
  const saved = p.id ? await supabase.from("papers").update(row).eq("id", p.id).select("id").single() : await supabase.from("papers").insert(row).select("id").single();
  if (saved.error) return { ok: false, message: saved.error.message.includes("slug") ? "この slug はすでに使われています" : saved.error.message.includes("doi") ? "この DOI の論文はすでに登録されています" : saved.error.message };
  const id = saved.data.id as string;

  const children: [string, string, string[]][] = [
    ["paper_methods", "method_id", p.method_ids],
    ["paper_projects", "project_id", p.project_ids],
    ["paper_species", "species_id", p.species_ids],
    ["paper_categories", "category_id", p.category_ids],
  ];
  for (const [table, col, ids] of children) {
    // 事例のメモは残したいので、外したものだけ消して、足りないものを足す
    const { data: existing, error } = await supabase.from(table).select(col).eq("paper_id", id);
    if (error) return { ok: false, message: error.message };
    const have = new Set((existing as unknown as Record<string, string>[]).map((r) => r[col]));
    const drop = [...have].filter((x) => !ids.includes(x));
    const add = ids.filter((x) => !have.has(x));
    if (drop.length) {
      const { error: e } = await supabase.from(table).delete().eq("paper_id", id).in(col, drop);
      if (e) return { ok: false, message: e.message };
    }
    if (add.length) {
      const { error: e } = await supabase.from(table).insert(add.map((x) => ({ paper_id: id, [col]: x })));
      if (e) return { ok: false, message: e.message };
    }
  }
  updateTag("research");
  return { ok: true, message: "保存しました", id };
}

export async function deletePaper(id: string): Promise<Result> {
  const supabase = await adminClient();
  const { error } = await supabase.from("papers").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  updateTag("research");
  return { ok: true, message: "削除しました" };
}

export type MethodInput = {
  id: string | null;
  slug: string;
  name_ja: string;
  name_en: string;
  summary_ja: string;
  summary_en: string;
  body_ja: string;
  body_en: string;
  sort_order: string;
  review_status: "draft" | "reviewed";
};

export async function saveMethod(m: MethodInput): Promise<Result> {
  if (!SLUG.test(m.slug.trim())) return { ok: false, message: "slug は英小文字・数字・ハイフンで入力してください" };
  if (!m.name_ja.trim() || !m.name_en.trim() || !m.summary_ja.trim()) return { ok: false, message: "名前（日本語・英語）と概要（日本語）は必須です" };
  const order = m.sort_order.trim() === "" ? 100 : Number(m.sort_order);
  if (!Number.isInteger(order)) return { ok: false, message: "並び順は整数で入力してください" };
  const supabase = await adminClient();
  const row = {
    slug: m.slug.trim(),
    name_ja: m.name_ja.trim(),
    name_en: m.name_en.trim(),
    summary_ja: m.summary_ja.trim(),
    summary_en: blank(m.summary_en),
    body_ja: blank(m.body_ja),
    body_en: blank(m.body_en),
    sort_order: order,
    review_status: m.review_status,
    updated_at: new Date().toISOString(),
  };
  const saved = m.id ? await supabase.from("methods").update(row).eq("id", m.id).select("id").single() : await supabase.from("methods").insert(row).select("id").single();
  if (saved.error) return { ok: false, message: saved.error.message.includes("slug") ? "この slug はすでに使われています" : saved.error.message };
  updateTag("research");
  return { ok: true, message: "保存しました", id: saved.data.id as string };
}

export async function deleteMethod(id: string): Promise<Result> {
  const supabase = await adminClient();
  const { count } = await supabase.from("paper_methods").select("paper_id", { count: "exact", head: true }).eq("method_id", id);
  if (count) return { ok: false, message: `この手法を使っている論文が ${count} 本あるので削除できません` };
  const { error } = await supabase.from("methods").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  updateTag("research");
  return { ok: true, message: "削除しました" };
}

// 一覧から「確認済み」に切り替える
export async function setReviewed(table: "papers" | "methods", id: string, reviewed: boolean): Promise<Result> {
  const supabase = await adminClient();
  const { error } = await supabase.from(table).update({ review_status: reviewed ? "reviewed" : "draft" }).eq("id", id);
  if (error) return { ok: false, message: error.message };
  updateTag("research");
  return { ok: true, message: reviewed ? "確認済みにしました" : "下書きに戻しました" };
}
