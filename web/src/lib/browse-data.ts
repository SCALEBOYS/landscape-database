import "server-only";

import type { BrowseItem, LawOption } from "./browse";
import { elementsOf } from "./catalog";
import { coverPhoto, getLaws, getProjects, getSpeciesList, type LawRef } from "./data";
import { categoryLabels, label, localName, prefectureEn, type Locale } from "./i18n";
import { place } from "./view";

export async function getBrowseItems(lang: Locale): Promise<BrowseItem[]> {
  const [projects, speciesList] = await Promise.all([getProjects(), getSpeciesList()]);
  const aliasesBySlug = new Map(speciesList.map((s) => [s.slug, s.aliases]));

  return projects.map((p) => {
    const species = [...new Map(p.plantings.map((pl) => [pl.species.slug, pl.species])).values()];
    const designers = [...new Map(p.credits.map((c) => [c.party.slug, c.party])).values()];
    const paving = [...new Map(p.components.filter((c) => c.category.kind === "paving").map((c) => [c.category.slug, c.category])).values()];
    const terms = [
      p.name_ja, p.name_en, p.prefecture, p.municipality,
      ...designers.flatMap((d) => [d.name_ja, d.name_en, ...(d.aliases ?? []).map((a) => a.alias)]),
      ...species.flatMap((s) => [s.name_ja, s.name_en, s.scientific_name, ...(aliasesBySlug.get(s.slug) ?? [])]),
      ...p.laws.flatMap(({ law }) => [law.name_ja, law.name_en, law.short_ja]),
    ];
    return {
      slug: p.slug,
      name: localName(lang, p.name_ja, p.name_en),
      place: place(p, lang),
      pref: p.prefecture,
      prefLabel: lang === "en" ? prefectureEn[p.prefecture] ?? p.prefecture : p.prefecture,
      muni: p.municipality ?? "",
      year: p.completed_year,
      use: p.use_category,
      useLabel: label(categoryLabels, p.use_category, lang),
      allUses: [p.use_category, ...(p.other_uses ?? []).filter((u) => u !== p.use_category)],
      elements: elementsOf(p),
      species: species.map((s) => ({ slug: s.slug, label: localName(lang, s.name_ja, s.name_en), sub: s.scientific_name })),
      designers: designers.map((d) => ({ slug: d.slug, label: localName(lang, d.name_ja, d.name_en) })),
      paving: paving.map((c) => ({ slug: c.slug, label: localName(lang, c.name_ja, c.name_en) })),
      laws: p.laws.map(({ law }) => ({ slug: law.slug, label: lawLabel(law, lang), sub: law.kind })),
      lat: p.lat,
      lng: p.lng,
      photo: coverPhoto(p),
      search: terms.filter(Boolean).join(" ").toLowerCase(),
    };
  });
}

// 探す画面のボタン用の短い名前（なければ正式名）
export const lawLabel = (law: LawRef, lang: Locale) =>
  lang === "en" ? law.short_en ?? law.name_en ?? law.name_ja : law.short_ja ?? law.name_ja;

export async function getLawOptions(lang: Locale): Promise<LawOption[]> {
  return (await getLaws()).map((law) => ({ slug: law.slug, label: lawLabel(law, lang), kind: law.kind }));
}
