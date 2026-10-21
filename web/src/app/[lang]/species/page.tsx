import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PhotoHero } from "@/components/browse/ProjectHero";
import { SpeciesBrowser, type SpeciesItem } from "@/components/species/SpeciesBrowser";
import { getProjects, getSpeciesList, photoUrl } from "@/lib/data";
import { fmt, getDictionary, hasLocale, localName } from "@/lib/i18n";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/species">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).species.title, alternates: alternates(lang, "/species") } : {};
}

const FORMS = ["tree", "shrub", "ground_cover", "climber", "grass", "fern", "bamboo", "aquatic", "other"];

// PROJECT ＞ 樹種から探す
export default async function SpeciesIndex({ params }: PageProps<"/[lang]/species">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.speciesPage;
  const [species, projects] = await Promise.all([getSpeciesList(), getProjects()]);
  const usage = new Map<string, number>();
  for (const p of projects) for (const pl of p.plantings) usage.set(pl.species.slug, (usage.get(pl.species.slug) ?? 0) + 1);

  const sorted = lang === "en" ? [...species].sort((a, b) => (a.name_en ?? a.scientific_name).localeCompare(b.name_en ?? b.scientific_name, "en")) : species;
  const list: SpeciesItem[] = sorted
    .map((s) => ({
      slug: s.slug,
      name: localName(lang, s.name_ja, s.name_en),
      scientific: s.scientific_name,
      family: lang === "en" ? s.family_scientific : s.family_ja,
      form: s.growth_form ?? "other",
      evergreen: s.evergreen,
      photo: s.photo_path ? photoUrl(s.photo_path) : null,
      used: usage.get(s.slug) ?? 0,
      keywords: [s.name_ja, s.name_en, s.scientific_name, s.family_ja, s.family_scientific, ...s.aliases].filter(Boolean).join(" ").toLowerCase(),
    }))
    // 事例で使われている樹種を先に
    .sort((a, b) => Number(b.used > 0) - Number(a.used > 0));
  const forms = FORMS.filter((f) => list.some((s) => s.form === f));

  // 上部の画像は樹種の写真から（写真が入るまでは画像なし）
  const slides = list.flatMap((s) => (s.photo ? [{ href: `/${lang}/species/${s.slug}`, name: s.name, caption: s.scientific, img: s.photo }] : []));

  return (
    <>
      <PhotoHero slides={slides} t={dict.browse} eyebrow={fmt(t.eyebrow, species.length)} title={dict.groups.project.species} lead={t.lead} />
      <div className="wrap pt-10">
        <SpeciesBrowser
          lang={lang}
          species={list}
          forms={forms}
          t={{ ...t, evergreen: dict.species.evergreen, deciduous: dict.species.deciduous, usedCount: lang === "en" ? "{n} projects" : "{n}件の事例" }}
        />
      </div>
    </>
  );
}
