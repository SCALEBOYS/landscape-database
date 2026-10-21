import "server-only";

import { getLaws, getMaterials, getProjects, getSpeciesList } from "./data";
import { categoryLabels, type Locale } from "./i18n";
import { getResearch } from "./research";

// 質問窓口に渡す、サイトに載っている情報の一覧。ページへのリンクを付ける
export async function siteKnowledge(lang: Locale) {
  const [projects, species, laws, materials, { methods, papers }] = await Promise.all([getProjects(), getSpeciesList(), getLaws(), getMaterials(), getResearch()]);
  const L = `/${lang}`;
  const line = (parts: (string | number | null | undefined | false)[]) => parts.filter(Boolean).join(" / ");

  const projectLines = projects.map((p) =>
    line([
      `[${p.name_ja}${p.name_en ? ` (${p.name_en})` : ""}](${L}/projects/${p.slug})`,
      categoryLabels[p.use_category]?.ja,
      `${p.prefecture}${p.municipality ?? ""}`,
      p.completed_year ? `竣工${p.completed_year}` : "竣工年未登録",
      p.site_area_m2 ? `${p.site_area_m2}㎡` : null,
      p.credits.length && `設計: ${p.credits.map((c) => `${c.party.name_ja}(${L}/designers/${c.party.slug})`).join("、")}`,
      p.awards.length && `受賞: ${p.awards.map((a) => `${a.award_name}${a.award_year ? ` ${a.award_year}` : ""}`).join("、")}`,
      p.plantings.length && `樹種: ${[...new Set(p.plantings.map((pl) => pl.species.name_ja))].join("、")}`,
      p.components.length && `素材: ${[...new Set(p.components.map((c) => c.category.name_ja))].join("、")}`,
      p.laws.length && `法令: ${p.laws.map((x) => x.law.short_ja ?? x.law.name_ja).join("、")}`,
      p.summary_ja && `概要: ${p.summary_ja}`,
    ]),
  );
  const usage = new Map<string, number>();
  for (const p of projects) for (const pl of p.plantings) usage.set(pl.species.slug, (usage.get(pl.species.slug) ?? 0) + 1);
  const speciesLines = species.map((s) => line([`[${s.name_ja}](${L}/species/${s.slug})`, s.scientific_name, s.family_ja, s.evergreen === null ? null : s.evergreen ? "常緑" : "落葉", usage.get(s.slug) ? `${usage.get(s.slug)}件の事例` : null]));
  const lawLines = laws.map((x) => line([`[${x.name_ja}](${L}/laws/${x.slug})`, x.jurisdiction_ja, x.summary_ja]));
  const materialLines = materials.map((m) => line([`${m.name_ja}`, m.projects.length ? `事例: ${m.projects.map((p) => p.name_ja).join("、")}` : "事例なし"]));
  const methodLines = methods.map((m) => line([`[${m.name_ja}](${L}/research/methods/${m.slug})`, m.summary_ja, m.review_status === "draft" ? "確認前の下書き" : null]));
  const paperLines = papers.map((p) =>
    line([`[${p.title_ja ?? p.title}](${L}/research/papers/${p.slug})`, `${p.authors} ${p.year}`, p.venue, p.summary_ja, p.review_status === "draft" ? "確認前の下書き" : null]),
  );

  return [
    `## 事例（${projects.length}件）`, ...projectLines,
    `## 樹種（${species.length}種）`, ...speciesLines,
    `## 素材の分類`, ...materialLines,
    `## 法令・制度`, ...lawLines,
    `## 研究の手法`, ...methodLines,
    `## 論文`, ...paperLines,
  ].join("\n");
}
