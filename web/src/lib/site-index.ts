import "server-only";

import { coverPhoto, getDesigners, getLaws, getMaterials, getProjects, getSpeciesList, photoUrl } from "./data";
import { categoryLabels, type Locale } from "./i18n";
import { getPosts, postTitle } from "./posts";
import { getResearch } from "./research";
import type { Entry } from "./site-search";

export type { Entry } from "./site-search";

const join = (parts: (string | number | null | undefined | false)[], sep = " / ") => parts.filter(Boolean).join(sep);

// 事例・樹種・素材・設計・法令・研究・NEWS をひとつの一覧にする
export async function siteIndex(lang: Locale): Promise<Entry[]> {
  const [projects, species, materials, designers, laws, { methods, papers }, posts] = await Promise.all([
    getProjects(),
    getSpeciesList(),
    getMaterials(),
    getDesigners(),
    getLaws(),
    getResearch(),
    getPosts(),
  ]);
  const L = `/${lang}`;
  const en = lang === "en";
  const name = (ja: string, e: string | null | undefined) => (en ? e || ja : ja);
  const out: Entry[] = [];

  for (const p of projects) {
    const uses = [p.use_category, ...(p.other_uses ?? [])].map((u) => categoryLabels[u]?.[lang]).filter(Boolean);
    out.push({
      id: `project:${p.slug}`,
      kind: "project",
      title: name(p.name_ja, p.name_en),
      sub: join([uses.join("・"), `${p.prefecture}${p.municipality ?? ""}`, p.completed_year], " · "),
      href: `${L}/projects/${p.slug}`,
      image: coverPhoto(p),
      text: join([
        p.name_ja,
        p.name_en,
        uses.join("・"),
        [p.use_category, ...(p.other_uses ?? [])].map((u) => categoryLabels[u]?.ja).join("・"),
        `${p.prefecture}${p.municipality ?? ""}`,
        p.completed_year && `竣工${p.completed_year}`,
        p.credits.map((c) => c.party.name_ja).join("、"),
        p.awards.map((a) => a.award_name).join("、"),
        [...new Set(p.plantings.map((pl) => pl.species.name_ja))].join("、"),
        [...new Set(p.components.map((c) => c.category.name_ja))].join("、"),
        p.laws.map((x) => x.law.short_ja ?? x.law.name_ja).join("、"),
        p.summary_ja,
      ]),
    });
  }

  const used = new Map<string, number>();
  for (const p of projects) for (const s of new Set(p.plantings.map((pl) => pl.species.slug))) used.set(s, (used.get(s) ?? 0) + 1);
  for (const s of species) {
    const n = used.get(s.slug) ?? 0;
    out.push({
      id: `species:${s.slug}`,
      kind: "species",
      title: name(s.name_ja, s.name_en),
      sub: join([s.scientific_name, en ? null : s.family_ja, n ? (en ? `${n} projects` : `${n}件の事例`) : null], " · "),
      href: `${L}/species/${s.slug}`,
      image: s.photo_path ? photoUrl(s.photo_path) : null,
      text: join([s.name_ja, s.name_en, s.scientific_name, s.family_ja, s.aliases.join("、"), s.evergreen === null ? null : s.evergreen ? "常緑" : "落葉", s.growth_form]),
    });
  }

  for (const m of materials) {
    out.push({
      id: `material:${m.slug}`,
      kind: "material",
      title: name(m.name_ja, m.name_en),
      sub: m.projects.length ? (en ? `${m.projects.length} projects` : `${m.projects.length}件の事例`) : "",
      href: `${L}/materials#${m.slug}`,
      image: m.photo,
      text: join([m.name_ja, m.name_en, m.kind, m.colors.join("・"), m.textures.join("・"), m.projects.map((p) => p.name_ja).join("、")]),
    });
  }

  for (const d of designers) {
    out.push({
      id: `designer:${d.party.slug}`,
      kind: "designer",
      title: name(d.party.name_ja, d.party.name_en),
      sub: en ? `${d.projects.length} projects` : `${d.projects.length}件の事例`,
      href: `${L}/designers/${d.party.slug}`,
      image: d.projects.map((p) => coverPhoto(p)).find(Boolean) ?? null,
      text: join([d.party.name_ja, d.party.name_en, (d.party.aliases ?? []).map((a) => a.alias).join("、"), d.projects.map((p) => p.name_ja).join("、")]),
    });
  }

  for (const x of laws) {
    out.push({
      id: `law:${x.slug}`,
      kind: "law",
      title: name(x.name_ja, x.name_en),
      sub: (en ? x.jurisdiction_en : x.jurisdiction_ja) ?? "",
      href: `${L}/laws/${x.slug}`,
      image: null,
      text: join([x.name_ja, x.name_en, x.short_ja, x.jurisdiction_ja, x.summary_ja]),
    });
  }

  for (const m of methods) {
    out.push({
      id: `method:${m.slug}`,
      kind: "method",
      title: name(m.name_ja, m.name_en),
      sub: (en ? m.summary_en : m.summary_ja)?.slice(0, 60) ?? "",
      href: `${L}/research/methods/${m.slug}`,
      image: null,
      text: join([m.name_ja, m.name_en, m.summary_ja]),
    });
  }

  for (const p of papers) {
    out.push({
      id: `paper:${p.slug}`,
      kind: "paper",
      title: en ? p.title : p.title_ja ?? p.title,
      sub: join([p.authors, p.year, p.venue], " · "),
      href: `${L}/research/papers/${p.slug}`,
      image: null,
      text: join([p.title, p.title_ja, p.authors, p.year, p.venue, p.summary_ja, p.projects.map((x) => x.project.name_ja).join("、"), p.species.map((x) => x.species.name_ja).join("、")]),
    });
  }

  for (const p of posts) {
    out.push({
      id: `news:${p.slug}`,
      kind: "news",
      title: postTitle(p, lang),
      sub: p.published_at.slice(0, 10),
      href: `${L}/news/${p.slug}`,
      image: p.cover,
      text: join([p.title_ja, p.title_en, p.summary_ja, p.project?.name_ja]),
    });
  }
  return out;
}
