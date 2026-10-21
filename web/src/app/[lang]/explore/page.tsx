import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Explore, ExploreFromUrl } from "@/components/browse/Browser";
import { getBrowseItems, getLawOptions } from "@/lib/browse-data";
import { getDictionary, hasLocale } from "@/lib/i18n";
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
  const props = { lang, items, lawOptions, t: getDictionary(lang).browse, years: yearRange(items) };
  return (
    <Suspense fallback={<Explore {...props} />}>
      <ExploreFromUrl {...props} />
    </Suspense>
  );
}
