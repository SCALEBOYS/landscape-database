import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";

// 公開データだけを読む。匿名キーなので RLS により公開物件と人物確認済みの写真に限られる
function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を web/.env.local に設定してください");
  return createClient(url, key, { auth: { persistSession: false } });
}

export type SpeciesRef = { slug: string; name_ja: string; name_en: string | null; scientific_name: string; growth_form?: string | null };
export type PartyRef = { slug: string; name_ja: string; name_en: string | null };

export type Project = {
  id: string;
  slug: string;
  parent_id: string | null;
  name_ja: string;
  name_en: string | null;
  use_category: string;
  prefecture: string;
  municipality: string | null;
  completed_year: number | null;
  site_area_m2: number | null;
  summary_ja: string | null;
  summary_en: string | null;
  summary_en_status: "none" | "machine_draft" | "reviewed";
  lat: number | null;
  lng: number | null;
  credits: { role: string; sort_order: number; party: PartyRef }[];
  plantings: { layer: string; species: SpeciesRef }[];
  components: {
    product_name: string | null;
    maker_name: string | null;
    category: { kind: string; slug: string; name_ja: string; name_en: string };
  }[];
  photos: {
    storage_path: string;
    is_cover: boolean;
    sort_order: number;
    caption_ja: string | null;
    caption_en: string | null;
    points: {
      x: number;
      y: number;
      note_ja: string | null;
      note_en: string | null;
      created_at: string;
      species: SpeciesRef | null;
      category: { kind: string; slug: string; name_ja: string; name_en: string } | null;
    }[];
  }[];
  awards: { award_name: string; award_year: number | null }[];
  sources: { url: string; title: string | null; kind: string }[];
  laws: { note_ja: string | null; note_en: string | null; source_url: string | null; sort_order: number; law: LawRef }[];
};

export type LawRef = {
  slug: string;
  kind: "law" | "system" | "ordinance";
  name_ja: string;
  name_en: string | null;
  short_ja: string | null;
  short_en: string | null;
  jurisdiction_ja: string;
  jurisdiction_en: string | null;
};

const PROJECT_SELECT = `
  id, slug, parent_id, name_ja, name_en, use_category, prefecture, municipality, completed_year, site_area_m2,
  summary_ja, summary_en, summary_en_status,
  credits:project_credits(role, sort_order, party:parties(slug, name_ja, name_en)),
  plantings:project_plantings(layer, species:species(slug, name_ja, name_en, scientific_name, growth_form)),
  components:project_components(product_name, maker_name, category:component_categories(kind, slug, name_ja, name_en)),
  photos(storage_path, is_cover, sort_order, caption_ja, caption_en,
    points:photo_points(x, y, note_ja, note_en, created_at, species:species(slug, name_ja, name_en, scientific_name), category:component_categories(kind, slug, name_ja, name_en))),
  awards:project_awards(award_name, award_year),
  sources(url, title, kind),
  laws:project_laws(note_ja, note_en, source_url, sort_order, law:laws(slug, kind, name_ja, name_en, short_ja, short_en, jurisdiction_ja, jurisdiction_en))
`;

export async function getProjects(): Promise<Project[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("projects");
  const db = supabase();
  const [{ data, error }, { data: points, error: pointsError }] = await Promise.all([
    db.from("projects").select(PROJECT_SELECT).order("published_at", { ascending: false }),
    db.from("project_points").select("id, lat, lng"),
  ]);
  if (error) throw error;
  if (pointsError) throw pointsError;
  const byId = new Map((points ?? []).map((p) => [p.id as string, p]));
  return (data as unknown as Omit<Project, "lat" | "lng">[]).map((p) => ({
    ...p,
    credits: [...p.credits].sort((a, b) => a.sort_order - b.sort_order),
    photos: [...p.photos].sort((a, b) => a.sort_order - b.sort_order),
    laws: [...p.laws].sort((a, b) => a.sort_order - b.sort_order),
    lat: byId.get(p.id)?.lat ?? null,
    lng: byId.get(p.id)?.lng ?? null,
  }));
}

export async function getProject(slug: string) {
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);
  if (!project) return null;
  return {
    project,
    parent: projects.find((p) => p.id === project.parent_id) ?? null,
    children: projects.filter((p) => p.parent_id === project.id),
  };
}

export type Species = SpeciesRef & {
  family_ja: string | null;
  family_scientific: string | null;
  growth_form: string | null;
  evergreen: boolean | null;
  aliases: string[];
};

export async function getSpeciesList(): Promise<Species[]> {
  "use cache";
  cacheLife("days");
  cacheTag("species");
  const { data, error } = await supabase()
    .from("species")
    .select("slug, name_ja, name_en, scientific_name, family_ja, family_scientific, growth_form, evergreen, aliases:species_aliases(alias)");
  if (error) throw error;
  return (data as unknown as (Omit<Species, "aliases"> & { aliases: { alias: string }[] })[])
    .map((s) => ({ ...s, aliases: s.aliases.map((a) => a.alias) }))
    .sort((a, b) => a.name_ja.localeCompare(b.name_ja, "ja"));
}

export async function getDesigners() {
  const projects = await getProjects();
  const byParty = new Map<string, { party: PartyRef; projects: Project[] }>();
  for (const p of projects) {
    for (const c of p.credits) {
      const entry = byParty.get(c.party.slug) ?? { party: c.party, projects: [] };
      if (!entry.projects.includes(p)) entry.projects.push(p);
      byParty.set(c.party.slug, entry);
    }
  }
  return [...byParty.values()].sort((a, b) => b.projects.length - a.projects.length || a.party.name_ja.localeCompare(b.party.name_ja, "ja"));
}

export type Law = LawRef & {
  summary_ja: string | null;
  summary_en: string | null;
  official_url: string | null;
  sort_order: number;
  basis: { slug: string; name_ja: string; name_en: string | null } | null;
};

// 法令マスタ（法律→制度→条例の順）
export async function getLaws(): Promise<Law[]> {
  "use cache";
  cacheLife("days");
  cacheTag("laws");
  const { data, error } = await supabase()
    .from("laws")
    .select("slug, kind, name_ja, name_en, short_ja, short_en, jurisdiction_ja, jurisdiction_en, summary_ja, summary_en, official_url, sort_order, basis:basis_id(slug, name_ja, name_en)")
    .order("sort_order");
  if (error) throw error;
  return data as unknown as Law[];
}

export function photoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${path}`;
}

export function coverPhoto(p: Project) {
  const photo = p.photos.find((ph) => ph.is_cover) ?? p.photos[0];
  return photo ? photoUrl(photo.storage_path) : null;
}
