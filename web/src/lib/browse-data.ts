import "server-only";

import type { BrowseItem } from "./browse";
import { elementsOf } from "./catalog";
import { coverPhoto, getProjects, getSpeciesList } from "./data";
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
      ...designers.flatMap((d) => [d.name_ja, d.name_en]),
      ...species.flatMap((s) => [s.name_ja, s.name_en, s.scientific_name, ...(aliasesBySlug.get(s.slug) ?? [])]),
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
      elements: elementsOf(p),
      species: species.map((s) => ({ slug: s.slug, label: localName(lang, s.name_ja, s.name_en), sub: s.scientific_name })),
      designers: designers.map((d) => ({ slug: d.slug, label: localName(lang, d.name_ja, d.name_en) })),
      paving: paving.map((c) => ({ slug: c.slug, label: localName(lang, c.name_ja, c.name_en) })),
      lat: p.lat,
      lng: p.lng,
      photo: coverPhoto(p),
      search: terms.filter(Boolean).join(" ").toLowerCase(),
    };
  });
}
