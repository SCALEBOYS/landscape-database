"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

// 制度の地図: 分野ごとの列に、法律 → 制度 → 条例 を並べ、根拠の線でつなぐ。やりたいこと・分野・名前で絞り込む
export type MapNode = { slug: string; kind: "law" | "system" | "ordinance"; label: string; full: string; topic: string; basis: string | null; purposes: string[]; uses: number; year: number | null };
type Topic = { key: string; label: string; color: string; tint: string };
type Labels = { purposes: string; topics: string; all: string; search: string; kinds: Record<string, string>; projects: string };

export function RuleMap({ lang, nodes, topics, purposes, labels }: { lang: string; nodes: MapNode[]; topics: Topic[]; purposes: { key: string; label: string }[]; labels: Labels }) {
  const [purpose, setPurpose] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ d: string; on: boolean; color: string }[]>([]);

  const hit = useMemo(() => {
    const k = q.trim().toLowerCase();
    return new Set(nodes.filter((n) => (!purpose || n.purposes.includes(purpose)) && (!topic || n.topic === topic) && (!k || n.full.toLowerCase().includes(k) || n.label.toLowerCase().includes(k))).map((n) => n.slug));
  }, [nodes, purpose, topic, q]);
  const filtering = !!(purpose || topic || q.trim());
  // 絞り込んだ制度の根拠となる法律も、薄くせずに見せる
  const keep = useMemo(() => {
    const s = new Set(hit);
    for (const n of nodes) if (hit.has(n.slug) && n.basis) s.add(n.basis);
    return s;
  }, [hit, nodes]);

  // 箱の位置を測って、根拠の線を引く
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const draw = () => {
      const base = el.getBoundingClientRect();
      const pos = new Map<string, DOMRect>();
      el.querySelectorAll<HTMLElement>("[data-node]").forEach((n) => pos.set(n.dataset.node!, n.getBoundingClientRect()));
      const next: { d: string; on: boolean; color: string }[] = [];
      for (const n of nodes) {
        if (!n.basis) continue;
        const a = pos.get(n.basis);
        const b = pos.get(n.slug);
        if (!a || !b) continue;
        const x1 = a.left + a.width / 2 - base.left;
        const y1 = a.bottom - base.top;
        const x2 = b.left + b.width / 2 - base.left;
        const y2 = b.top - base.top;
        const my = (y1 + y2) / 2;
        next.push({ d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`, on: !filtering || hit.has(n.slug), color: topics.find((t) => t.key === n.topic)?.color ?? "#999" });
      }
      setLines(next);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nodes, hit, filtering, topics]);

  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs transition ${on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`;
  const tiers: MapNode["kind"][] = ["law", "system", "ordinance"];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted">{labels.purposes}</span>
          <button type="button" className={chip(!purpose)} onClick={() => setPurpose(null)}>{labels.all}</button>
          {purposes.map((p) => (
            <button key={p.key} type="button" className={chip(purpose === p.key)} onClick={() => setPurpose(purpose === p.key ? null : p.key)}>{p.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted">{labels.topics}</span>
          {topics.map((t) => (
            <button key={t.key} type="button" onClick={() => setTopic(topic === t.key ? null : t.key)} className={chip(topic === t.key)} style={topic === t.key ? { background: t.color, borderColor: t.color } : undefined}>
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: topic === t.key ? "#fff" : t.color }} />
              {t.label}
            </button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.search} className="ml-auto w-full rounded-full border border-line px-3 py-1 text-sm outline-none focus:border-ink sm:w-56" />
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto overflow-y-hidden px-4 pb-2 sm:mx-0 sm:px-0">
        <div ref={box} className="relative grid min-w-[980px] gap-x-3" style={{ gridTemplateColumns: `72px repeat(${topics.length}, minmax(0, 1fr))` }}>
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            {lines.map((l, i) => (
              <path key={i} d={l.d} fill="none" stroke={l.color} strokeWidth={l.on ? 1.4 : 1} strokeOpacity={l.on ? 0.65 : 0.12} />
            ))}
          </svg>
          {/* 列見出し */}
          <div />
          {topics.map((t) => (
            <div key={t.key} className="border-b-[3px] pb-1.5 text-xs font-semibold" style={{ borderColor: t.color, color: t.color }}>{t.label}</div>
          ))}
          {tiers.map((tier) => (
            <Tier key={tier} tier={tier} label={labels.kinds[tier]} topics={topics} nodes={nodes} lang={lang} keep={keep} hit={hit} filtering={filtering} labels={labels} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Tier({ tier, label, topics, nodes, lang, keep, hit, filtering, labels }: { tier: MapNode["kind"]; label: string; topics: Topic[]; nodes: MapNode[]; lang: string; keep: Set<string>; hit: Set<string>; filtering: boolean; labels: Labels }) {
  return (
    <>
      <div className="text-[11px] font-medium tracking-wider text-muted" style={{ paddingTop: tier === "law" ? 16 : 40 }}>{label}</div>
      {topics.map((t) => (
        <div key={t.key} className="grid content-start gap-2" style={{ paddingTop: tier === "law" ? 16 : 40 }}>
          {nodes
            .filter((n) => n.kind === tier && n.topic === t.key)
            .map((n) => {
              const dim = filtering && !keep.has(n.slug);
              const strong = filtering && hit.has(n.slug);
              return (
                <Link
                  key={n.slug}
                  data-node={n.slug}
                  href={`/${lang}/rule/${n.slug}`}
                  title={n.full}
                  className={`group relative block rounded-sm border bg-white px-2 py-1.5 text-[12px] leading-snug transition hover:-translate-y-px hover:shadow ${dim ? "opacity-20" : ""}`}
                  style={{ borderColor: strong ? t.color : tier === "law" ? t.color : "var(--line)", background: tier === "law" ? t.tint : "#fff", boxShadow: strong ? `0 0 0 1px ${t.color}` : undefined }}
                >
                  <span className={tier === "law" ? "font-semibold" : ""}>{n.label}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted">
                    {n.year ? <span className="num">{n.year}</span> : null}
                    {n.uses ? (
                      <span className="ml-auto inline-flex items-center gap-0.5" title={labels.projects.replace("{n}", String(n.uses))} style={{ color: t.color }}>
                        {Array.from({ length: Math.min(n.uses, 5) }, (_, i) => <span key={i} className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />)}
                        {n.uses > 5 ? <span className="num">+{n.uses - 5}</span> : null}
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
        </div>
      ))}
    </>
  );
}
