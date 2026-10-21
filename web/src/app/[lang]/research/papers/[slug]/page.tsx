import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";
import { DraftBadge, paperTitle } from "@/components/research/ResearchParts";
import { getDictionary, hasLocale, localName, locales } from "@/lib/i18n";
import { citation, getResearch, paperLink } from "@/lib/research";
import { alternates, jsonLd } from "@/lib/site";

export async function generateStaticParams() {
  const { papers } = await getResearch();
  return locales.flatMap((lang) => papers.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/research/papers/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = (await getResearch()).papers.find((x) => x.slug === slug);
  return p && hasLocale(lang) ? { title: paperTitle(p, lang), alternates: alternates(lang, `/research/papers/${slug}`) } : {};
}

export default async function PaperPage({ params }: PageProps<"/[lang]/research/papers/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const { methods, papers } = await getResearch();
  const p = papers.find((x) => x.slug === slug);
  if (!p) notFound();
  const dict = getDictionary(lang);
  const t = dict.research;
  const title = paperTitle(p, lang);
  const ms = p.methods.map((x) => methods.find((m) => m.slug === x.method.slug)).filter((m) => !!m);
  const link = paperLink(p);
  const summary = lang === "en" ? p.summary_en ?? p.summary_ja : p.summary_ja;
  const chip = "rounded-sm border border-line px-3 py-1.5 text-[13px] hover:border-ink";

  // 論文の書誌（検索エンジン向け）
  const structured = {
    "@context": "https://schema.org",
    "@type": p.kind === "book" ? "Book" : p.kind === "report" ? "Report" : "ScholarlyArticle",
    name: p.title,
    author: p.authors.split(/[;；]/).map((a) => ({ "@type": "Person", name: a.trim() })),
    datePublished: String(p.year),
    ...(p.kind === "article" ? { isPartOf: { "@type": "Periodical", name: p.venue } } : { publisher: p.venue }),
    ...(link ? { sameAs: link } : {}),
    inLanguage: p.language,
  };

  return (
    <div className="wrap max-w-[860px] pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <nav className="flex gap-2 text-xs text-muted">
        <Link href={`/${lang}/research`} className="hover:text-ink hover:underline">{t.title}</Link>
        <span>/</span>
        <span>{t.kind[p.kind]}</span>
      </nav>
      <h1 className="mt-3 text-[clamp(24px,3.4vw,34px)] font-extrabold leading-snug tracking-[-0.02em]">{title}</h1>
      {title !== p.title && (
        <p className="mt-2 text-sm text-muted">
          {t.originalTitle}: <span lang={p.language === "ja" ? "ja" : "en"}>{p.title}</span>
        </p>
      )}
      <dl className="mt-5 grid grid-cols-[6rem_1fr] gap-y-1.5 text-sm">
        <dt className="text-muted">{t.authors}</dt>
        <dd>{p.authors}</dd>
        <dt className="text-muted">{t.published}</dt>
        <dd><span className="num">{p.year}</span> · {citation(p)}</dd>
        {p.doi && (
          <>
            <dt className="text-muted">DOI</dt>
            <dd className="break-all">{p.doi}</dd>
          </>
        )}
      </dl>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
          {t.original} <Icon name="arrow" className="ico !h-4 !w-4" />
        </a>
      )}

      <div className="mt-8 border-t border-ink pt-6">
        {p.review_status === "draft" && (
          <p className="mb-4 flex items-start gap-2 text-xs leading-relaxed text-muted"><DraftBadge t={t} />{t.draftNote}</p>
        )}
        <p className="text-lg leading-[1.85]">{summary}</p>
      </div>

      {ms.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-muted">{t.methods}</h2>
          <div className="flex flex-wrap gap-2">
            {ms.map((m) => (
              <Link key={m.slug} href={`/${lang}/research/methods/${m.slug}`} className={chip}>{lang === "en" ? m.name_en : m.name_ja}</Link>
            ))}
          </div>
        </section>
      )}
      {p.projects.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-muted">{t.relatedProjects}</h2>
          <ul className="grid gap-2">
            {p.projects.map(({ project, note_ja }) => (
              <li key={project.slug}>
                <Link href={`/${lang}/projects/${project.slug}`} className="underline decoration-line underline-offset-4 hover:decoration-ink">{localName(lang, project.name_ja, project.name_en)}</Link>
                {lang === "ja" && note_ja && <span className="ml-2 text-sm text-muted">{note_ja}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {p.species.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-muted">{t.relatedSpecies}</h2>
          <div className="flex flex-wrap gap-2">
            {p.species.map(({ species: s }) => (
              <Link key={s.slug} href={`/${lang}/species/${s.slug}`} className={chip}>{localName(lang, s.name_ja, s.name_en)}</Link>
            ))}
          </div>
        </section>
      )}
      {p.categories.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-muted">{t.relatedMaterials}</h2>
          <div className="flex flex-wrap gap-2">
            {p.categories.map(({ category: c }) =>
              c.kind === "paving" ? (
                <Link key={c.slug} href={`/${lang}/explore?paving=${c.slug}`} className={chip}>{localName(lang, c.name_ja, c.name_en)}</Link>
              ) : (
                <span key={c.slug} className="rounded-sm border border-line px-3 py-1.5 text-[13px]">{localName(lang, c.name_ja, c.name_en)}</span>
              ),
            )}
          </div>
        </section>
      )}
    </div>
  );
}
