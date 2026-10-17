"use server";

import { createHash } from "node:crypto";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/supabase-server";

export type ProjectPayload = {
  id: string | null;
  slug: string;
  parent_id: string | null;
  name_ja: string;
  name_en: string;
  use_category: string;
  prefecture: string;
  municipality: string;
  address_ja: string;
  lat: string;
  lng: string;
  completed_year: string;
  completion_note: string;
  site_area_m2: string;
  summary_ja: string;
  summary_en: string;
  summary_en_status: "none" | "machine_draft" | "reviewed";
  status: "draft" | "published";
  designers: string[];
  awards: { award_name: string; award_year: string }[];
  sources: string[];
  plantings: { species_id: string; layer: string }[];
  components: { category_id: string; product_name: string; maker_name: string }[];
  notes: { impressions: string; rating: string; detail_notes: string; cost_notes: string; visit_notes: string };
};

export type SaveResult = { ok: boolean; message: string };

const blank = (v: string) => (v.trim() === "" ? null : v.trim());
const num = (v: string) => (v.trim() === "" ? null : Number(v));

// 設計者の slug は scripts/load_sample_projects.py と同じ規則（社名の sha1 先頭10桁）
const partySlug = (name: string) => "p-" + createHash("sha1").update(name, "utf8").digest("hex").slice(0, 10);

async function adminClient() {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) throw new Error("管理者の権限がありません");
  return supabase;
}

export async function saveProject(_: SaveResult | null, formData: FormData): Promise<SaveResult> {
  const p = JSON.parse(String(formData.get("payload"))) as ProjectPayload;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) return { ok: false, message: "slug は英小文字・数字・ハイフンで入力してください" };
  if (!p.name_ja.trim() || !p.prefecture.trim()) return { ok: false, message: "名称と都道府県は必須です" };
  const lat = num(p.lat);
  const lng = num(p.lng);
  if ((lat === null) !== (lng === null) || (lat !== null && (Number.isNaN(lat) || Number.isNaN(lng!)))) {
    return { ok: false, message: "緯度と経度は両方とも数値で入力してください" };
  }

  const supabase = await adminClient();
  const row = {
    slug: p.slug,
    parent_id: p.parent_id || null,
    name_ja: p.name_ja.trim(),
    name_en: blank(p.name_en),
    use_category: p.use_category,
    prefecture: p.prefecture.trim(),
    municipality: blank(p.municipality),
    address_ja: blank(p.address_ja),
    location: lat !== null ? `SRID=4326;POINT(${lng} ${lat})` : null,
    completed_year: num(p.completed_year),
    completion_note: blank(p.completion_note),
    site_area_m2: num(p.site_area_m2),
    summary_ja: blank(p.summary_ja),
    summary_en: blank(p.summary_en),
    summary_en_status: p.summary_en_status,
    status: p.status,
  };

  let id = p.id;
  if (id) {
    const { data: before } = await supabase.from("projects").select("published_at").eq("id", id).single();
    const published_at = p.status === "published" && !before?.published_at ? new Date().toISOString() : undefined;
    const { error } = await supabase.from("projects").update({ ...row, ...(published_at ? { published_at } : {}) }).eq("id", id);
    if (error) return { ok: false, message: describe(error.message) };
  } else {
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...row, published_at: p.status === "published" ? new Date().toISOString() : null })
      .select("id")
      .single();
    if (error) return { ok: false, message: describe(error.message) };
    id = data.id as string;
  }

  // 子テーブルは入れ替える
  for (const table of ["project_credits", "project_awards", "sources", "project_plantings", "project_components"]) {
    const { error } = await supabase.from(table).delete().eq("project_id", id);
    if (error) return { ok: false, message: error.message };
  }

  const designers = [...new Set(p.designers.map((d) => d.trim()).filter(Boolean))];
  if (designers.length) {
    const { data: parties, error } = await supabase
      .from("parties")
      .upsert(designers.map((name) => ({ slug: partySlug(name), name_ja: name })), { onConflict: "slug" })
      .select("id, slug");
    if (error) return { ok: false, message: error.message };
    const bySlug = new Map(parties.map((x) => [x.slug, x.id]));
    const { error: e2 } = await supabase.from("project_credits").insert(
      designers.map((name, i) => ({ project_id: id, party_id: bySlug.get(partySlug(name)), role: "landscape_design", sort_order: i })),
    );
    if (e2) return { ok: false, message: e2.message };
  }

  const inserts: [string, Record<string, unknown>[]][] = [
    ["project_awards", p.awards.filter((a) => a.award_name.trim()).map((a) => ({ project_id: id, award_name: a.award_name.trim(), award_year: num(a.award_year) }))],
    ["sources", [...new Set(p.sources.map((u) => u.trim()).filter(Boolean))].map((url) => ({ project_id: id, url, kind: p.awards.length ? "award" : "other" }))],
    [
      "project_plantings",
      [...new Map(p.plantings.filter((x) => x.species_id).map((x) => [`${x.species_id}:${x.layer}`, x])).values()].map((x) => ({ project_id: id, species_id: x.species_id, layer: x.layer })),
    ],
    [
      "project_components",
      p.components.filter((c) => c.category_id).map((c) => ({ project_id: id, category_id: c.category_id, product_name: blank(c.product_name), maker_name: blank(c.maker_name) })),
    ],
  ];
  for (const [table, rows] of inserts) {
    if (!rows.length) continue;
    const { error } = await supabase.from(table).insert(rows);
    if (error) return { ok: false, message: `${table}: ${error.message}` };
  }

  const n = p.notes;
  const { error: notesError } = await supabase.from("project_private_notes").upsert({
    project_id: id,
    impressions: blank(n.impressions),
    rating: num(n.rating),
    detail_notes: blank(n.detail_notes),
    cost_notes: blank(n.cost_notes),
    visit_notes: blank(n.visit_notes),
  });
  if (notesError) return { ok: false, message: notesError.message };

  updateTag("projects");
  if (!p.id) redirect(`/admin/projects/${id}?saved=1`);
  return { ok: true, message: "保存しました" };
}

