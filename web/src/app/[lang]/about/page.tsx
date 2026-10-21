import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalView } from "@/components/legal/LegalView";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { legal } from "@/lib/legal";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: legal(lang).about.title, alternates: alternates(lang, "/about") } : {};
}

export default async function Page({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).contact;
  return <LegalView page={legal(lang).about} lang={lang} updatedLabel={t.updated} contactLabel={t.title} />;
}
