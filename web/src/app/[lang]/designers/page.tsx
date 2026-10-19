import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDesigners } from "@/lib/data";
import { getDictionary, hasLocale, localName } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/designers">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).designers.title } : {};
}

export default async function DesignersIndex({ params }: PageProps<"/[lang]/designers">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const designers = await getDesigners();

  return (
    <div className="wrap pt-10">
      <h1 className="mb-8 text-[34px] font-extrabold tracking-[-0.02em]">{t.designers.title}</h1>
      <ul className="divide-y divide-line border-y border-line">
        {designers.map(({ party, projects }) => (
          <li key={party.slug}>
            <Link href={`/${lang}/designers/${party.slug}`} className="flex items-baseline justify-between py-3 hover:text-accent">
              <span>{localName(lang, party.name_ja, party.name_en)}</span>
              <span className="text-sm text-muted">{t.designers.count(projects.length)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
