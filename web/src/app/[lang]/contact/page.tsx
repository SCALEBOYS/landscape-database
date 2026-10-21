import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getDictionary, hasLocale } from "@/lib/i18n";
import { alternates } from "@/lib/site";

import { ContactForm } from "./ContactForm";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).contact.title, alternates: alternates(lang, "/contact") } : {};
}

export default async function ContactPage({ params, searchParams }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).contact;
  return (
    <div className="wrap max-w-[760px] pt-12">
      <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-[-0.02em]">{t.title}</h1>
      <p className="mt-4 leading-[1.9] text-muted">{t.lead}</p>
      <div className="mt-8">
        <Suspense>
          <Form lang={lang} searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="mt-10 text-xs text-muted">
        <Link href={`/${lang}/privacy`} className="hover:underline">{t.privacyLink}</Link>
      </p>
    </div>
  );
}

// 「調査の依頼」などのリンクから来たときは、種類と内容を最初から入れておく
async function Form({ lang, searchParams }: { lang: "ja" | "en"; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const t = getDictionary(lang).contact;
  return <ContactForm lang={lang} t={t.form} initial={{ topic: one(sp.topic), detail: one(sp.detail).slice(0, 2000), page: one(sp.page).slice(0, 500) }} />;
}
