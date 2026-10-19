import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProjects, getSpeciesList } from "@/lib/data";
import { getDictionary, growthFormLabels, hasLocale, label, localName } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/species">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).species.title } : {};
}

const FORMS = ["tree", "shrub", "ground_cover", "climber", "grass", "fern", "bamboo", "aquatic", "other"];

export default async function SpeciesIndex({ params }: PageProps<"/[lang]/species">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const [species, projects] = await Promise.all([getSpeciesList(), getProjects()]);
  const usage = new Map<string, number>();
  for (const p of projects) for (const pl of p.plantings) usage.set(pl.species.slug, (usage.get(pl.species.slug) ?? 0) + 1);

  const sorted = lang === "en" ? [...species].sort((a, b) => (a.name_en ?? a.scientific_name).localeCompare(b.name_en ?? b.scientific_name, "en")) : species;
  const groups = FORMS.map((form) => ({ form, items: sorted.filter((s) => (s.growth_form ?? "other") === form) })).filter((g) => g.items.length);

  return (
    <div className="wrap pt-10">
      <h1 className="mb-8 text-[34px] font-extrabold tracking-[-0.02em]">{t.species.title}</h1>
      <nav className="mb-8 flex flex-wrap gap-3 text-sm">
        {groups.map((g) => (
          <a key={g.form} href={`#${g.form}`} className="rounded-full border border-line px-3 py-1 text-muted hover:border-accent hover:text-accent">
            {label(growthFormLabels, g.form, lang)}
          </a>
        ))}
      </nav>
      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.form} id={g.form}>
            <h2 className="mb-3 border-b border-line pb-2 text-lg font-medium">{label(growthFormLabels, g.form, lang)}</h2>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((s) => (
                <li key={s.slug}>
                  <Link href={`/${lang}/species/${s.slug}`} className="hover:text-accent">
                    {localName(lang, s.name_ja, s.name_en)} <i className="text-sm text-muted">{s.scientific_name}</i>
                  </Link>
                  {usage.get(s.slug) ? <span className="ml-2 text-xs text-accent">{t.species.usedCount(usage.get(s.slug)!)}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
