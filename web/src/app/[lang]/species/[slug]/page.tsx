import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";
import { CardGrid } from "@/components/ProjectCard";
import { RememberRecent } from "@/components/RememberRecent";
import { PaperRow } from "@/components/research/ResearchParts";
import { getProjects, getSpeciesList, photoUrl } from "@/lib/data";
import { getResearch } from "@/lib/research";
import { getDictionary, growthFormLabels, hasLocale, label, layerLabels, localName, locales } from "@/lib/i18n";
import { toCard } from "@/lib/view";
import { alternates } from "@/lib/site";

export async function generateStaticParams() {
  const species = await getSpeciesList();
  return locales.flatMap((lang) => species.map((s) => ({ lang, slug: s.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/species/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const s = (await getSpeciesList()).find((x) => x.slug === slug);
  return s && hasLocale(lang) ? { title: `${localName(lang, s.name_ja, s.name_en)} (${s.scientific_name})`, alternates: alternates(lang, `/species/${slug}`) } : {};
}

export default async function SpeciesPage({ params }: PageProps<"/[lang]/species/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [species, projects, research] = await Promise.all([getSpeciesList(), getProjects(), getResearch()]);
  const papers = research.papers.filter((pa) => pa.species.some((x) => x.species.slug === slug));
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
      <RememberRecent kind="species" slug={slug} />
      {/* 名前の左に樹種の写真（正方形に切り抜く）。写真がまだなければ木のアイコン */}
      <div className="flex items-center gap-4 md:gap-5">
        <figure className="grid h-[76px] w-[76px] flex-none place-items-center overflow-hidden rounded-sm bg-placeholder text-muted md:h-[92px] md:w-[92px]">
          {s.photo_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl(s.photo_path)} alt={title} title={s.photo_credit ?? undefined} className="h-full w-full object-cover" />
          ) : (
            <Icon name="park" className="ico !h-8 !w-8 opacity-50" />
          )}
        </figure>
        <div className="min-w-0">
          <h1 className="text-[40px] font-extrabold leading-tight tracking-[-0.02em]">{title}</h1>
          <p className="mt-1 text-lg italic text-muted">{s.scientific_name}</p>
        </div>
      </div>
      {s.photo_path && s.photo_credit && <p className="mt-2 text-[11px] text-muted">{lang === "en" ? "Photo" : "写真"}: {s.photo_credit}</p>}
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
      {papers.length > 0 && (
        <section className="mt-12">
          <h2 className="border-b border-line pb-2 text-lg font-medium">{t.research.sectionSpecies}</h2>
          <ul className="divide-y divide-line">
            {papers.map((pa) => <PaperRow key={pa.slug} lang={lang} paper={pa} methods={research.methods} t={t.research} />)}
          </ul>
        </section>
      )}
    </div>
  );
}
