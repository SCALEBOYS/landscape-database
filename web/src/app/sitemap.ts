import type { MetadataRoute } from "next";

import { getDesigners, getLaws, getProjects, getSpeciesList } from "@/lib/data";
import { locales } from "@/lib/i18n";
import { getResearch } from "@/lib/research";
import { SITE_URL } from "@/lib/site";

// 公開ページの一覧（日本語・英語の両方）
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, species, designers, laws, research] = await Promise.all([getProjects(), getSpeciesList(), getDesigners(), getLaws(), getResearch()]);
  const paths = [
    "",
    "/explore",
    "/species",
    "/designers",
    "/laws",
    "/research",
    "/graph",
    ...projects.map((p) => `/projects/${p.slug}`),
    ...species.map((s) => `/species/${s.slug}`),
    ...designers.map((d) => `/designers/${d.party.slug}`),
    ...laws.map((l) => `/laws/${l.slug}`),
    ...research.methods.map((m) => `/research/methods/${m.slug}`),
    ...research.papers.map((p) => `/research/papers/${p.slug}`),
  ];
  return paths.map((path) => ({
    url: `${SITE_URL}/ja${path}`,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
  }));
}
