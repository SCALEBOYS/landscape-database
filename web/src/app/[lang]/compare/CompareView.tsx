"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/Icon";
import { COMPARE_MAX, writeCompare } from "@/lib/compare";
import type { Dictionary } from "@/lib/i18n";

import { useCompare } from "@/components/compare/useCompare";

export type CompareProject = {
  slug: string;
  name: string;
  img: string | null;
  use: string;
  place: string;
  year: number | null;
  area: number | null;
  designers: string[];
  awards: string[];
  species: string[];
  materials: string[];
  laws: string[];
  photos: number;
  models: number;
};

type T = Dictionary["compare"];

// Apple の製品比較のように、列ごとに事例を選び替えながら同じ項目を見比べる
export function CompareView({ lang, all, initial, t }: { lang: string; all: CompareProject[]; initial: string[]; t: T }) {
  const tray = useCompare();
  // URL で指定があればそれを、なければ比較に入れた事例を使う
  const [cols, setCols] = useState<string[]>(() => (initial.length ? initial : []));
  const shown = cols.length ? cols : tray.slugs;
  const slots = Array.from({ length: COMPARE_MAX }, (_, i) => shown[i] ?? "");
  const bySlug = new Map(all.map((p) => [p.slug, p]));

  // 選んだ組み合わせを URL と「比較に入れた事例」に残す（共有・戻るのため）
  useEffect(() => {
    if (!cols.length) return;
    window.history.replaceState(null, "", `${window.location.pathname}?p=${cols.join(",")}`);
    writeCompare(cols);
  }, [cols]);

  const choose = (i: number, slug: string) => {
    const next = [...slots];
    next[i] = slug;
    setCols(next.filter(Boolean));
  };

  const rows: { group: string; items: { label: string; value: (p: CompareProject) => React.ReactNode }[] }[] = [
    {
      group: t.groupBasic,
      items: [
        { label: t.use, value: (p) => p.use },
        { label: t.place, value: (p) => p.place },
        { label: t.year, value: (p) => (p.year ? <span className="num text-2xl font-semibold">{p.year}</span> : null) },
        { label: t.area, value: (p) => (p.area ? <span className="num text-2xl font-semibold">{p.area.toLocaleString()}<span className="ml-1 text-sm font-normal">m²</span></span> : null) },
      ],
    },
    {
      group: t.groupDesign,
      items: [
        { label: t.designers, value: (p) => list(p.designers) },
        { label: t.awards, value: (p) => list(p.awards) },
      ],
    },
    {
      group: t.groupMaterials,
      items: [
        { label: t.species, value: (p) => (p.species.length ? <>{<span className="num font-semibold">{p.species.length}</span>} {t.kinds}<span className="mt-1 block text-xs text-muted">{p.species.slice(0, 6).join("、")}</span></> : null) },
        { label: t.materials, value: (p) => list(p.materials) },
        { label: t.laws, value: (p) => list(p.laws) },
      ],
    },
    {
      group: t.groupData,
      items: [
        { label: t.photos, value: (p) => (p.photos ? <span className="num">{p.photos}</span> : null) },
        { label: t.models, value: (p) => (p.models ? <span className="num">{p.models}</span> : null) },
      ],
    },
  ];

  return (
    <div className="mt-8">
      <div className="sticky top-[var(--hdr)] z-10 -mx-4 grid grid-cols-[repeat(3,minmax(200px,1fr))] gap-4 overflow-x-auto bg-white/95 px-4 pb-4 pt-2 backdrop-blur sm:-mx-6 sm:px-6">
        {slots.map((slug, i) => {
          const p = bySlug.get(slug);
          return (
            <div key={i} className="grid content-start gap-3">
              <select value={slug} onChange={(e) => choose(i, e.target.value)} className="w-full rounded-sm border border-line bg-white px-3 py-2 text-sm" aria-label={`${t.choose} ${i + 1}`}>
                <option value="">{t.choose}</option>
                {all.map((o) => (
                  <option key={o.slug} value={o.slug} disabled={slots.includes(o.slug) && o.slug !== slug}>{o.name}</option>
                ))}
              </select>
              {p ? (
                <Link href={`/${lang}/projects/${p.slug}`} className="group grid gap-2">
                  <div className="aspect-[16/10] overflow-hidden rounded-sm bg-soft">
                    {p.img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.img} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                    )}
                  </div>
                  <span className="text-lg font-semibold leading-snug group-hover:underline">{p.name}</span>
                </Link>
              ) : (
                <div className="grid aspect-[16/10] place-items-center rounded-sm border border-dashed border-line text-sm text-muted">
                  <span className="grid justify-items-center gap-2">
                    <Icon name="compare" className="ico !h-6 !w-6" />
                    {t.empty}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {rows.map((g) => (
            <section key={g.group} className="mt-10">
              <h2 className="border-b border-ink pb-2 text-lg font-semibold">{g.group}</h2>
              {g.items.map((r) => (
                <div key={r.label} className="border-b border-line py-4">
                  <p className="mb-2 text-xs text-muted">{r.label}</p>
                  <div className="grid grid-cols-3 gap-4 text-sm leading-relaxed">
                    {slots.map((slug, i) => {
                      const p = bySlug.get(slug);
                      const v = p ? r.value(p) : null;
                      return <div key={i}>{p ? v ?? <span className="text-xs text-muted">{t.notRecorded}</span> : null}</div>;
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
      <p className="mt-6 text-xs text-muted">{t.note}</p>
    </div>
  );
}

const list = (xs: string[]) => (xs.length ? <ul className="grid gap-1">{xs.map((x) => <li key={x}>{x}</li>)}</ul> : null);
