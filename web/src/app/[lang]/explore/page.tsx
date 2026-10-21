import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Explore, ExploreFromUrl } from "@/components/browse/Browser";
import { PhotoHero, projectSlides } from "@/components/browse/ProjectHero";
import { getBrowseItems, getLawOptions } from "@/lib/browse-data";
import { fmt, getDictionary, hasLocale } from "@/lib/i18n";
import { yearRange } from "@/lib/years";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/explore">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).browse.mapTitle, alternates: alternates(lang, "/explore") } : {};
}

export default async function ExplorePage({ params }: PageProps<"/[lang]/explore">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [items, lawOptions] = await Promise.all([getBrowseItems(lang), getLawOptions(lang)]);
  const dict = getDictionary(lang);
  const t = dict.browse;
  // 地図から探すの上部は航空写真（現地の写真がそろうまでの代わりにも使っているもの）
  const hero = <PhotoHero slides={projectSlides(lang, items, t, true)} t={t} eyebrow={fmt(t.heroEyebrow, items.length)} title={dict.groups.project.map} lead={t.mapLead} />;
  const props = { lang, items, lawOptions, t, years: yearRange(items), hero };
  return (
    <Suspense fallback={<Explore {...props} />}>
      <ExploreFromUrl {...props} />
    </Suspense>
  );
}
