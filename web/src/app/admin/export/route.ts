import { TEMPLATE_HEADERS, toCsv } from "@/lib/import-projects";
import { categoryLabels } from "@/lib/i18n";
import { requireUser } from "@/lib/supabase-server";

// 登録済みの事例（下書きも含む）を CSV で書き出す。列は取り込み用のひな形と同じ並びに、確認用の列を足したもの
export async function GET() {
  const { supabase, isAdmin } = await requireUser();
  if (!isAdmin) return new Response("管理者の権限がありません", { status: 403 });

  const [{ data: projects, error }, { data: points }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        `id, slug, name_ja, name_en, use_category, other_uses, prefecture, municipality, address_ja, completed_year, completed_on, completed_precision, site_area_m2, summary_ja, status, updated_at,
        credits:project_credits(sort_order, party:parties(name_ja)),
        awards:project_awards(award_name, award_year),
        sources(url),
        plantings:project_plantings(species:species(name_ja)),
        components:project_components(category:component_categories(name_ja)),
        laws:project_laws(law:laws(name_ja)),
        photos(count),
        models:project_models(count)`,
      )
      .order("name_ja"),
    supabase.from("project_points").select("id, lat, lng"),
  ]);
  if (error) return new Response(error.message, { status: 500 });

  type Row = {
    id: string; slug: string; name_ja: string; name_en: string | null; use_category: string; other_uses: string[]; prefecture: string; municipality: string | null; address_ja: string | null;
    completed_year: number | null; completed_on: string | null; completed_precision: string; site_area_m2: number | null; summary_ja: string | null; status: string; updated_at: string;
    credits: { sort_order: number; party: { name_ja: string } | null }[];
    awards: { award_name: string; award_year: number | null }[];
    sources: { url: string }[];
    plantings: { species: { name_ja: string } | null }[];
    components: { category: { name_ja: string } | null }[];
    laws: { law: { name_ja: string } | null }[];
    photos: { count: number }[];
    models: { count: number }[];
  };
  const coords = new Map((points ?? []).map((p) => [p.id, p]));
  const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];
  const join = (xs: (string | null | undefined)[]) => uniq(xs).join("／");

  const header = [...TEMPLATE_HEADERS, "slug", "公開状態", "樹種", "素材", "法令", "写真の枚数", "3Dモデルの数", "更新日"];
  const body = (projects as unknown as Row[]).map((p) => {
    const c = coords.get(p.id);
    const byHeader: Record<string, string> = {
      名称: p.name_ja,
      英語名: p.name_en ?? "",
      用途: [p.use_category, ...(p.other_uses ?? [])].map((u) => categoryLabels[u]?.ja ?? u).join("／"),
      都道府県: p.prefecture,
      市区町村: p.municipality ?? "",
      住所: p.address_ja ?? "",
      緯度: c?.lat != null ? String(c.lat) : "",
      経度: c?.lng != null ? String(c.lng) : "",
      // 月・日まで分かっていればその精度で（取り込みでも読める形）
      竣工年: !p.completed_year ? "" : p.completed_on && p.completed_precision === "day" ? p.completed_on : p.completed_on && p.completed_precision === "month" ? p.completed_on.slice(0, 7) : String(p.completed_year),
      面積: p.site_area_m2 ? String(p.site_area_m2) : "",
      設計: join([...p.credits].sort((a, b) => a.sort_order - b.sort_order).map((x) => x.party?.name_ja)),
      受賞: join(p.awards.map((a) => a.award_name)),
      受賞年: join(p.awards.map((a) => (a.award_year ? String(a.award_year) : null))),
      出典: uniq(p.sources.map((s) => s.url)).join(" "),
      概要: p.summary_ja ?? "",
      slug: p.slug,
      公開状態: p.status === "published" ? "公開" : "下書き",
      樹種: join(p.plantings.map((x) => x.species?.name_ja)),
      素材: join(p.components.map((x) => x.category?.name_ja)),
      法令: join(p.laws.map((x) => x.law?.name_ja)),
      写真の枚数: String(p.photos[0]?.count ?? 0),
      "3Dモデルの数": String(p.models[0]?.count ?? 0),
      更新日: p.updated_at.slice(0, 10),
    };
    return header.map((h) => byHeader[h] ?? "");
  });

  const date = new Date().toISOString().slice(0, 10);
  // Excel で文字化けしないよう、先頭に BOM を付ける
  return new Response("﻿" + toCsv([header, ...body]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="landscape-database-projects-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
