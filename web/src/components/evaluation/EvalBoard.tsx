"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type BoardAxis = { key: string; label: string; desc: string; group: string; color: string; tint: string };
export type BoardGroup = { key: string; label: string; color: string };
export type BoardPoint = { axis: string; stance: "valued" | "concern"; text: string; source: string | null; program: string | null; project: string; projectLabel: string; place: string };
type Labels = { overview: string; overviewLead: string; matrix: string; matrixLead: string; words: string; wordsLead: string; valued: string; concern: string; all: string; source: string };

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

// 軸の全体像（棒）・事例 × 軸（表）・ことば（カード）。軸を選ぶと 3 つとも絞り込まれる
export function EvalBoard({ lang, axes, groups, points, labels }: { lang: string; axes: BoardAxis[]; groups: BoardGroup[]; points: BoardPoint[]; labels: Labels }) {
  const [sel, setSel] = useState<string | null>(null);
  const count = useMemo(() => {
    const m = new Map<string, { valued: number; concern: number }>();
    for (const a of axes) m.set(a.key, { valued: 0, concern: 0 });
    for (const p of points) m.get(p.axis)![p.stance]++;
    return m;
  }, [axes, points]);
  const max = Math.max(1, ...[...count.values()].map((c) => c.valued + c.concern));
  const projects = useMemo(() => {
    const m = new Map<string, { slug: string; label: string; place: string; cells: Map<string, BoardPoint[]> }>();
    for (const p of points) {
      const row = m.get(p.project) ?? { slug: p.project, label: p.projectLabel, place: p.place, cells: new Map() };
      row.cells.set(p.axis, [...(row.cells.get(p.axis) ?? []), p]);
      m.set(p.project, row);
    }
    return [...m.values()];
  }, [points]);
  const shownAxes = sel ? axes.filter((a) => a.key === sel) : axes;
  const toggle = (k: string) => setSel((cur) => (cur === k ? null : k));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-16">
      {/* 軸の全体像 */}
      <section id="overview" className="scroll-mt-20">
        <h2 className="text-2xl font-bold">{labels.overview}</h2>
        <p className="mb-5 mt-2 text-sm text-muted">{labels.overviewLead}</p>
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-5 bg-ink" />{labels.valued}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-5 border border-ink bg-[repeating-linear-gradient(135deg,#0a0a0a_0_1.5px,transparent_1.5px_4px)]" />{labels.concern}</span>
          {sel && (
            <button type="button" onClick={() => setSel(null)} className="rounded-full border border-ink px-2.5 py-0.5 text-ink hover:bg-ink hover:text-white">
              {labels.all} ×
            </button>
          )}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.key} className="border-t-[3px] pt-3" style={{ borderColor: g.color }}>
              <h3 className="mb-2 text-sm font-semibold" style={{ color: g.color }}>{g.label}</h3>
              <div className="grid gap-1">
                {axes
                  .filter((a) => a.group === g.key)
                  .map((a) => {
                    const c = count.get(a.key)!;
                    const on = sel === a.key;
                    return (
                      <button key={a.key} type="button" onClick={() => toggle(a.key)} aria-pressed={on} title={a.desc} className={`grid gap-1 rounded-sm px-2 py-2 text-left transition-colors ${on ? "" : "hover:bg-soft"} ${sel && !on ? "opacity-45" : ""}`} style={on ? { background: a.tint } : undefined}>
                        <span className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="font-medium">{a.label}</span>
                          <span className="num text-xs text-muted">{c.valued}{c.concern ? ` + ${c.concern}` : ""}</span>
                        </span>
                        <span className="flex h-2.5">
                          <span style={{ width: `${(c.valued / max) * 100}%`, background: a.color }} />
                          <span style={{ width: `${(c.concern / max) * 100}%`, border: `1px solid ${a.color}`, backgroundImage: `repeating-linear-gradient(135deg, ${a.color} 0 1.5px, transparent 1.5px 4px)` }} className={c.concern ? "" : "hidden"} />
                        </span>
                        <span className="text-[11px] leading-snug text-muted">{a.desc}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 事例 × 軸 */}
      <section id="matrix" className="scroll-mt-20">
        <h2 className="text-2xl font-bold">{labels.matrix}</h2>
        <p className="mb-5 mt-2 text-sm text-muted">{labels.matrixLead}</p>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[190px] bg-white" />
                {axes.map((a) => (
                  <th key={a.key} className="h-[150px] w-10 border-l border-line p-0 align-bottom" style={{ borderTop: `3px solid ${a.color}`, background: sel === a.key ? a.tint : undefined }}>
                    <button type="button" onClick={() => toggle(a.key)} className="mx-auto block pb-2 text-left text-[11px] font-medium leading-tight hover:underline [writing-mode:vertical-rl]">
                      {a.label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((r) => (
                <tr key={r.slug} className={`border-t border-line ${sel && !r.cells.has(sel) ? "opacity-35" : ""}`}>
                  <th className="sticky left-0 z-10 bg-white py-1.5 pr-3 text-left font-normal">
                    <Link href={`/${lang}/projects/${r.slug}`} className="block font-semibold leading-snug hover:underline">{r.label}</Link>
                    <span className="text-[11px] text-muted">{r.place}</span>
                  </th>
                  {axes.map((a) => {
                    const cell = r.cells.get(a.key) ?? [];
                    return (
                      <td key={a.key} className="border-l border-line text-center align-middle" style={{ background: sel === a.key ? a.tint : undefined }} title={cell.map((p) => p.text).join("\n")}>
                        <span className="inline-flex items-center gap-0.5">
                          {cell.map((p, i) =>
                            p.stance === "valued" ? (
                              <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                            ) : (
                              <span key={i} className="h-2.5 w-2.5 rounded-full border-[1.5px] bg-white" style={{ borderColor: a.color }} />
                            ),
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ことば */}
      <section id="words" className="scroll-mt-20">
        <h2 className="text-2xl font-bold">{labels.words}</h2>
        <p className="mb-5 mt-2 text-sm text-muted">{labels.wordsLead}</p>
        <div className="grid gap-8">
          {shownAxes.map((a) => {
            const list = points.filter((p) => p.axis === a.key);
            if (!list.length) return null;
            return (
              <div key={a.key} className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="border-t-[3px] pt-2" style={{ borderColor: a.color }}>
                  <h3 className="font-semibold" style={{ color: a.color }}>{a.label}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{a.desc}</p>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {[...list].sort((x, y) => (x.stance === y.stance ? 0 : x.stance === "valued" ? -1 : 1)).map((p, i) => (
                    <li key={i} className="grid content-start gap-1.5 rounded-sm p-3 text-sm" style={p.stance === "valued" ? { background: a.tint } : { border: `1px dashed ${a.color}` }}>
                      {p.stance === "concern" && <span className="text-[11px] font-semibold" style={{ color: a.color }}>{labels.concern}</span>}
                      <span className="leading-relaxed">{p.text}</span>
                      <span className="flex flex-wrap items-baseline gap-x-2 text-[11px] text-muted">
                        <Link href={`/${lang}/projects/${p.project}`} className="font-medium text-ink hover:underline">{p.projectLabel}</Link>
                        {p.program && <span>{p.program}</span>}
                        {p.source && (
                          <a href={p.source} target="_blank" rel="noopener noreferrer" className="break-all hover:underline">{labels.source}: {host(p.source)}</a>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
