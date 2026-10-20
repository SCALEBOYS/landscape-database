import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";
import { Body, DraftBadge, PaperRow } from "@/components/research/ResearchParts";
import { fieldOf } from "@/lib/research-fields";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import { getResearch } from "@/lib/research";

export async function generateStaticParams() {
  const { methods } = await getResearch();
  return locales.flatMap((lang) => methods.map((m) => ({ lang, slug: m.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/research/methods/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const m = (await getResearch()).methods.find((x) => x.slug === slug);
  return m && hasLocale(lang) ? { title: lang === "en" ? m.name_en : m.name_ja } : {};
}

export default async function MethodPage({ params }: PageProps<"/[lang]/research/methods/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const { methods, papers } = await getResearch();
  const m = methods.find((x) => x.slug === slug);
  if (!m) notFound();
  const dict = getDictionary(lang);
  const t = dict.research;
  const using = papers.filter((p) => p.methods.some((x) => x.method.slug === slug));
  const body = lang === "en" ? m.body_en : m.body_ja;
  const fd = fieldOf(m.field);

  return (
    <div className="wrap pt-10">
      <nav className="flex gap-2 text-xs text-muted">
        <Link href={`/${lang}/research`} className="hover:text-ink hover:underline">{t.title}</Link>
        <span>/</span>
        <Link href={`/${lang}/research?field=${fd.key}`} className="hover:text-ink hover:underline">{lang === "en" ? fd.en : fd.ja}</Link>
      </nav>
      <div className="mt-4 flex items-center gap-4">
        <span className="grid h-14 w-14 flex-none place-items-center rounded-full" style={{ background: `${fd.color}1a`, color: fd.color }}>
          <Icon name={`field-${fd.key}`} className="ico !h-7 !w-7" />
        </span>
        <div className="min-w-0">
          <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold leading-tight tracking-[-0.03em]">{lang === "en" ? m.name_en : m.name_ja}</h1>
          {lang === "ja" && <p className="mt-0.5 text-sm text-muted">{m.name_en}</p>}
        </div>
      </div>
      <div className="mt-5 h-1 w-24" style={{ background: fd.color }} />
      {m.review_status === "draft" && (
        <p className="mt-4 flex max-w-[44em] items-start gap-2 text-xs leading-relaxed text-muted"><DraftBadge t={t} />{t.draftNote}</p>
      )}
      <div className="grid gap-12 pt-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 max-w-[40em]">
          <p className="text-lg leading-[1.8]">{lang === "en" ? m.summary_en ?? m.summary_ja : m.summary_ja}</p>
          {body ? (
            <div className="mt-8"><Body text={body} /></div>
          ) : (
            lang === "en" && m.body_ja && <p className="mt-6 text-sm text-muted">{dict.englishPending}</p>
          )}
        </div>
        <aside>
          <h2 className="border-b border-ink pb-2 text-sm font-medium">{t.usesMethod}</h2>
          {using.length ? (
            <ul className="divide-y divide-line">
              {using.map((p) => <PaperRow key={p.slug} lang={lang} paper={p} methods={methods} t={t} />)}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">{t.none}</p>
          )}
        </aside>
      </div>
    </div>
  );
}
