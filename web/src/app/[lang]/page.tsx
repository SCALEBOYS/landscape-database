import { notFound } from "next/navigation";

import { ProjectBrowser, type BrowserItem } from "@/components/ProjectBrowser";
import { getProjects, getSpeciesList } from "@/lib/data";
import { categoryLabels, getDictionary, hasLocale, label, localName, prefectureEn } from "@/lib/i18n";
import { toCard } from "@/lib/view";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const [projects, speciesList] = await Promise.all([getProjects(), getSpeciesList()]);
  const aliasesBySlug = new Map(speciesList.map((s) => [s.slug, s.aliases]));

  const items: BrowserItem[] = projects.map((p) => {
    const species = p.plantings.map((pl) => pl.species);
    const designers = p.credits.map((c) => c.party);
    const terms = [
      p.name_ja,
      p.name_en,
      ...designers.flatMap((d) => [d.name_ja, d.name_en]),
      ...species.flatMap((s) => [s.name_ja, s.name_en, s.scientific_name, ...(aliasesBySlug.get(s.slug) ?? [])]),
    ];
    return {
      card: toCard(p, lang),
      lat: p.lat,
      lng: p.lng,
      use: p.use_category,
      prefecture: p.prefecture,
      designers: designers.map((d) => d.slug),
      species: species.map((s) => s.slug),
      paving: p.components.filter((c) => c.category.kind === "paving").map((c) => c.category.slug),
      searchText: terms.filter(Boolean).join(" ").toLowerCase(),
    };
  });

  const uniq = <T,>(list: T[], key: (x: T) => string) => [...new Map(list.map((x) => [key(x), x])).values()];
  const sortLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, lang);
  const options = {
    use: uniq(projects.map((p) => p.use_category), (x) => x).map((v) => ({ value: v, label: label(categoryLabels, v, lang) })).sort(sortLabel),
    prefecture: uniq(projects.map((p) => p.prefecture), (x) => x).map((v) => ({ value: v, label: lang === "en" ? prefectureEn[v] ?? v : v })),
    species: uniq(projects.flatMap((p) => p.plantings.map((pl) => pl.species)), (s) => s.slug)
      .map((s) => ({ value: s.slug, label: localName(lang, s.name_ja, s.name_en) }))
      .sort(sortLabel),
    paving: uniq(projects.flatMap((p) => p.components.filter((c) => c.category.kind === "paving").map((c) => c.category)), (c) => c.slug)
      .map((c) => ({ value: c.slug, label: localName(lang, c.name_ja, c.name_en) }))
      .sort(sortLabel),
    designer: uniq(projects.flatMap((p) => p.credits.map((c) => c.party)), (d) => d.slug)
      .map((d) => ({ value: d.slug, label: localName(lang, d.name_ja, d.name_en) }))
      .sort(sortLabel),
  };

  return (
    <>
      <h1 className="mb-6 text-2xl font-light tracking-wide">{t.tagline}</h1>
      <ProjectBrowser
        lang={lang}
        items={items}
        options={options}
        labels={{
          grid: t.view.grid,
          map: t.view.map,
          keyword: t.filter.keyword,
          use: t.filter.use,
          prefecture: t.filter.prefecture,
          species: t.filter.species,
          paving: t.filter.paving,
          designer: t.filter.designer,
          all: t.filter.all,
          reset: t.filter.reset,
          more: t.filter.more,
          none: t.filter.none,
          countSuffix: lang === "ja" ? { one: "件", other: "件" } : { one: " project", other: " projects" },
        }}
      />
    </>
  );
}
