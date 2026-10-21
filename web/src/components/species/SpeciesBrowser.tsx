"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Icon } from "@/components/Icon";
import { fmt, growthFormLabels, label, type Locale } from "@/lib/i18n";

export type SpeciesItem = {
  slug: string;
  name: string; // 表示する名前（日本語なら和名）
  scientific: string;
  family: string | null;
  form: string;
  evergreen: boolean | null;
  photo: string | null;
  used: number;
  keywords: string; // 和名・英名・学名・別名・科をまとめた検索用の文字列（小文字）
};

type Text = { search: string; form: string; leaf: string; all: string; usedOnly: string; results: string; noResults: string; clear: string; evergreen: string; deciduous: string; usedCount: string };

// 樹種から探す。名前（和名・学名・別名・科）・生活形・常緑／落葉で絞り込む
export function SpeciesBrowser({ lang, species, forms, t }: { lang: Locale; species: SpeciesItem[]; forms: string[]; t: Text }) {
  const [q, setQ] = useState("");
  const [form, setForm] = useState<string | null>(null);
  const [leaf, setLeaf] = useState<"evergreen" | "deciduous" | null>(null);
  const [usedOnly, setUsedOnly] = useState(false);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return species.filter(
      (s) =>
        (!k || s.keywords.includes(k)) &&
        (!form || s.form === form) &&
        (!leaf || s.evergreen === (leaf === "evergreen")) &&
        (!usedOnly || s.used > 0),
    );
  }, [species, q, form, leaf, usedOnly]);

  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-[13px] transition-colors ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`;
  const any = q || form || leaf || usedOnly;

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 rounded-sm border border-line bg-white p-4 md:p-5">
        <label className="flex items-center gap-2 border-b border-line pb-3">
          <Icon name="search" className="ico !h-5 !w-5 opacity-60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="w-full bg-transparent text-[15px] outline-none" />
        </label>
        <div className="grid gap-3 text-[13px] md:grid-cols-[72px_1fr] md:items-center">
          <span className="text-muted">{t.form}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip(!form)} onClick={() => setForm(null)}>{t.all}</button>
            {forms.map((f) => (
              <button key={f} type="button" aria-pressed={form === f} className={chip(form === f)} onClick={() => setForm(form === f ? null : f)}>
                {label(growthFormLabels, f, lang)}
              </button>
            ))}
          </div>
          <span className="text-muted">{t.leaf}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip(!leaf)} onClick={() => setLeaf(null)}>{t.all}</button>
            {(["evergreen", "deciduous"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={leaf === v} className={chip(leaf === v)} onClick={() => setLeaf(leaf === v ? null : v)}>
                {t[v]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <label className="inline-flex cursor-pointer items-center gap-2 text-muted">
            <input type="checkbox" checked={usedOnly} onChange={(e) => setUsedOnly(e.target.checked)} className="accent-[var(--accent)]" />
            {t.usedOnly}
          </label>
          <span className="ml-auto font-medium">{fmt(t.results, list.length)}</span>
          {any ? (
            <button type="button" className="text-muted underline hover:text-ink" onClick={() => { setQ(""); setForm(null); setLeaf(null); setUsedOnly(false); }}>
              {t.clear}
            </button>
          ) : null}
        </div>
      </div>

      {list.length ? (
        <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <li key={s.slug}>
              <Link href={`/${lang}/species/${s.slug}`} className="group flex items-center gap-3">
                <span className="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-sm bg-soft">
                  {s.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photo} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <Icon name="shade" className="ico !h-6 !w-6 opacity-35" />
                  )}
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate font-medium group-hover:text-accent">{s.name}</span>
                  <i className="truncate text-[13px] text-muted">{s.scientific}</i>
                  {s.used > 0 && <span className="text-xs text-accent">{fmt(t.usedCount, s.used)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-sm bg-soft px-4 py-6 text-center text-sm text-muted">{t.noResults}</p>
      )}
    </div>
  );
}
