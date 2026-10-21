import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { HomeBrowser, HomeBrowserFromUrl } from "@/components/browse/Browser";
import { getBrowseItems, getLawOptions } from "@/lib/browse-data";
import { fmt, getDictionary, hasLocale } from "@/lib/i18n";
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
  const hero = (
    <div className="bg-ink pb-16 pt-10 text-white">
      <div className="wrap grid gap-2">
        <span className="eyebrow !text-white/60">PROJECT</span>
        <h1 className="text-[clamp(30px,4vw,48px)] font-extrabold tracking-[-0.02em]">{dict.groups.project.list}</h1>
        <p className="text-sm text-white/70">{fmt(t.count, items.length)}</p>
      </div>
    </div>
  );
  const props = { lang, items, lawOptions, t, years: yearRange(items), hero, title: lang === "en" ? "All projects" : "すべての事例", limit: 60 };
  return (
    <Suspense fallback={<HomeBrowser {...props} />}>
      <HomeBrowserFromUrl {...props} />
    </Suspense>
  );
}
