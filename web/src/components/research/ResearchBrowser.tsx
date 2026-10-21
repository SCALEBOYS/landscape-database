"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/Icon";
import { FIELDS, fieldOf } from "@/lib/research-fields";

export type BrowserMethod = { slug: string; name: string; summary: string; field: string; draft: boolean };
export type BrowserPaper = {
  slug: string;
  title: string;
  original: string | null;
  authors: string;
  year: number;
  venue: string;
  kind: string;
  language: string;
  draft: boolean;
  methods: string[];
  text: string; // 検索用（題・著者・掲載誌・要約・手法名をつなげたもの）
};
export type ResearchLabels = {
  search: string;
  fields: string;
  methods: string;
  papers: string;
  all: string;
  clear: string;
  draft: string;
  noMatch: string;
  paperCount: string; // {n}
  kind: Record<string, string>;
  langJa: string;
  langEn: string;
  timeline: string;
};

type Filters = { q: string; field: string | null; method: string | null; lang: string | null };

const fmt = (s: string, n: number) => s.replace("{n}", String(n));

// URL の条件（?q=&field=&method=&lang=）を読む。Suspense の中で使う
export function ResearchBrowserFromUrl(props: Props) {
  const sp = useSearchParams();
  return <ResearchBrowser {...props} initial={{ q: sp.get("q") ?? "", field: sp.get("field"), method: sp.get("method"), lang: sp.get("lang") }} />;
}

type Props = { lang: string; methods: BrowserMethod[]; papers: BrowserPaper[]; t: ResearchLabels };

