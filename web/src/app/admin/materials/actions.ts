"use server";

import { updateTag } from "next/cache";

import { componentKindLabels } from "@/lib/i18n";
import { MATERIAL_COLORS, MATERIAL_TEXTURES } from "@/lib/material-visual";
import { requireUser } from "@/lib/supabase-server";

export type CategoryInput = {
  id: string | null;
  kind: string;
  slug: string;
  name_ja: string;
  name_en: string;
  sort_order: string;
  colors: string[];
  textures: string[];
};

export type CategoryResult = { ok: boolean; message: string };

async function adminClient() {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) throw new Error("管理者の権限がありません");
  return supabase;
}

// 素材の分類（舗装・ファニチャー・照明など）の追加と修正
export async function saveCategory(c: CategoryInput): Promise<CategoryResult> {
  if (!(c.kind in componentKindLabels)) return { ok: false, message: "種別が正しくありません" };
  if (!c.name_ja.trim()) return { ok: false, message: "名前（日本語）を入れてください" };
  if (!c.name_en.trim()) return { ok: false, message: "名前（英語）を入れてください" };
  const slug = c.slug.trim();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { ok: false, message: "slug は英小文字・数字・ハイフンで入力してください（例: recycled-wood-deck）" };
  const order = c.sort_order.trim() === "" ? 100 : Number(c.sort_order);
  if (!Number.isInteger(order) || order < 0 || order > 32000) return { ok: false, message: "並び順は 0〜32000 の整数で入力してください" };

  const colors = c.colors.filter((x) => x in MATERIAL_COLORS);
  const textures = c.textures.filter((x) => x in MATERIAL_TEXTURES);

  const supabase = await adminClient();
  const row = { kind: c.kind, slug, name_ja: c.name_ja.trim(), name_en: c.name_en.trim(), sort_order: order, colors, textures };
  const { error } = c.id ? await supabase.from("component_categories").update(row).eq("id", c.id) : await supabase.from("component_categories").insert(row);
  if (error) return { ok: false, message: error.message.includes("component_categories_slug_key") ? "この slug はすでに使われています" : error.message };
  updateTag("projects");
  return { ok: true, message: c.id ? "保存しました" : "追加しました" };
}

// 事例で使われている分類は消せない（使われていなければ削除できる）
export async function deleteCategory(id: string): Promise<CategoryResult> {
  const supabase = await adminClient();
  const { count, error: countError } = await supabase.from("project_components").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (countError) return { ok: false, message: countError.message };
  if (count) return { ok: false, message: `${count} 件の事例で使われているため削除できません。名前を直すか、先に事例から外してください` };
  const { error } = await supabase.from("component_categories").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  updateTag("projects");
  return { ok: true, message: "削除しました" };
}

// 素材の写真を差し替える（path が null なら外す）。前の写真のファイルは消す
export async function setMaterialPhoto(id: string, path: string | null, credit: string): Promise<CategoryResult> {
  const supabase = await adminClient();
  const { data: before, error: readError } = await supabase.from("component_categories").select("photo_path").eq("id", id).single();
  if (readError) return { ok: false, message: readError.message };
  const { error } = await supabase
    .from("component_categories")
    .update({ photo_path: path, photo_credit: path ? credit.trim() || null : null })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  if (before?.photo_path && before.photo_path !== path) await supabase.storage.from("photos").remove([before.photo_path]);
  updateTag("projects");
  return { ok: true, message: path ? "写真を入れました" : "写真を外しました" };
}
