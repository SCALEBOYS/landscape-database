"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { matches, type BrowseItem, type Filters } from "@/lib/browse";
import { REGIONS } from "@/lib/catalog";
import { fmt, type BrowseText } from "@/lib/i18n";

type Props = {
  items: BrowseItem[];
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  t: BrowseText;
  lang: string;
  years: [number, number];
  compact?: boolean;
  onSubmit?: () => void;
};

// 「キーワード｜地域｜竣工年」の検索バー。キーワード欄は後で AI 検索に置き換える
export function SearchBar({ items, filters, update, t, lang, years, compact, onSubmit }: Props) {
  const [open, setOpen] = useState<"region" | "years" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const regionSel = filters.munis.length ? filters.munis : filters.prefs;
  const regionText = regionSel.length ? regionSel[0] + (regionSel.length > 1 ? ` ${fmt(t.andMore, regionSel.length - 1)}` : "") : t.anywhere;
  const y0 = filters.y0 ?? years[0], y1 = filters.y1 ?? years[1];
  const yearsOn = filters.y0 !== null || filters.y1 !== null;
  const yearsText = !yearsOn ? t.anytime : y0 === y1 ? String(y0) : `${y0}–${y1}`;

  return (
    <div ref={ref} className={`sbar ${compact ? "compact" : ""}`}>
      <label className="sfield kw">
        <span className="lbl">
          {t.keyword} <span className="ai-hint">{t.aiHint}</span>
        </span>
        <input
          type="search"
          value={filters.q}
          placeholder={t.keywordPlaceholder}
          autoComplete="off"
          onChange={(e) => update({ q: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && onSubmit?.()}
        />
      </label>
      <button type="button" className={`sfield ${open === "region" ? "open" : ""}`} onClick={() => setOpen(open === "region" ? null : "region")} aria-expanded={open === "region"}>
        <span className="lbl">{t.region}</span>
        <span className={`val ${regionSel.length ? "on" : ""}`}>{regionText}</span>
      </button>
      <button type="button" className={`sfield ${open === "years" ? "open" : ""}`} style={{ borderRight: 0 }} onClick={() => setOpen(open === "years" ? null : "years")} aria-expanded={open === "years"}>
        <span className="lbl">{t.years}</span>
        <span className={`val num ${yearsOn ? "on" : ""}`}>{yearsText}</span>
      </button>
      <button type="button" className="sgo" aria-label={t.search} onClick={onSubmit}>
        <Icon name="search" />
      </button>

      {open === "region" && <RegionPop items={items} filters={filters} update={update} t={t} lang={lang} onClose={() => setOpen(null)} />}
      {open === "years" && <YearsPop items={items} filters={filters} update={update} t={t} years={years} onClose={() => setOpen(null)} />}
    </div>
  );
}

function RegionPop({ items, filters, update, t, lang, onClose }: Omit<Props, "years"> & { onClose: () => void }) {
  const region = REGIONS[0];
  const count = (f: (it: BrowseItem) => boolean) => items.filter(f).length;
  const available = region.prefectures.filter((p) => items.some((it) => it.pref === p));
  const allOn = available.length > 0 && available.every((p) => filters.prefs.includes(p));
  const munis = [...new Set(items.filter((it) => it.muni && (!filters.prefs.length || filters.prefs.includes(it.pref))).map((it) => it.muni))].sort((a, b) =>
    a.localeCompare(b, "ja"),
  );
  const prefLabel = (p: string) => items.find((it) => it.pref === p)?.prefLabel ?? p;
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="pop region fade-in">
      <div className="rcols">
        <div>
          <h4>{t.regionCol}</h4>
          <label className="opt">
            <input type="checkbox" checked={allOn} onChange={() => update({ prefs: allOn ? [] : available, munis: [] })} />
            {lang === "en" ? region.en : region.ja}
            <span className="c">{count((it) => region.prefectures.includes(it.pref))}</span>
          </label>
          <label className="opt dim">
            <input type="checkbox" disabled />
            {lang === "en" ? "Kanto" : "関東"}
            <span className="c">{t.comingSoon}</span>
          </label>
        </div>
        <div>
          <h4>{t.prefCol}</h4>
          {region.prefectures.map((p) => {
            const c = count((it) => it.pref === p);
            return (
              <label key={p} className={`opt ${c ? "" : "dim"}`}>
                <input
                  type="checkbox"
                  disabled={!c}
                  checked={filters.prefs.includes(p)}
                  onChange={() => {
                    const prefs = toggle(filters.prefs, p);
                    update({ prefs, munis: filters.munis.filter((m) => items.some((it) => it.muni === m && (!prefs.length || prefs.includes(it.pref)))) });
                  }}
                />
                {prefLabel(p)}
                <span className="c">{c}</span>
              </label>
            );
          })}
        </div>
        <div>
          <h4>
            {t.muniCol}
            {!filters.prefs.length && <span className="block text-[11px] font-normal">{t.muniHint}</span>}
          </h4>
          <div className="max-h-[220px] overflow-y-auto">
            {munis.map((m) => (
              <label key={m} className="opt">
                <input type="checkbox" checked={filters.munis.includes(m)} onChange={() => update({ munis: toggle(filters.munis, m) })} />
                {m}
                <span className="c">{count((it) => it.muni === m)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="pop-foot">
        <button type="button" className="linkbtn" onClick={() => update({ prefs: [], munis: [] })}>
          {t.clear}
        </button>
        <span className="text-muted">{t.regionNote}</span>
        <button type="button" className="solid" onClick={onClose}>
          {t.done}
        </button>
      </div>
    </div>
  );
}

function YearsPop({ items, filters, update, t, years, onClose }: Omit<Props, "lang"> & { onClose: () => void }) {
  const [min, max] = years;
  const y0 = filters.y0 ?? min, y1 = filters.y1 ?? max;
  const span = Math.max(1, max - min);
  const pct = (y: number) => ((y - min) / span) * 100;
  const pool = items.filter((it) => matches(it, filters, "years"));
  const hist = Array.from({ length: max - min + 1 }, (_, i) => pool.filter((it) => it.year === min + i).length);
  const top = Math.max(1, ...hist);
  // 端まで戻したら「指定なし」に戻す
  const set = (a: number, b: number) => update({ y0: a === min && b === max ? null : a, y1: a === min && b === max ? null : b });
  const decades = [];
  for (let d = Math.ceil(min / 10) * 10; d <= max; d += 10) decades.push(d);

  return (
    <div className="pop years fade-in">
      <h4>{t.years}</h4>
      <div className="hist">
        {hist.map((c, i) => (
          <span key={i} className={min + i >= y0 && min + i <= y1 ? "in" : ""} style={{ height: c ? `${12 + (c / top) * 88}%` : "3%" }} title={`${min + i}: ${c}`} />
        ))}
      </div>
      <div className="range">
        <div className="track" />
        <div className="fill" style={{ left: `${pct(y0)}%`, right: `${100 - pct(y1)}%` }} />
        <input type="range" min={min} max={max} value={y0} aria-label={`${t.years} (from)`} onChange={(e) => { const v = +e.target.value; set(v, Math.max(v, y1)); }} />
        <input type="range" min={min} max={max} value={y1} aria-label={`${t.years} (to)`} onChange={(e) => { const v = +e.target.value; set(Math.min(v, y0), v); }} />
      </div>
      <div className="mt-2.5 flex items-baseline justify-between">
        <span className="num text-[22px]">{y0}</span>
        <span className="text-xs text-muted">{y0 === y1 ? t.oneYear : fmt(t.nYears, y1 - y0 + 1)}</span>
        <span className="num text-[22px]">{y1}</span>
      </div>
      <div className="presets">
        {decades.map((d) =>
          d + 10 > max ? (
            <button key={d} type="button" onClick={() => set(d, max)}>{fmt(t.since, d)}</button>
          ) : (
            <button key={d} type="button" onClick={() => set(d, d + 9)}>{fmt(t.decade, d)}</button>
          ),
        )}
      </div>
      <div className="pop-foot">
        <button type="button" className="linkbtn" onClick={() => update({ y0: null, y1: null })}>
          {t.clear}
        </button>
        <span className="text-muted">{t.yearsNote}</span>
        <button type="button" className="solid" onClick={onClose}>
          {t.done}
        </button>
      </div>
    </div>
  );
}
