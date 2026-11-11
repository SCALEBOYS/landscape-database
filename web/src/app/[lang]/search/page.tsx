import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SiteSearch } from "@/components/search/SiteSearch";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { siteIndex } from "@/lib/site-index";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/search">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).siteSearch.title, alternates: alternates(lang, "/search") } : {};
}

// HOME ＞ サイト内検索。事例・樹種・素材・設計・法令・研究・NEWS をまとめて探す。文章の意味が近いページを探すこともできる（ベクトル検索）
export default async function SearchPage({ params }: PageProps<"/[lang]/search">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).siteSearch;
  const entries = (await siteIndex(lang)).map((e) => ({ ...e, text: e.text.slice(0, 600) }));
  return (
    <div className="wrap max-w-[960px] pt-10 pb-16">
      <span className="eyebrow">HOME · SEARCH</span>
      <h1 className="mt-1 text-[clamp(30px,4vw,44px)] font-extrabold tracking-[-0.02em]">{t.title}</h1>
      <p className="mb-7 mt-3 max-w-[62ch] text-sm leading-[1.8] text-muted">{t.lead}</p>
      <Suspense>
        <SiteSearch entries={entries} lang={lang} t={t} ai />
      </Suspense>
    </div>
  );
}
