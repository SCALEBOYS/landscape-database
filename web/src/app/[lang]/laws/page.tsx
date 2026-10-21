import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";
import { getLaws, getProjects } from "@/lib/data";
import { getDictionary, hasLocale, localName } from "@/lib/i18n";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/laws">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).laws.title, alternates: alternates(lang, "/laws") } : {};
}

const KINDS = ["law", "system", "ordinance"] as const;

export default async function LawsIndex({ params }: PageProps<"/[lang]/laws">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).laws;
  const [laws, projects] = await Promise.all([getLaws(), getProjects()]);
  const usage = new Map<string, number>();
  for (const p of projects) for (const { law } of p.laws) usage.set(law.slug, (usage.get(law.slug) ?? 0) + 1);

  return (
    <div className="wrap pt-10">
      <h1 className="text-[34px] font-extrabold tracking-[-0.02em]">{t.title}</h1>
      <p className="mt-3 max-w-[60ch] text-sm leading-[1.8] text-muted">{t.lead}</p>
      <div className="mt-10 grid gap-12">
        {KINDS.map((kind) => (
          <section key={kind}>
            <h2 className="mb-3 flex items-center gap-2 border-b border-ink pb-2 text-lg font-medium">
              <Icon name={`law-${kind}`} />
              {t.kinds[kind]}
            </h2>
            <ul className="divide-y divide-line">
              {laws
                .filter((l) => l.kind === kind)
                .map((l) => (
                  <li key={l.slug}>
                    <Link href={`/${lang}/laws/${l.slug}`} className="grid gap-1 py-3 hover:bg-soft sm:grid-cols-[1fr_auto] sm:items-baseline">
                      <span>
                        <span className="font-medium">{localName(lang, l.name_ja, l.name_en)}</span>
                        {kind === "ordinance" && <span className="ml-2 text-xs text-muted">{lang === "en" ? l.jurisdiction_en ?? l.jurisdiction_ja : l.jurisdiction_ja}</span>}
                        {l.basis && <span className="ml-2 text-xs text-muted">{t.basis}: {localName(lang, l.basis.name_ja, l.basis.name_en)}</span>}
                      </span>
                      <span className="text-xs text-muted">{usage.get(l.slug) ? t.count(usage.get(l.slug)!) : ""}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
