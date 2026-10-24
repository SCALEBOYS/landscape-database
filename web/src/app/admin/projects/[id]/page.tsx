import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../../AdminHeader";
import type { ProjectPayload } from "../../actions";
import { PhotoManager, type AdminPhoto } from "../../PhotoManager";
import { ModelManager, type AdminModel } from "../../ModelManager";
import type { PointOption } from "../../PointEditor";
import { EditorTabs, type EditorTab } from "../../EditorTabs";
import { ProjectForm } from "../../ProjectForm";

// AI（文章で探す・下書き・写真の候補）の処理を待てるように
export const maxDuration = 60;

export default function EditProjectPage(props: PageProps<"/admin/projects/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Editor {...props} />
    </Suspense>
  );
}

const EMPTY: ProjectPayload = {
  id: null,
  slug: "",
  parent_id: null,
  name_ja: "",
  name_en: "",
  use_category: "park",
  other_uses: [],
  prefecture: "大阪府",
  municipality: "",
  address_ja: "",
  lat: "",
  lng: "",
  completed_year: "",
  completed_precision: "year",
  completed_date: "",
  completion_note: "",
  site_area_m2: "",
  summary_ja: "",
  summary_en: "",
  summary_en_status: "none",
  status: "draft",
  designers: [],
  awards: [],
  sources: [],
  plantings: [],
  components: [],
  laws: [],
  notes: { impressions: "", rating: "", detail_notes: "", cost_notes: "", visit_notes: "" },
};

// ポイントに結びつけられる候補: この事例に保存済みの植栽（樹種）と構成要素（素材の分類）
function pointOptions(
  p: ProjectPayload,
  species: { id: string; name_ja: string; scientific_name: string }[],
  categories: { id: string; name_ja: string }[],
): PointOption[] {
  const sp = [...new Set(p.plantings.map((x) => x.species_id))].flatMap((id) => {
    const found = species.find((x) => x.id === id);
    return found ? [{ kind: "species" as const, id, label: `${found.name_ja}（${found.scientific_name}）` }] : [];
  });
  const cat = [...new Set(p.components.map((x) => x.category_id))].flatMap((id) => {
    const found = categories.find((x) => x.id === id);
    const products = p.components.filter((c) => c.category_id === id).map((c) => [c.product_name, c.maker_name].filter(Boolean).join(" / ")).filter(Boolean);
    return found ? [{ kind: "category" as const, id, label: found.name_ja + (products.length ? `（${products.join("、")}）` : "") }] : [];
  });
  return [...sp, ...cat];
}

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

