import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ResearchBrowser, ResearchBrowserFromUrl, type BrowserMethod, type BrowserPaper } from "@/components/research/ResearchBrowser";
import { paperTitle } from "@/components/research/ResearchParts";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getResearch } from "@/lib/research";
import { FIELDS } from "@/lib/research-fields";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/research">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).research.title, alternates: alternates(lang, "/research") } : {};
}

export default async function ResearchIndex({ params }: PageProps<"/[lang]/research">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).research;
  const { methods, papers } = await getResearch();
  const name = (slug: string) => {
    const m = methods.find((x) => x.slug === slug);
    return m ? (lang === "en" ? m.name_en : m.name_ja) : "";
  };

  const bMethods: BrowserMethod[] = methods.map((m) => ({
    slug: m.slug,
    name: lang === "en" ? m.name_en : m.name_ja,
    summary: lang === "en" ? m.summary_en ?? m.summary_ja : m.summary_ja,
    field: m.field,
    draft: m.review_status === "draft",
  }));
  const bPapers: BrowserPaper[] = papers.map((p) => {
    const title = paperTitle(p, lang);
    const ms = p.methods.map((x) => x.method.slug);
    return {
      slug: p.slug,
      title,
      original: title !== p.title ? p.title : null,
      authors: p.authors,
      year: p.year,
      venue: p.venue,
      kind: p.kind,
      language: p.language,
      draft: p.review_status === "draft",
      methods: ms,
      text: [p.title, p.title_ja, p.authors, p.venue, p.summary_ja, p.summary_en, ...ms.map(name), ...ms.map((s) => methods.find((m) => m.slug === s)?.name_en ?? "")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  });
  const years = papers.map((p) => p.year);
  const labels = {
    search: t.search,
    fields: t.fieldsLabel,
    methods: t.methods,
    papers: t.papers,
    all: t.all,
    clear: t.clear,
    draft: t.draft,
    noMatch: t.noMatch,
    paperCount: t.paperCountTpl,
    kind: t.kind,
    langJa: t.langJa,
    langEn: t.langEn,
    timeline: t.timeline,
  };
  const props = { lang, methods: bMethods, papers: bPapers, t: labels };
  const stats: [string, string][] = [
    [String(methods.length), t.stats.methods],
    [String(papers.length), t.stats.papers],
    [String(FIELDS.length), t.stats.fields],
    [years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "—", t.stats.span],
  ];

  return (
    <>
      <div className="bg-ink text-white">
        <div className="wrap grid gap-6 pb-8 pt-12 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div className="grid gap-3">
            <span className="eyebrow !text-white/60">Research</span>
            <h1 className="text-[clamp(34px,5vw,56px)] font-extrabold leading-none tracking-[-0.02em]">{t.title}</h1>
            <p className="max-w-[52ch] text-sm leading-[1.8] text-white/75">{t.lead}</p>
          </div>
          <dl className="grid grid-cols-[1fr_1fr_1fr_1.6fr] gap-3">
            {stats.map(([v, k]) => (
              <div key={k} className="grid gap-1 border-l border-white/20 pl-3">
                <dd className="num order-1 whitespace-nowrap text-[clamp(18px,2.2vw,28px)] font-extrabold leading-none tracking-[-0.02em]">{v}</dd>
                <dt className="order-2 text-[11px] text-white/60">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="wrap pt-6">
        <Suspense fallback={<ResearchBrowser {...props} />}>
          <ResearchBrowserFromUrl {...props} />
        </Suspense>
      </div>
    </>
  );
}
