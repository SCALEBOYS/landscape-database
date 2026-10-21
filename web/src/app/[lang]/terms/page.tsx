import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalView } from "@/components/legal/LegalView";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { legal } from "@/lib/legal";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: legal(lang).terms.title, alternates: alternates(lang, "/terms") } : {};
}

export default async function Page({ params }: PageProps<"/[lang]/terms">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).contact;
  return <LegalView page={legal(lang).terms} lang={lang} updatedLabel={t.updated} contactLabel={t.title} />;
}
