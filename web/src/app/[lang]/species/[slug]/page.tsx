import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CardGrid } from "@/components/ProjectCard";
import { getProjects, getSpeciesList } from "@/lib/data";
import { getDictionary, growthFormLabels, hasLocale, label, layerLabels, localName, locales } from "@/lib/i18n";
import { toCard } from "@/lib/view";

export async function generateStaticParams() {
  const species = await getSpeciesList();
  return locales.flatMap((lang) => species.map((s) => ({ lang, slug: s.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/species/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const s = (await getSpeciesList()).find((x) => x.slug === slug);
  return s && hasLocale(lang) ? { title: `${localName(lang, s.name_ja, s.name_en)} (${s.scientific_name})` } : {};
}

export default async function SpeciesPage({ params }: PageProps<"/[lang]/species/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [species, projects] = await Promise.all([getSpeciesList(), getProjects()]);
  const s = species.find((x) => x.slug === slug);
  if (!s) notFound();
  const t = getDictionary(lang);

  const used = projects.flatMap((p) => {
    const layers = [...new Set(p.plantings.filter((pl) => pl.species.slug === slug).map((pl) => label(layerLabels, pl.layer, lang)))];
    return layers.length ? [toCard(p, lang, layers.join(" / "))] : [];
  });

  const title = lang === "en" ? s.name_en ?? s.scientific_name : s.name_ja;
  const sub = lang === "en" ? s.name_ja : s.name_en;

  return (
    <div className="wrap pt-10">
      <h1 className="text-[40px] font-extrabold leading-tight tracking-[-0.03em]">{title}</h1>
      <p className="mt-1 text-lg italic text-muted">{s.scientific_name}</p>
      <dl className="mt-6 grid max-w-xl grid-cols-[8rem_1fr] gap-y-2 text-sm">
        {sub && (
          <>
            <dt className="text-muted">{lang === "en" ? "Japanese" : "English"}</dt>
            <dd>{sub}</dd>
          </>
        )}
        {s.family_ja && (
          <>
            <dt className="text-muted">{t.species.family}</dt>
            <dd>{lang === "en" ? s.family_scientific ?? s.family_ja : s.family_ja}</dd>
          </>
        )}
        {s.growth_form && (
          <>
            <dt className="text-muted">{t.species.form}</dt>
            <dd>
              {label(growthFormLabels, s.growth_form, lang)}
              {s.evergreen !== null && ` · ${s.evergreen ? t.species.evergreen : t.species.deciduous}`}
            </dd>
          </>
        )}
        {s.aliases.length > 0 && (
          <>
            <dt className="text-muted">{t.species.aliases}</dt>
            <dd>{s.aliases.join("、")}</dd>
          </>
        )}
      </dl>

      <section className="mt-12">
        <h2 className="mb-6 border-b border-line pb-2 text-lg font-medium">{t.species.usedIn}</h2>
        {used.length ? <CardGrid lang={lang} cards={used} /> : <p className="text-sm text-muted">{t.species.noProjects}</p>}
      </section>
    </div>
  );
}