function describe(message: string) {
  if (message.includes("projects_slug_key")) return "この slug はすでに使われています";
  return message;
}

export type NewPhoto = {
  project_id: string;
  storage_path: string;
  taken_on: string;
  caption_ja: string;
  caption_en: string;
  width: number;
  height: number;
  people_checked: boolean;
};

// ブラウザで EXIF を消して Storage に上げた後に呼ぶ
export async function addPhoto(photo: NewPhoto) {
  const supabase = await adminClient();
  const { count } = await supabase.from("photos").select("id", { count: "exact", head: true }).eq("project_id", photo.project_id);
  const { error } = await supabase.from("photos").insert({
    ...photo,
    caption_ja: blank(photo.caption_ja),
    caption_en: blank(photo.caption_en),
    exif_stripped: true,
    is_cover: (count ?? 0) === 0,
    sort_order: count ?? 0,
  });
  if (error) throw new Error(error.message);
  updateTag("projects");
}

export async function updatePhoto(id: string, projectId: string, patch: { people_checked?: boolean; is_cover?: boolean; caption_ja?: string; caption_en?: string }) {
  const supabase = await adminClient();
  if (patch.is_cover) {
    const { error } = await supabase.from("photos").update({ is_cover: false }).eq("project_id", projectId);
    if (error) throw new Error(error.message);
  }
  const { error } = await supabase.from("photos").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  updateTag("projects");
}

export async function deletePhoto(id: string, storagePath: string) {
  const supabase = await adminClient();
  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  const { error: storageError } = await supabase.storage.from("photos").remove([storagePath]);
  if (storageError) throw new Error(storageError.message);
  updateTag("projects");
}