export function ResearchBrowser({ lang, methods, papers, t, initial = { q: "", field: null, method: null, lang: null } }: Props & { initial?: Filters }) {
  const [f, setF] = useState<Filters>(initial);
  const router = useRouter();
  const methodOf = useMemo(() => new Map(methods.map((m) => [m.slug, m])), [methods]);

  // 条件は URL に残す（共有・戻るのため）
  useEffect(() => {
    const p = new URLSearchParams();
    if (f.q) p.set("q", f.q);
    if (f.field) p.set("field", f.field);
    if (f.method) p.set("method", f.method);
    if (f.lang) p.set("lang", f.lang);
    const qs = p.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, [f]);

  const q = f.q.trim().toLowerCase();
  const paperField = (p: BrowserPaper) => fieldOf(methodOf.get(p.methods[0] ?? "")?.field ?? "perception");
  const paperMatches = (p: BrowserPaper) =>
    (!f.field || p.methods.some((m) => methodOf.get(m)?.field === f.field)) &&
    (!f.method || p.methods.includes(f.method)) &&
    (!f.lang || p.language === f.lang) &&
    (!q || p.text.includes(q));
  const shownPapers = papers.filter(paperMatches);
  const shownMethods = methods.filter(
    (m) => (!f.field || m.field === f.field) && (!f.method || m.slug === f.method) && (!q || `${m.name} ${m.summary}`.toLowerCase().includes(q) || shownPapers.some((p) => p.methods.includes(m.slug))),
  );
  const count = (slug: string) => papers.filter((p) => p.methods.includes(slug)).length;
  const fieldCount = (key: string) => papers.filter((p) => p.methods.some((m) => methodOf.get(m)?.field === key)).length;
  const active = !!(f.q || f.field || f.method || f.lang);

  return (
    <>
      <Timeline papers={papers} match={paperMatches} colorOf={(p) => paperField(p).color} onPick={(p) => router.push(`/${lang}/research/papers/${p.slug}`)} label={t.timeline} />

      {/* 絞り込み */}
      <div className="sticky top-[var(--hdr)] z-20 -mx-4 border-b border-line bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-sm border-2 border-ink px-3 py-2">
            <Icon name="search" className="ico !h-4 !w-4 text-muted" />
            <input value={f.q} onChange={(e) => setF((x) => ({ ...x, q: e.target.value }))} placeholder={t.search} className="w-full bg-transparent text-sm outline-none" />
          </label>
          <div className="flex gap-1 text-xs">
            {([null, "ja", "en"] as const).map((l) => (
              <button key={l ?? "all"} type="button" aria-pressed={f.lang === l} onClick={() => setF((x) => ({ ...x, lang: l }))} className={`rounded-sm border px-2.5 py-1.5 ${f.lang === l ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
                {l === null ? t.all : l === "ja" ? t.langJa : t.langEn}
              </button>
            ))}
          </div>
          {active && (
            <button type="button" onClick={() => setF({ q: "", field: null, method: null, lang: null })} className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
              {t.clear}
            </button>
          )}
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {FIELDS.map((fd) => {
            const on = f.field === fd.key;
            return (
              <button
                key={fd.key}
                type="button"
                aria-pressed={on}
                onClick={() => setF((x) => ({ ...x, field: on ? null : fd.key, method: null }))}
                className="flex flex-none items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition"
                style={on ? { background: fd.color, borderColor: fd.color, color: "#fff" } : { borderColor: `${fd.color}66` }}
              >
                <Icon name={`field-${fd.key}`} className="ico !h-4 !w-4" />
                {lang === "en" ? fd.en : fd.ja}
                <span className={`num text-[11px] ${on ? "text-white/80" : "text-muted"}`}>{fieldCount(fd.key)}</span>
              </button>
            );
          })}
        </div>
        {f.field && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {methods
              .filter((m) => m.field === f.field)
              .map((m) => {
                const on = f.method === m.slug;
                const color = fieldOf(m.field).color;
                return (
                  <button key={m.slug} type="button" aria-pressed={on} onClick={() => setF((x) => ({ ...x, method: on ? null : m.slug }))} className="rounded-sm border px-2.5 py-1 text-xs" style={on ? { background: color, borderColor: color, color: "#fff" } : { borderColor: "var(--line)" }}>
                    {m.name}
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* 手法 */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-baseline gap-3 text-lg font-medium">
          {t.methods}
          <span className="num text-sm text-muted">{shownMethods.length}</span>
        </h2>
        {shownMethods.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shownMethods.map((m) => {
              const fd = fieldOf(m.field);
              const n = count(m.slug);
              return (
                <li key={m.slug}>
                  <Link href={`/${lang}/research/methods/${m.slug}`} className="group relative grid h-full content-start gap-3 overflow-hidden rounded-sm border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,.08)]">
                    <span className="absolute inset-x-0 top-0 h-1" style={{ background: fd.color }} />
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-10 w-10 flex-none place-items-center rounded-full" style={{ background: `${fd.color}1a`, color: fd.color }}>
                        <Icon name={`field-${fd.key}`} className="ico !h-5 !w-5" />
                      </span>
                      <span className="text-[11px] tracking-[.06em]" style={{ color: fd.color }}>{lang === "en" ? fd.en : fd.ja}</span>
                    </span>
                    <span className="text-[17px] font-semibold leading-snug group-hover:underline">{m.name}</span>
                    <span className="line-clamp-3 text-[13px] leading-[1.7] text-muted">{m.summary}</span>
                    <span className="mt-auto flex items-center gap-2 pt-1 text-xs text-muted">
                      {/* 論文の本数を点で見せる */}
                      <span className="flex gap-0.5">
                        {Array.from({ length: Math.max(n, 1) }, (_, i) => (
                          <span key={i} className="h-2 w-2 rounded-full" style={{ background: n ? fd.color : "var(--line)" }} />
                        ))}
                      </span>
                      {fmt(t.paperCount, n)}
                      {m.draft && <span className="ml-auto rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">{t.draft}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t.noMatch}</p>
        )}
      </section>

      {/* 論文 */}
      <section className="mt-14">
        <h2 className="mb-4 flex items-baseline gap-3 text-lg font-medium">
          {t.papers}
          <span className="num text-sm text-muted">{shownPapers.length}</span>
        </h2>
        {shownPapers.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {shownPapers.map((p) => {
              const fd = paperField(p);
              return (
                <li key={p.slug}>
                  <Link href={`/${lang}/research/papers/${p.slug}`} className="group grid h-full grid-cols-[72px_1fr] overflow-hidden rounded-sm border border-line bg-white transition hover:shadow-[0_10px_28px_rgba(0,0,0,.08)]">
                    <span className="grid content-between justify-items-center py-4 text-white" style={{ background: fd.color }}>
                      <span className="num text-[22px] font-extrabold leading-none tracking-[-0.02em]">{p.year}</span>
                      <Icon name={`field-${fd.key}`} className="ico !h-5 !w-5 opacity-80" />
                    </span>
                    <span className="grid content-start gap-2 p-4">
                      <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                        <span className="rounded-sm border border-line px-1.5 py-0.5">{t.kind[p.kind] ?? p.kind}</span>
                        <span>{p.language === "ja" ? t.langJa : t.langEn}</span>
                        {p.draft && <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-amber-900">{t.draft}</span>}
                      </span>
                      <span className="font-semibold leading-snug group-hover:underline">{p.title}</span>
                      {p.original && <span className="line-clamp-1 text-xs text-muted">{p.original}</span>}
                      <span className="line-clamp-1 text-xs text-muted">{p.authors} · {p.venue}</span>
                      <span className="flex flex-wrap gap-1.5 pt-1">
                        {p.methods.map((s) => {
                          const m = methodOf.get(s);
                          if (!m) return null;
                          return (
                            <span key={s} className="flex items-center gap-1 text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: fieldOf(m.field).color }} />
                              {m.name}
                            </span>
                          );
                        })}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t.noMatch}</p>
        )}
      </section>
    </>
  );
}

// 論文を発行年の線の上に点で並べる（同じ年は上に積む）。絞り込みに合わないものは薄く
function Timeline({ papers, match, colorOf, onPick, label }: { papers: BrowserPaper[]; match: (p: BrowserPaper) => boolean; colorOf: (p: BrowserPaper) => string; onPick: (p: BrowserPaper) => void; label: string }) {
  const [hover, setHover] = useState<BrowserPaper | null>(null);
  if (!papers.length) return null;
  const years = papers.map((p) => p.year);
  const y0 = Math.floor((Math.min(...years) - 2) / 10) * 10;
  const y1 = Math.ceil((Math.max(...years) + 2) / 10) * 10;
  const W = 1000, H = 120, PAD = 24, BASE = 92, STEP = 14;
  const x = (y: number) => PAD + ((y - y0) / (y1 - y0)) * (W - PAD * 2);
  const stack = new Map<number, number>();
  const dots = [...papers]
    .sort((a, b) => a.year - b.year)
    .map((p) => {
      const k = stack.get(p.year) ?? 0;
      stack.set(p.year, k + 1);
      return { p, cx: x(p.year), cy: BASE - 10 - k * STEP };
    });
  const decades = Array.from({ length: (y1 - y0) / 10 + 1 }, (_, i) => y0 + i * 10);

  return (
    <figure className="relative mb-8 rounded-sm bg-ink px-2 pt-3 text-white">
      <figcaption className="px-3 text-[11px] tracking-[.12em] text-white/60">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={label}>
        <line x1={PAD} x2={W - PAD} y1={BASE} y2={BASE} stroke="rgba(255,255,255,.35)" />
        {decades.map((d) => (
          <g key={d}>
            <line x1={x(d)} x2={x(d)} y1={BASE - 4} y2={BASE + 4} stroke="rgba(255,255,255,.5)" />
            <text x={x(d)} y={BASE + 20} textAnchor="middle" fontSize="12" fill="rgba(255,255,255,.65)">{d}</text>
          </g>
        ))}
        {dots.map(({ p, cx, cy }) => {
          const on = match(p);
          return (
            <circle
              key={p.slug}
              cx={cx}
              cy={cy}
              r={hover?.slug === p.slug ? 8 : 6}
              fill={colorOf(p)}
              stroke="rgba(255,255,255,.9)"
              strokeWidth="1.5"
              opacity={on ? 1 : 0.18}
              className="cursor-pointer transition-[r,opacity]"
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onPick(p)}
            >
              <title>{`${p.year} ${p.title}`}</title>
            </circle>
          );
        })}
      </svg>
      {hover && (
        <p className="pointer-events-none absolute right-4 top-3 max-w-[60%] truncate text-right text-xs text-white/85">
          <span className="num mr-2">{hover.year}</span>
          {hover.title}
        </p>
      )}
    </figure>
  );
}
