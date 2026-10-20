"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import type { Ref } from "@/lib/browse";
import { parseRecent, readRecentRaw, type RecentKind } from "@/lib/recent";

type Option = Ref & { n: number };
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

// 最近探したものを先頭に、残りは事例の多い順で、合わせて limit 件まで出す
export function RecentTags({ lang, kind, base, options, limit, recentLabel, empty }: { lang: string; kind: RecentKind; base: string; options: Option[]; limit: number; recentLabel: string; empty: string }) {
  const raw = useSyncExternalStore(subscribe, () => readRecentRaw(kind), () => "");
  const list = useMemo(() => {
    const bySlug = new Map(options.map((o) => [o.slug, o]));
    const recent = parseRecent(raw).flatMap((s) => (bySlug.has(s) ? [{ ...bySlug.get(s)!, recent: true }] : []));
    const rest = options.filter((o) => !recent.some((r) => r.slug === o.slug)).map((o) => ({ ...o, recent: false }));
    return [...recent, ...rest].slice(0, limit);
  }, [raw, options, limit]);

  if (!list.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((r) => (
        <Link key={r.slug} href={`/${lang}/${base}/${r.slug}`} className={`rounded-sm border px-3 py-1.5 text-[13px] hover:border-ink ${r.recent ? "border-ink/50" : "border-line"}`}>
          {r.recent && <span className="mr-1.5 text-[10px] tracking-[.08em] text-accent">{recentLabel}</span>}
          {r.label}
          {r.sub && <i className="ml-1 text-muted">{r.sub}</i>}
          {r.n > 0 && <span className="ml-1.5 text-[11px] text-muted">{r.n}</span>}
        </Link>
      ))}
    </div>
  );
}
