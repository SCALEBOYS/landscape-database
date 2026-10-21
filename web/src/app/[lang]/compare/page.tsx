import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { cardImage } from "@/components/ProjectCard";
import { coverPhoto, getProjects } from "@/lib/data";
import { categoryLabels, getDictionary, hasLocale, label, localName } from "@/lib/i18n";
import { alternates } from "@/lib/site";
import { place } from "@/lib/view";

import { CompareView, type CompareProject } from "./CompareView";

export async function generateMetadata({ params }: PageProps<"/[lang]/compare">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).groups.project.compare, alternates: alternates(lang, "/compare") } : {};
}

// PROJECT ＞ 事例を比較する。最大3件を同じ項目で横に並べる
export default async function ComparePage({ params, searchParams }: PageProps<"/[lang]/compare">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const projects = await getProjects();
  const all: CompareProject[] = projects.map((p) => ({
    slug: p.slug,
    name: localName(lang, p.name_ja, p.name_en),
    img: cardImage({ cover: coverPhoto(p), lat: p.lat, lng: p.lng }),
    use: label(categoryLabels, p.use_category, lang),
    place: place(p, lang),
    year: p.completed_year,
    area: p.site_area_m2 ? Number(p.site_area_m2) : null,
    designers: [...new Set(p.credits.map((c) => localName(lang, c.party.name_ja, c.party.name_en)))],
    awards: p.awards.map((a) => [a.award_name, a.award_year].filter(Boolean).join(" ")),
    species: [...new Set(p.plantings.map((pl) => localName(lang, pl.species.name_ja, pl.species.name_en)))],
    materials: [...new Set(p.components.map((c) => localName(lang, c.category.name_ja, c.category.name_en)))],
    laws: p.laws.map(({ law }) => localName(lang, law.name_ja, law.name_en)),
    photos: p.photos.length,
    models: p.models.length,
  }));

  return (
    <div className="wrap pt-10">
      <span className="eyebrow">PROJECT</span>
      <h1 className="mt-1 text-[clamp(30px,4vw,44px)] font-extrabold tracking-[-0.02em]">{dict.groups.project.compare}</h1>
      <p className="mt-3 max-w-[60ch] text-sm leading-[1.8] text-muted">{dict.compare.lead}</p>
      <Suspense>
        <Compare lang={lang} all={all} searchParams={searchParams} t={dict.compare} />
      </Suspense>
    </div>
  );
}

// URL の ?p=a,b,c は、ページを開いたときにだけ読む（ページの残りは事前に作っておける）
async function Compare({ lang, all, searchParams, t }: { lang: string; all: CompareProject[]; searchParams: Promise<Record<string, string | string[] | undefined>>; t: Parameters<typeof CompareView>[0]["t"] }) {
  const sp = await searchParams;
  const initial = String(Array.isArray(sp.p) ? sp.p[0] : sp.p ?? "").split(",").filter((s) => all.some((p) => p.slug === s)).slice(0, 3);
  return <CompareView lang={lang} all={all} initial={initial} t={t} />;
}