async function Editor({ params, searchParams }: PageProps<"/admin/projects/[id]">) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;

  const [speciesRes, categoriesRes, parentsRes, lawsRes] = await Promise.all([
    supabase.from("species").select("id, name_ja, scientific_name").order("name_ja"),
    supabase.from("component_categories").select("id, kind, name_ja, sort_order").order("kind").order("sort_order"),
    supabase.from("projects").select("id, name_ja").order("name_ja"),
    supabase.from("laws").select("id, kind, name_ja, jurisdiction_ja").order("sort_order"),
  ]);

  let initial = EMPTY;
  let photos: AdminPhoto[] = [];
  let center: { lat: number; lng: number } | null = null;
  let models: AdminModel[] = [];
  if (id !== "new") {
    const { data: p } = await supabase
      .from("projects")
      .select(
        `*,
         credits:project_credits(sort_order, party:parties(name_ja)),
         awards:project_awards(award_name, award_year),
         sources(url),
         plantings:project_plantings(species_id, layer),
         components:project_components(category_id, product_name, maker_name),
         laws:project_laws(law_id, note_ja, source_url, sort_order),
         notes:project_private_notes(*),
         models:project_models(id, storage_path, file_name, size_bytes, caption_ja, offset_east_m, offset_north_m, altitude_m, rotation_deg, scale, show_on_map, sort_order),
         photos(id, storage_path, taken_on, caption_ja, caption_en, people_checked, is_cover, sort_order, points:photo_points(id, x, y, species_id, category_id, note_ja, created_at), location:photo_locations(lat, lng, heading, source, is_public))`,
      )
      .eq("id", id)
      .maybeSingle();
    if (!p) notFound();
    // 座標はビュー project_points から別に読む（埋め込みだと null になり、空欄のまま保存すると座標が消えていた）
    const { data: point } = await supabase.from("project_points").select("lat, lng").eq("id", id).maybeSingle();
    const notes = (Array.isArray(p.notes) ? p.notes[0] : p.notes) as Record<string, unknown> | null;
    initial = {
      id: p.id,
      slug: p.slug,
      parent_id: p.parent_id,
      name_ja: p.name_ja,
      name_en: s(p.name_en),
      use_category: p.use_category,
      other_uses: (p.other_uses as string[] | null) ?? [],
      prefecture: p.prefecture,
      municipality: s(p.municipality),
      address_ja: s(p.address_ja),
      lat: point ? String(point.lat) : "",
      lng: point ? String(point.lng) : "",
      completed_year: s(p.completed_year),
      completed_precision: (p.completed_precision ?? "year") as ProjectPayload["completed_precision"],
      completed_date: p.completed_on ? (p.completed_precision === "month" ? String(p.completed_on).slice(0, 7) : String(p.completed_on)) : "",
      completion_note: s(p.completion_note),
      site_area_m2: s(p.site_area_m2),
      summary_ja: s(p.summary_ja),
      summary_en: s(p.summary_en),
      summary_en_status: p.summary_en_status,
      status: p.status,
      designers: (p.credits as { sort_order: number; party: { name_ja: string } }[])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((c) => c.party.name_ja),
      awards: (p.awards as { award_name: string; award_year: number | null }[]).map((a) => ({ award_name: a.award_name, award_year: s(a.award_year) })),
      sources: (p.sources as { url: string }[]).map((x) => x.url),
      plantings: p.plantings as ProjectPayload["plantings"],
      components: (p.components as { category_id: string; product_name: string | null; maker_name: string | null }[]).map((c) => ({
        category_id: c.category_id,
        product_name: s(c.product_name),
        maker_name: s(c.maker_name),
      })),
      laws: (p.laws as { law_id: string; note_ja: string | null; source_url: string | null; sort_order: number }[])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((x) => ({ law_id: x.law_id, note_ja: s(x.note_ja), source_url: s(x.source_url) })),
      notes: {
        impressions: s(notes?.impressions),
        rating: s(notes?.rating),
        detail_notes: s(notes?.detail_notes),
        cost_notes: s(notes?.cost_notes),
        visit_notes: s(notes?.visit_notes),
      },
    };
    models = (p.models as (AdminModel & { sort_order: number })[]).sort((a, b) => a.sort_order - b.sort_order);
    photos = (p.photos as (AdminPhoto & { points: (AdminPhoto["points"][number] & { created_at: string })[] })[])
      .sort((a, b) => a.sort_order - b.sort_order)
      // 撮影地点は写真と1対1。配列で返ることもあるので1件にそろえる
      .map((ph) => ({ ...ph, location: oneOf(ph.location), points: [...ph.points].sort((a, b) => a.created_at.localeCompare(b.created_at)) }));
    center = point ?? null;
  }

  // タブの横に、入力が足りているかの目安を出す
  const blank = (v: string) => !v.trim();
  const tabs: EditorTab[] = [
    { key: "basic", label: "基本情報", ...(blank(initial.lat) || blank(initial.completed_year) ? { note: "未入力あり", warn: true } : {}) },
    { key: "text", label: "説明文", ...(blank(initial.summary_ja) ? { note: "なし", warn: true } : initial.summary_en_status !== "reviewed" ? { note: "英訳未確認", warn: true } : {}) },
    { key: "credits", label: "設計・受賞・出典", note: initial.designers.length ? String(initial.designers.length) : "設計なし", warn: !initial.designers.length },
    { key: "plants", label: "植栽・素材", note: `${initial.plantings.length}・${initial.components.length}`, warn: !initial.plantings.length && !initial.components.length },
    { key: "laws", label: "法令", ...(initial.laws.length ? { note: String(initial.laws.length) } : {}) },
    { key: "photos", label: "写真", note: String(photos.length), warn: !photos.length },
    { key: "model", label: "3D", ...(models.length ? { note: String(models.length) } : {}) },
    { key: "memo", label: "非公開メモ" },
  ];

  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">{initial.id ? initial.name_ja : "事例の新規登録"}</h1>
        {initial.id && initial.status === "published" && (
          <Link href={`/ja/projects/${initial.slug}`} className="text-sm text-accent hover:underline">
            公開ページを見る
          </Link>
        )}
      </div>
      {saved && <p className="mb-4 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">保存しました</p>}
      <EditorTabs tabs={tabs}>
      <ProjectForm
        initial={initial}
        species={speciesRes.data ?? []}
        categories={categoriesRes.data ?? []}
        laws={lawsRes.data ?? []}
        parents={(parentsRes.data ?? []).filter((x) => x.id !== initial.id)}
      />
      {initial.id ? (
        <div data-tab="photos">
        <PhotoManager
          projectId={initial.id}
          projectSlug={initial.slug}
          photos={photos}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          pointOptions={pointOptions(initial, speciesRes.data ?? [], categoriesRes.data ?? [])}
          center={center}
        />
        </div>
      ) : null}
      {initial.id ? (
        <div data-tab="model">
          <ModelManager projectId={initial.id} projectSlug={initial.slug} models={models} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} />
        </div>
      ) : (
        <p data-tab="photos model" className="mt-8 text-sm text-muted">写真と 3D モデルは、事例を一度保存した後に追加できます。</p>
      )}
      </EditorTabs>
    </>
  );
}

const oneOf = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
