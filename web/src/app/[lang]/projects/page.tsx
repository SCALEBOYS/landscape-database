import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { HomeBrowser, HomeBrowserFromUrl } from "@/components/browse/Browser";
import { ProjectHero } from "@/components/browse/ProjectHero";
import { getBrowseItems, getLawOptions } from "@/lib/browse-data";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { alternates } from "@/lib/site";
import { yearRange } from "@/lib/years";

export async function generateMetadata({ params }: PageProps<"/[lang]/projects">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).groups.project.list, alternates: alternates(lang, "/projects") } : {};
}

// PROJECT ＞ 事例から探す。トップと同じ絞り込みで、すべての事例を一覧にする
export default async function ProjectsPage({ params }: PageProps<"/[lang]/projects">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.browse;
  const [items, lawOptions] = await Promise.all([getBrowseItems(lang), getLawOptions(lang)]);
  const hero = <ProjectHero lang={lang} items={items} t={t} title={dict.groups.project.list} />;
  const props = { lang, items, lawOptions, t, years: yearRange(items), hero, title: lang === "en" ? "All projects" : "すべての事例", limit: 60 };
  return (
    <Suspense fallback={<HomeBrowser {...props} />}>
      <HomeBrowserFromUrl {...props} />
    </Suspense>
  );
}
