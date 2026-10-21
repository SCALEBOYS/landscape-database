import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";
import { ProjectCard } from "@/components/ProjectCard";
import { getLaws, getProjects } from "@/lib/data";
import { getDictionary, hasLocale, localName, locales } from "@/lib/i18n";
import { toCard } from "@/lib/view";

export async function generateStaticParams() {
  const laws = await getLaws();
  return locales.flatMap((lang) => laws.map((l) => ({ lang, slug: l.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/laws/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const law = (await getLaws()).find((l) => l.slug === slug);
  return law && hasLocale(lang) ? { title: localName(lang, law.name_ja, law.name_en) } : {};
}

export default async function LawPage({ params }: PageProps<"/[lang]/laws/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const [laws, projects] = await Promise.all([getLaws(), getProjects()]);
  const law = laws.find((l) => l.slug === slug);
  if (!law) notFound();
  const t = getDictionary(lang).laws;
  const summary = lang === "en" ? law.summary_en : law.summary_ja;
  // この法令が関係する事例と、それぞれでどう使われたか
  const uses = projects.flatMap((p) => p.laws.filter((x) => x.law.slug === slug).map((x) => ({ project: p, note: lang === "en" ? x.note_en : x.note_ja })));
  const systems = laws.filter((l) => l.basis?.slug === slug);

  return (
    <div className="wrap pt-10">
      <nav className="flex gap-2 text-xs text-muted">
        <Link href={`/${lang}/laws`} className="hover:text-ink hover:underline">{t.title}</Link>
        <span>/</span>
        <span>{t.kinds[law.kind]}</span>
      </nav>
      <h1 className="mt-3 flex items-center gap-3 text-[40px] font-extrabold leading-tight tracking-[-0.02em]">
        <Icon name={`law-${law.kind}`} className="ico !h-8 !w-8" />
        {localName(lang, law.name_ja, law.name_en)}
      </h1>
      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <div className="flex gap-2"><dt className="text-muted">{t.jurisdiction}</dt><dd>{lang === "en" ? law.jurisdiction_en ?? law.jurisdiction_ja : law.jurisdiction_ja}</dd></div>
        {law.basis && (
          <div className="flex gap-2">
            <dt className="text-muted">{t.basis}</dt>
            <dd><Link href={`/${lang}/laws/${law.basis.slug}`} className="underline decoration-line underline-offset-4 hover:decoration-ink">{localName(lang, law.basis.name_ja, law.basis.name_en)}</Link></dd>
          </div>
        )}
      </dl>
      {summary && <p className="mt-6 max-w-[38em] text-lg leading-[1.8]">{summary}</p>}
      {law.official_url && (
        <a href={law.official_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
          {t.official} <Icon name="arrow" className="ico !h-4 !w-4" />
        </a>
      )}
      {systems.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {systems.map((s) => (
            <Link key={s.slug} href={`/${lang}/laws/${s.slug}`} className="chip">
              <Icon name="law-system" />
              {localName(lang, s.name_ja, s.name_en)}
            </Link>
          ))}
        </div>
      )}
      <section className="mt-12">
        <h2 className="mb-6 border-b border-ink pb-2 text-lg font-medium">{t.usedIn}</h2>
        {uses.length ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {uses.map(({ project, note }, i) => (
              <ProjectCard key={project.slug} lang={lang} card={{ ...toCard(project, lang), note: note ?? undefined }} index={i} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">{t.none}</p>
        )}
      </section>
    </div>
  );
}
