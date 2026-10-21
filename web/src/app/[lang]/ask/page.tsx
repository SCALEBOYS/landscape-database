import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AskChat } from "@/components/ai/AskChat";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/ask">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).ask.title, alternates: alternates(lang, "/ask") } : {};
}

// RESEARCH ＞ AI に聞く。サイトに載っている事例・樹種・法令・研究をもとに答える
export default async function AskPage({ params }: PageProps<"/[lang]/ask">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).ask;
  return (
    <div className="wrap max-w-[860px] pt-10">
      <span className="eyebrow">RESEARCH · AI</span>
      <h1 className="mt-1 text-[clamp(30px,4vw,44px)] font-extrabold tracking-[-0.02em]">{t.title}</h1>
      <p className="mb-8 mt-3 max-w-[60ch] text-sm leading-[1.8] text-muted">{t.lead}</p>
      <AskChat lang={lang} t={t} />
    </div>
  );
}
