"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Icon } from "@/components/Icon";
import type { Material } from "@/lib/data";
import { componentKindLabels, fmt, label, localName, type Locale } from "@/lib/i18n";
import { MATERIAL_COLORS, MATERIAL_TEXTURES, swatchStyle } from "@/lib/material-visual";

type Text = {
  search: string; kind: string; color: string; texture: string; all: string; clear: string; results: string; noResults: string;
  swatchNote: string; usedOnly: string; count: string; none: string;
};

const KIND_ICONS: Record<string, string> = { paving: "stone", furniture: "bench", lighting: "light", water: "water", play: "play", greening_system: "rooftop", wall_fence: "redevelopment", other: "other" };

// 素材から探す。名前・種類に加えて、色と質感（見た目）で絞り込む
export function MaterialBrowser({ lang, materials, t }: { lang: Locale; materials: Material[]; t: Text }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [textures, setTextures] = useState<string[]>([]);
  const [usedOnly, setUsedOnly] = useState(false);

  const kinds = useMemo(() => [...new Set(materials.map((m) => m.kind))], [materials]);
  const usedColors = Object.keys(MATERIAL_COLORS).filter((c) => materials.some((m) => m.colors.includes(c)));
  const usedTextures = Object.keys(MATERIAL_TEXTURES).filter((x) => materials.some((m) => m.textures.includes(x)));

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return materials.filter(
      (m) =>
        (!k || m.name_ja.toLowerCase().includes(k) || (m.name_en ?? "").toLowerCase().includes(k)) &&
        (!kind || m.kind === kind) &&
        colors.every((c) => m.colors.includes(c)) &&
        textures.every((x) => m.textures.includes(x)) &&
        (!usedOnly || m.projects.length > 0),
    );
  }, [materials, q, kind, colors, textures, usedOnly]);

  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const any = q || kind || colors.length || textures.length || usedOnly;
  const chip = (on: boolean) => `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`;

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 rounded-sm border border-line bg-white p-4 md:p-5">
        <label className="flex items-center gap-2 border-b border-line pb-3">
          <Icon name="search" className="ico !h-5 !w-5 opacity-60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="w-full bg-transparent text-[15px] outline-none" />
        </label>
        <div className="grid gap-3 text-[13px] md:grid-cols-[72px_1fr] md:items-center">
          <span className="text-muted">{t.kind}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip(!kind)} onClick={() => setKind(null)}>{t.all}</button>
            {kinds.map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} className={chip(kind === k)} onClick={() => setKind(kind === k ? null : k)}>
                <Icon name={KIND_ICONS[k] ?? "other"} className="ico !h-4 !w-4" />
                {label(componentKindLabels, k, lang)}
              </button>
            ))}
          </div>
          <span className="text-muted">{t.color}</span>
          <div className="flex flex-wrap gap-2">
            {usedColors.map((c) => {
              const on = colors.includes(c);
              return (
                <button key={c} type="button" aria-pressed={on} onClick={() => setColors(toggle(colors, c))} className={chip(on)}>
                  <span className="h-4 w-4 rounded-full ring-1 ring-black/15" style={{ background: MATERIAL_COLORS[c].hex }} />
                  {MATERIAL_COLORS[c][lang]}
                </button>
              );
            })}
          </div>
          <span className="text-muted">{t.texture}</span>
          <div className="flex flex-wrap gap-2">
            {usedTextures.map((x) => {
              const on = textures.includes(x);
              return (
                <button key={x} type="button" aria-pressed={on} onClick={() => setTextures(toggle(textures, x))} className={chip(on)}>
                  <span className="h-4 w-4 rounded-sm ring-1 ring-black/15" style={swatchStyle(["gray"], x)} />
                  {MATERIAL_TEXTURES[x][lang]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <label className="inline-flex cursor-pointer items-center gap-2 text-muted">
            <input type="checkbox" checked={usedOnly} onChange={(e) => setUsedOnly(e.target.checked)} className="accent-[var(--accent)]" />
            {t.usedOnly}
          </label>
          <span className="ml-auto font-medium">{fmt(t.results, list.length)}</span>
          {any ? (
            <button type="button" className="text-muted underline hover:text-ink" onClick={() => { setQ(""); setKind(null); setColors([]); setTextures([]); setUsedOnly(false); }}>
              {t.clear}
            </button>
          ) : null}
        </div>
      </div>

      {list.length ? (
        <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => {
            const name = localName(lang, m.name_ja, m.name_en);
            const body = (
              <>
                <span className="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-sm bg-soft" style={m.photo ? undefined : swatchStyle(m.colors, m.textures[0])}>
                  {m.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photo} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate font-medium group-hover:text-accent">{name}</span>
                  <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
                    <Icon name={KIND_ICONS[m.kind] ?? "other"} className="ico !h-3.5 !w-3.5 flex-none" />
                    <span className="truncate">{[label(componentKindLabels, m.kind, lang), ...m.textures.map((x) => MATERIAL_TEXTURES[x]?.[lang])].filter(Boolean).join("・")}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    {m.colors.map((c) => (
                      <span key={c} title={MATERIAL_COLORS[c]?.[lang]} className="h-2.5 w-2.5 rounded-full ring-1 ring-black/15" style={{ background: MATERIAL_COLORS[c]?.hex }} />
                    ))}
                    <span className={`${m.colors.length ? "ml-1" : ""} ${m.projects.length ? "text-accent" : "text-muted"}`}>{m.projects.length ? fmt(t.count, m.projects.length) : t.none}</span>
                  </span>
                </span>
              </>
            );
            return (
              <li key={m.slug} id={m.slug}>
                {/* 舗装は地図で探す画面で絞り込めるので、事例があればそこへつなぐ */}
                {m.kind === "paving" && m.projects.length ? (
                  <Link href={`/${lang}/explore?paving=${m.slug}`} className="group flex items-center gap-3">{body}</Link>
                ) : (
                  <div className="flex items-center gap-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-sm bg-soft px-4 py-6 text-center text-sm text-muted">{t.noResults}</p>
      )}
      {list.some((m) => !m.photo) && <p className="text-xs text-muted">{t.swatchNote}</p>}
    </div>
  );
}
