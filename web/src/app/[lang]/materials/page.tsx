import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";
import { getMaterials } from "@/lib/data";
import { componentKindLabels, getDictionary, hasLocale, label, localName } from "@/lib/i18n";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/materials">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: getDictionary(lang).groups.project.materials, alternates: alternates(lang, "/materials") } : {};
}

const KIND_ICONS: Record<string, string> = { paving: "stone", furniture: "bench", lighting: "light", water: "water", play: "play", greening_system: "rooftop", wall_fence: "redevelopment", other: "other" };

// PROJECT ＞ 素材から探す。舗装・照明などの分類ごとに、使っている事例を並べる
export default async function MaterialsPage({ params }: PageProps<"/[lang]/materials">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const t = dict.materialsPage;
  const materials = await getMaterials();
  const kinds = [...new Set(materials.map((m) => m.kind))];
  const used = materials.filter((m) => m.projects.length).length;

  return (
    <div className="wrap pt-10">
      <span className="eyebrow">PROJECT</span>
      <h1 className="mt-1 text-[clamp(30px,4vw,44px)] font-extrabold tracking-[-0.02em]">{dict.groups.project.materials}</h1>
      <p className="mt-3 max-w-[60ch] text-sm leading-[1.8] text-muted">{t.lead}</p>
      {used === 0 && <p className="mt-4 rounded-sm bg-soft px-4 py-3 text-sm text-muted">{t.empty}</p>}
      <div className="mt-10 grid gap-12">
        {kinds.map((kind) => (
          <section key={kind}>
            <h2 className="mb-4 flex items-center gap-2 border-b border-ink pb-2 text-lg font-semibold">
              <Icon name={KIND_ICONS[kind] ?? "other"} />
              {label(componentKindLabels, kind, lang)}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {materials
                .filter((m) => m.kind === kind)
                .map((m) => (
                  <li key={m.slug} className={`rounded-sm border p-4 ${m.projects.length ? "border-line bg-white" : "border-dashed border-line"}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      {kind === "paving" && m.projects.length ? (
                        <Link href={`/${lang}/explore?paving=${m.slug}`} className="font-medium hover:underline">{localName(lang, m.name_ja, m.name_en)}</Link>
                      ) : (
                        <span className={`font-medium ${m.projects.length ? "" : "text-muted"}`}>{localName(lang, m.name_ja, m.name_en)}</span>
                      )}
                      <span className="num text-xs text-muted">{m.projects.length ? t.count.replace("{n}", String(m.projects.length)) : t.none}</span>
                    </div>
                    {m.projects.length > 0 && (
                      <ul className="mt-2 grid gap-1 text-sm">
                        {m.projects.slice(0, 5).map((p) => (
                          <li key={p.slug}>
                            <Link href={`/${lang}/projects/${p.slug}`} className="text-muted hover:text-ink hover:underline">{localName(lang, p.name_ja, p.name_en)}</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
