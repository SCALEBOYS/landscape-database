"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { matches, type BrowseItem, type Filters, type Ref } from "@/lib/browse";
import { fmt, type BrowseText } from "@/lib/i18n";

type Tab = "species" | "designers" | "paving";

export function FilterButton({ filters, onClick, t }: { filters: Filters; onClick: () => void; t: BrowseText }) {
  const n = filters.species.length + filters.designers.length + filters.paving.length;
  return (
    <button type="button" className="fbtn" onClick={onClick} aria-label={t.filter}>
      <Icon name="sliders" />
      <span className="hidden sm:inline">{t.filter}</span>
      {n > 0 && <span className="badge">{n}</span>}
    </button>
  );
}

// 樹種・設計者・舗装の細目を、文字を打って絞りながら選ぶパネル
export function FilterPanel({
  items,
  filters,
  update,
  t,
  onClose,
}: {
  items: BrowseItem[];
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  t: BrowseText;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("species");
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const options = useMemo(() => {
    const m = new Map<string, Ref & { n: number }>();
    for (const it of items) for (const r of it[tab]) m.set(r.slug, { ...r, n: (m.get(r.slug)?.n ?? 0) + 1 });
    return [...m.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "ja"));
  }, [items, tab]);

  const needle = q.trim().toLowerCase();
  const shown = options.filter((o) => !needle || o.label.toLowerCase().includes(needle) || o.sub?.toLowerCase().includes(needle));
  const selected = filters[tab];
  const labelOf = (slug: string) => options.find((o) => o.slug === slug)?.label ?? slug;
  const toggle = (slug: string) => update({ [tab]: selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug] });
  const hl = (s: string) => {
    const i = needle ? s.toLowerCase().indexOf(needle) : -1;
    return i < 0 ? s : <>{s.slice(0, i)}<mark>{s.slice(i, i + needle.length)}</mark>{s.slice(i + needle.length)}</>;
  };
  const tabs: [Tab, string, string][] = [
    ["species", t.tabSpecies, t.findSpecies],
    ["designers", t.tabDesigners, t.findDesigner],
    ["paving", t.tabPaving, t.findPaving],
  ];
  const result = items.filter((it) => matches(it, filters)).length;

  return (
    <div className="ovl" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel rise" role="dialog" aria-modal="true" aria-label={t.filter}>
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <b className="font-medium">{t.filter}</b>
          <button type="button" onClick={onClose} aria-label={t.close}>
            <Icon name="x" />
          </button>
        </header>
        <div className="ptabs flex gap-1 border-b border-line px-5 pt-3" role="tablist">
          {tabs.map(([k, name]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setQ(""); }}>
              {name}
              {filters[k].length > 0 && <span className="ml-1 rounded-full bg-accent px-1.5 text-[11px] text-white">{filters[k].length}</span>}
            </button>
          ))}
        </div>
        <div className="grid flex-1 content-start gap-2.5 overflow-y-auto px-5 py-4">
          <label className="flex items-center gap-2 rounded border border-line px-3 py-2.5">
            <Icon name="search" />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tabs.find(([k]) => k === tab)![2]} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((s) => (
                <button key={s} type="button" onClick={() => toggle(s)} className="inline-flex items-center gap-1.5 rounded-sm bg-ink py-1 pl-2.5 pr-2 text-xs text-white">
                  {labelOf(s)} <Icon name="x" className="ico !h-3.5 !w-3.5" />
                </button>
              ))}
            </div>
          )}
          <div className="plist">
            {shown.map((o) => (
              <label key={o.slug} className="opt border-b border-line !py-2.5">
                <input type="checkbox" checked={selected.includes(o.slug)} onChange={() => toggle(o.slug)} />
                <span>
                  {hl(o.label)} {o.sub && <i className="text-sm text-muted">{hl(o.sub)}</i>}
                </span>
                <span className="c">{o.n}</span>
              </label>
            ))}
            {!shown.length && <p className="py-5 text-sm text-muted">{options.length ? t.noMatch : t.noOptions}</p>}
          </div>
        </div>
        <footer className="flex items-center justify-between border-t border-line px-5 py-3.5">
          <button type="button" className="linkbtn text-sm" onClick={() => update({ species: [], designers: [], paving: [] })}>
            {t.clearAll}
          </button>
          <button type="button" className="solid" onClick={onClose}>
            {fmt(t.showN, result)}
          </button>
        </footer>
      </div>
    </div>
  );
}
