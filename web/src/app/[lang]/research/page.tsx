import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DraftBadge, PaperRow } from "@/components/research/ResearchParts";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getResearch } from "@/lib/research";

export async function generateMetadata({ params }: PageProps<"/[lang]/research">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).research.title } : {};
}

export default async function ResearchIndex({ params }: PageProps<"/[lang]/research">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).research;
  const { methods, papers } = await getResearch();
  const count = (slug: string) => papers.filter((p) => p.methods.some((m) => m.method.slug === slug)).length;

  return (
    <div className="wrap pt-10">
      <h1 className="text-[34px] font-extrabold tracking-[-0.02em]">{t.title}</h1>
      <p className="mt-3 max-w-[60ch] text-sm leading-[1.8] text-muted">{t.lead}</p>

      <section className="mt-10">
        <h2 className="mb-4 border-b border-ink pb-2 text-lg font-medium">{t.methods}</h2>
        <ul className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((m) => (
            <li key={m.slug} className="bg-white">
              <Link href={`/${lang}/research/methods/${m.slug}`} className="grid h-full content-start gap-2 p-5 hover:bg-soft">
                <span className="font-medium leading-snug">{lang === "en" ? m.name_en : m.name_ja}</span>
                <span className="line-clamp-3 text-[13px] leading-[1.7] text-muted">{lang === "en" ? m.summary_en ?? m.summary_ja : m.summary_ja}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {t.paperCount(count(m.slug))}
                  {m.review_status === "draft" && <DraftBadge t={t} />}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="border-b border-ink pb-2 text-lg font-medium">{t.papers}</h2>
        {papers.length ? (
          <ul className="divide-y divide-line">
            {papers.map((p) => <PaperRow key={p.slug} lang={lang} paper={p} methods={methods} t={t} />)}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">{t.none}</p>
        )}
      </section>
    </div>
  );
}
