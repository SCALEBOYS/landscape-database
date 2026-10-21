"use server";

import { updateTag } from "next/cache";

import { requireUser } from "@/lib/supabase-server";

export type PostInput = {
  id: string | null;
  slug: string;
  kind: "news" | "feature";
  title_ja: string;
  title_en: string;
  summary_ja: string;
  summary_en: string;
  body_ja: string;
  body_en: string;
  project_id: string;
  link_url: string;
  status: "draft" | "published";
  published_at: string; // YYYY-MM-DD
};
export type Result = { ok: boolean; message: string; id?: string };

const blank = (s: string) => (s.trim() ? s.trim() : null);

export async function savePost(p: PostInput): Promise<Result> {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) return { ok: false, message: "管理者の権限がありません" };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug.trim())) return { ok: false, message: "slug は英小文字・数字・ハイフンで入力してください（例: 2026-award）" };
  if (!p.title_ja.trim()) return { ok: false, message: "タイトルを入れてください" };
  if (p.link_url.trim() && !/^https?:\/\//.test(p.link_url.trim())) return { ok: false, message: "リンクは http から始まる URL にしてください" };
  const row = {
    slug: p.slug.trim(),
    kind: p.kind,
    title_ja: p.title_ja.trim(),
    title_en: blank(p.title_en),
    summary_ja: blank(p.summary_ja),
    summary_en: blank(p.summary_en),
    body_ja: blank(p.body_ja),
    body_en: blank(p.body_en),
    project_id: p.project_id || null,
    link_url: blank(p.link_url),
    status: p.status,
    published_at: new Date(`${p.published_at || new Date().toISOString().slice(0, 10)}T09:00:00+09:00`).toISOString(),
    updated_at: new Date().toISOString(),
  };
  const saved = p.id ? await supabase.from("posts").update(row).eq("id", p.id).select("id").single() : await supabase.from("posts").insert(row).select("id").single();
  if (saved.error) return { ok: false, message: saved.error.message.includes("slug") ? "この slug はすでに使われています" : saved.error.message };
  updateTag("posts");
  return { ok: true, message: "保存しました", id: saved.data.id as string };
}

export async function deletePost(id: string): Promise<Result> {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) return { ok: false, message: "管理者の権限がありません" };
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  updateTag("posts");
  return { ok: true, message: "削除しました" };
}
