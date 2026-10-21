import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RememberRecent } from "@/components/RememberRecent";
import { CardGrid } from "@/components/ProjectCard";
import { getDesigners } from "@/lib/data";
import { getDictionary, hasLocale, localName, locales } from "@/lib/i18n";
import { toCard } from "@/lib/view";

export async function generateStaticParams() {
  const designers = await getDesigners();
  return locales.flatMap((lang) => designers.map((d) => ({ lang, slug: d.party.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/designers/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const d = (await getDesigners()).find((x) => x.party.slug === slug);
  return d && hasLocale(lang) ? { title: localName(lang, d.party.name_ja, d.party.name_en) } : {};
}

export default async function DesignerPage({ params }: PageProps<"/[lang]/designers/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const d = (await getDesigners()).find((x) => x.party.slug === slug);
  if (!d) notFound();
  const t = getDictionary(lang);

  return (
    <div className="wrap pt-10">
      <RememberRecent kind="designers" slug={slug} />
      <h1 className="text-[40px] font-extrabold leading-tight tracking-[-0.02em]">{localName(lang, d.party.name_ja, d.party.name_en)}</h1>
      <p className="mt-1 text-muted">{t.designers.count(d.projects.length)}</p>
      <section className="mt-10">
        <h2 className="mb-6 border-b border-line pb-2 text-lg font-medium">{t.designers.projects}</h2>
        <CardGrid lang={lang} cards={d.projects.map((p) => toCard(p, lang))} />
      </section>
    </div>
  );
}
