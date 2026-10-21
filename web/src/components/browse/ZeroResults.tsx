"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { EMPTY, matches, toQuery, type BrowseItem, type Filters, type LawOption, type Ref } from "@/lib/browse";
import { ELEMENTS } from "@/lib/catalog";
import { categoryLabels, type BrowseText, type Locale } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase-browser";

type Relax = { label: string; patch: Partial<Filters>; n: number };

// 同じ条件を何度も記録しない（ページを開いている間）
const logged = new Set<string>();

// 0件のとき、どの条件を一つ外せば何件になるかを出す（いちばん効く順）
export function ZeroResults({ items, filters, update, t, lang, lawOptions }: { items: BrowseItem[]; filters: Filters; update: (p: Partial<Filters>) => void; t: BrowseText; lang: Locale; lawOptions: LawOption[] }) {
  const pathname = usePathname();

  // 0件になった条件を記録する（入力途中の文字で記録しないよう、少し待ってから）
  useEffect(() => {
    const key = `${pathname}${toQuery(filters)}`;
    if (logged.has(key)) return;
    const timer = setTimeout(() => {
      logged.add(key);
      const { q, ...rest } = filters;
      const used = Object.fromEntries(Object.entries(rest).filter(([, v]) => (Array.isArray(v) ? v.length : v !== null && v !== false)));
      createBrowserSupabase().from("search_misses").insert({ q: q.slice(0, 200), filters: used, path: pathname.slice(0, 300), lang }).then(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [filters, pathname, lang]);
  const refLabel = (pick: (it: BrowseItem) => Ref[], slug: string) => items.flatMap(pick).find((r) => r.slug === slug)?.label ?? slug;
  const without = <K extends "uses" | "els" | "laws" | "prefs" | "munis" | "species" | "designers" | "paving">(k: K, v: string) => ({ [k]: filters[k].filter((x) => x !== v) }) as Partial<Filters>;
  const cands: Omit<Relax, "n">[] = [
    ...(filters.q ? [{ label: t.zeroKeyword.replace("{x}", filters.q), patch: { q: "" } }] : []),
    ...filters.uses.map((v) => ({ label: categoryLabels[v]?.[lang] ?? v, patch: without("uses", v) })),
    ...filters.els.map((v) => ({ label: ELEMENTS.find((e) => e.key === v)?.[lang] ?? v, patch: without("els", v) })),
    ...filters.laws.map((v) => ({ label: lawOptions.find((l) => l.slug === v)?.label ?? v, patch: without("laws", v) })),
    ...filters.munis.map((v) => ({ label: v, patch: without("munis", v) })),
    ...(filters.munis.length ? [] : filters.prefs.map((v) => ({ label: items.find((it) => it.pref === v)?.prefLabel ?? v, patch: without("prefs", v) }))),
    ...(filters.y0 || filters.y1 ? [{ label: t.zeroYears.replace("{x}", `${filters.y0 ?? ""}–${filters.y1 ?? ""}`), patch: { y0: null, y1: null } }] : []),
    ...filters.species.map((v) => ({ label: refLabel((it) => it.species, v), patch: without("species", v) })),
    ...filters.designers.map((v) => ({ label: refLabel((it) => it.designers, v), patch: without("designers", v) })),
    ...filters.paving.map((v) => ({ label: refLabel((it) => it.paving, v), patch: without("paving", v) })),
  ];
  const relax: Relax[] = cands
    .map((c) => ({ ...c, n: items.filter((it) => matches(it, { ...filters, ...c.patch })).length }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  // 竣工年で絞っていて、未登録を含めていないなら、それも候補にする
  const unknownYears = (filters.y0 || filters.y1) && !filters.ynull ? items.filter((it) => matches(it, { ...filters, ynull: true })).length : 0;
  const request = `/${lang}/contact?topic=request&detail=${encodeURIComponent(`${t.zeroTitle}: ${pathname}${toQuery(filters)}`)}`;

  return (
    <div className="grid justify-items-start gap-4 rounded-sm border border-line bg-soft/60 p-6 text-sm">
      <p className="text-base font-medium">{t.zeroTitle}</p>
      {(relax.length > 0 || unknownYears > 0) && (
        <div className="grid gap-2">
          <p className="text-muted">{t.zeroHint}</p>
          <div className="flex flex-wrap gap-2">
            {relax.map((r) => (
              <button key={r.label} type="button" onClick={() => update(r.patch)} className="rounded-full border border-ink/30 bg-white px-3 py-1.5 hover:border-ink">
                {t.zeroRemove.replace("{x}", r.label)} <span className="num ml-1 font-semibold">{r.n}</span>
              </button>
            ))}
            {unknownYears > 0 && (
              <button type="button" onClick={() => update({ ynull: true })} className="rounded-full border border-ink/30 bg-white px-3 py-1.5 hover:border-ink">
                {t.includeUnknownYear} <span className="num ml-1 font-semibold">{unknownYears}</span>
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => update(EMPTY)} className="underline underline-offset-4 hover:text-accent">
          {t.zeroAll}（{items.length}）
        </button>
        <Link href={request} className="text-accent hover:underline">{t.zeroRequest}</Link>
      </div>
    </div>
  );
}
