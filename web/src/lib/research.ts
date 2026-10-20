import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { supabase } from "./data";

export type ReviewStatus = "draft" | "reviewed";
export type Method = {
  slug: string;
  name_ja: string;
  name_en: string;
  summary_ja: string;
  summary_en: string | null;
  body_ja: string | null;
  body_en: string | null;
  sort_order: number;
  review_status: ReviewStatus;
};
type Named = { slug: string; name_ja: string; name_en: string | null };
export type Paper = {
  slug: string;
  kind: "article" | "report" | "book";
  title: string;
  title_ja: string | null;
  authors: string;
  year: number;
  venue: string;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  language: "ja" | "en" | "other";
  summary_ja: string;
  summary_en: string | null;
  review_status: ReviewStatus;
  methods: { method: { slug: string } }[];
  projects: { note_ja: string | null; project: Named }[];
  species: { species: Named & { scientific_name: string } }[];
  categories: { category: Named & { kind: string } }[];
};

// 研究の手法と論文（論文は新しい順）
export async function getResearch(): Promise<{ methods: Method[]; papers: Paper[] }> {
  "use cache";
  cacheLife("days");
  cacheTag("research");
  const db = supabase();
  const [m, p] = await Promise.all([
    db.from("methods").select("slug, name_ja, name_en, summary_ja, summary_en, body_ja, body_en, sort_order, review_status").order("sort_order"),
    db
      .from("papers")
      .select(
        `slug, kind, title, title_ja, authors, year, venue, volume, issue, pages, doi, url, language, summary_ja, summary_en, review_status,
         methods:paper_methods(method:methods(slug)),
         projects:paper_projects(note_ja, project:projects(slug, name_ja, name_en)),
         species:paper_species(species:species(slug, name_ja, name_en, scientific_name)),
         categories:paper_categories(category:component_categories(kind, slug, name_ja, name_en))`,
      )
      .order("year", { ascending: false }),
  ]);
  if (m.error) throw m.error;
  if (p.error) throw p.error;
  // 非公開の事例は RLS で null になるので外す
  const papers = (p.data as unknown as Paper[]).map((x) => ({ ...x, projects: x.projects.filter((r) => r.project) }));
  return { methods: m.data as Method[], papers };
}

export const paperLink = (p: Paper) => (p.doi ? `https://doi.org/${p.doi}` : p.url);

// 書誌（掲載誌 巻(号), ページ）
export function citation(p: Paper) {
  const vol = p.volume ? ` ${p.volume}${p.issue ? `(${p.issue})` : ""}` : "";
  return `${p.venue}${vol}${p.pages ? `, ${p.pages}` : ""}`;
}
