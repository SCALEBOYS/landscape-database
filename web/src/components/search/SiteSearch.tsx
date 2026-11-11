"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { siteAiSearch, type SiteAiResult } from "@/app/actions/site-ai-search";
import type { Dictionary } from "@/lib/i18n";
import { type Entry, type Kind, KINDS, keywordSearch } from "@/lib/site-search";

type T = Dictionary["siteSearch"];
const PAGE = 30;
const fmt = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

// サイト内検索。入れた言葉で、事例・樹種・素材・設計・法令・研究・NEWS をまとめて絞る。
// 「意味で探す」を押すと、文章の意味が近いページ（ベクトル検索）を上に出す
export function SiteSearch({ entries, lang, t, ai }: { entries: Entry[]; lang: string; t: T; ai: boolean }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [shown, setShown] = useState(PAGE);
  const [aiResult, setAiResult] = useState<(SiteAiResult & { q: string }) | null>(null);
  const [pending, start] = useTransition();

  const hits = useMemo(() => keywordSearch(entries, q), [entries, q]);
  const counts = useMemo(() => {
    const c = new Map<Kind, number>();
    for (const e of hits) c.set(e.kind, (c.get(e.kind) ?? 0) + 1);
    return c;
  }, [hits]);
  const list = kind === "all" ? hits : hits.filter((e) => e.kind === kind);

  const change = (v: string) => {
    setQ(v);
    setShown(PAGE);
    if (kind !== "all") setKind("all");
  };
  // 検索した言葉は URL に残す（戻る・共有のため）。ページは読み直さない（読み直すと、検索の途中の通信が止まるため）
  const keep = (v: string) => window.history.replaceState(null, "", v.trim() ? `${pathname}?q=${encodeURIComponent(v.trim())}` : pathname);
  const runAi = (v = q) => {
    if (!v.trim()) return;
    keep(v);
    start(async () => setAiResult({ ...(await siteAiSearch(v, lang)), q: v }));
  };

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          keep(q);
        }}
        className="flex flex-wrap items-stretch gap-2 sm:flex-nowrap"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => change(e.target.value)}
          placeholder={t.placeholder}
          aria-label={t.title}
          autoFocus
          maxLength={300}
          className="min-w-0 flex-1 basis-full rounded-[2px] border-2 border-ink bg-white px-4 py-3 text-[15px] outline-none placeholder:text-muted sm:basis-auto"
        />
        <button type="submit" className="flex-1 rounded-[2px] bg-ink px-5 py-3 text-sm font-semibold text-white hover:opacity-90 sm:flex-none">
          {t.submit}
        </button>
        <button
          type="button"
          onClick={() => runAi()}
          disabled={pending || !q.trim()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[2px] border-2 border-accent px-4 py-3 text-sm font-semibold text-accent hover:bg-accent hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent sm:flex-none"
        >
          <span aria-hidden="true">✦</span> {pending ? t.aiWorking : t.ai}
        </button>
      </form>

      {!q.trim() && (
        <div className="mt-4 flex flex-wrap gap-2">
          {t.examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                change(ex);
                if (ai) runAi(ex);
                else keep(ex);
              }}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-ink hover:text-ink"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* 意味が近いページ */}
      {(pending || aiResult) && (
        <section className="mt-8" aria-live="polite">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold tracking-[.12em] text-accent">
            <span aria-hidden="true">✦</span> {t.aiTitle}
            {aiResult && !pending && (
              <button type="button" onClick={() => setAiResult(null)} aria-label="×" className="ml-auto px-1 text-base font-normal text-muted hover:text-ink">×</button>
            )}
          </h2>
          {pending ? (
            <div className="mt-3 grid gap-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-[68px] animate-pulse rounded-[2px] bg-soft" />)}
            </div>
          ) : aiResult && !aiResult.ok ? (
            <p className="ai-note err mt-3">{aiResult.message}</p>
          ) : aiResult?.ok ? (
            <>
              {aiResult.note && <p className="mt-2 text-sm text-muted">{aiResult.note}</p>}
              {aiResult.picks.length ? (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {aiResult.picks.map((p) => (
                    <li key={p.id}>
                      <Row e={p} kindLabel={t.kinds[p.kind]} reason={p.reason} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">{t.aiEmpty}</p>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-muted">{t.aiNote}</p>
            </>
          ) : null}
        </section>
      )}

      {/* キーワードに合うページ */}
      {q.trim() && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold">{hits.length ? fmt(t.results, { q: q.trim(), n: hits.length }) : fmt(t.none, { q: q.trim() })}</h2>
          {hits.length > 0 && (
            <>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(["all", ...KINDS] as const)
                  .filter((k) => k === "all" || counts.get(k))
                  .map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setKind(k);
                        setShown(PAGE);
                      }}
                      aria-pressed={kind === k}
                      className={`rounded-full border px-3 py-1 text-xs ${kind === k ? "border-ink bg-ink text-white" : "border-line text-muted hover:border-ink hover:text-ink"}`}
                    >
                      {k === "all" ? (lang === "en" ? "All" : "すべて") : t.kinds[k]} <span className="num opacity-70">{k === "all" ? hits.length : counts.get(k)}</span>
                    </button>
                  ))}
              </div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {list.slice(0, shown).map((e) => (
                  <li key={e.id}>
                    <Row e={e} kindLabel={t.kinds[e.kind]} />
                  </li>
                ))}
              </ul>
              {list.length > shown && (
                <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-4 w-full rounded-[2px] border border-line py-2.5 text-sm hover:border-ink">
                  {fmt(t.more, { n: list.length - shown })}
                </button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

function Row({ e, kindLabel, reason }: { e: Omit<Entry, "text">; kindLabel: string; reason?: string }) {
  return (
    <Link href={e.href} className="grid h-full grid-cols-[56px_1fr] items-start gap-3 rounded-[2px] border border-line p-2.5 transition hover:border-ink">
      <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-[2px] bg-soft text-[10px] text-muted">
        {e.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          kindLabel
        )}
      </span>
      <span className="min-w-0">
        <span className="text-[10px] font-semibold tracking-[.08em] text-accent">{kindLabel}</span>
        <span className="block truncate text-sm font-semibold">{e.title}</span>
        {e.sub && <span className="block truncate text-xs text-muted">{e.sub}</span>}
        {reason && <span className="mt-1 block text-xs leading-relaxed text-ink/80">✦ {reason}</span>}
      </span>
    </Link>
  );
}
