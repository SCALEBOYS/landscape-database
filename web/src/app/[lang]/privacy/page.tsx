import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalView } from "@/components/legal/LegalView";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { legal } from "@/lib/legal";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: legal(lang).privacy.title, alternates: alternates(lang, "/privacy") } : {};
}

export default async function Page({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).contact;
  return <LegalView page={legal(lang).privacy} lang={lang} updatedLabel={t.updated} contactLabel={t.title} />;
}
