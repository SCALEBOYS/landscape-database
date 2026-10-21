"use client";

import type ForceGraph from "force-graph";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { NODE_TYPES, type GraphData, type GraphLink, type GraphNode, type NodeType } from "@/lib/graph-types";
import { fmt, type GraphText } from "@/lib/i18n";

// 黒い背景の上で見分けやすい色。事例は参考画像にならって桃色
const COLORS: Record<NodeType, string> = {
  project: "#ff6fae",
  designer: "#6aa8ff",
  species: "#6fdc8c",
  law: "#f5c451",
  paper: "#f2f2a0",
  method: "#ffd1e8",
  use: "#c48bff",
  element: "#4fd6d6",
  award: "#ff9a5a",
  tag: "#e6e6e6",
  pref: "#9aa0a6",
  decade: "#b9c2cc",
};

type SimNode = GraphNode & { x?: number; y?: number };
type SimLink = Omit<GraphLink, "source" | "target"> & { source: string | SimNode; target: string | SimNode };
type Mode = "structure" | "similar";

const radius = (n: GraphNode) => (n.type === "project" ? 4 + Math.sqrt(n.degree) * 1.1 : 2.5 + Math.sqrt(n.degree) * 1.7);
const endId = (v: string | SimNode) => (typeof v === "string" ? v : v.id);
// 中心表示で出す丸の上限（2段先まで広げると多くなりすぎるため）
const FOCUS_LIMIT = 160;

export function GraphView({ data, t }: { data: GraphData; t: GraphText }) {
  const box = useRef<HTMLDivElement>(null);
  const fg = useRef<ForceGraph<SimNode, SimLink> | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("structure");
  const [hidden, setHidden] = useState<Set<NodeType>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState(false);
  const [q, setQ] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [topTab, setTopTab] = useState<NodeType>("designer");

  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data]);
  // 位置を覚えておくため、描画用の丸は作り直さずに使い回す
  const simNodes = useMemo(() => new Map<string, SimNode>(data.nodes.map((n) => [n.id, { ...n }])), [data]);
  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of data.links) {
      if (l.kind === "similar" && mode !== "similar") continue;
      for (const [a, b] of [[l.source, l.target], [l.target, l.source]]) {
        if (!m.has(a)) m.set(a, new Set());
        m.get(a)!.add(b);
      }
    }
    return m;
  }, [data, mode]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(NODE_TYPES.map((k) => [k, 0])) as Record<NodeType, number>;
    for (const n of data.nodes) c[n.type]++;
    return c;
  }, [data]);

  // 全体表示か、選んだ丸から2段先までの中心表示か
  const view = useMemo(() => {
    let ids: Set<string>;
    if (focus && selected) {
      ids = new Set([selected]);
      const first = neighbors.get(selected) ?? new Set<string>();
      first.forEach((id) => ids.add(id));
      for (const a of first) for (const b of neighbors.get(a) ?? []) if (ids.size < FOCUS_LIMIT) ids.add(b);
    } else {
      ids = new Set(data.nodes.map((n) => n.id));
    }
    ids = new Set([...ids].filter((id) => id === selected || !hidden.has(byId.get(id)!.type)));
    const links: SimLink[] = data.links
      .filter((l) => (l.kind === "has" || mode === "similar") && ids.has(l.source) && ids.has(l.target))
      .map((l) => ({ ...l }));
    return { nodes: [...ids].map((id) => simNodes.get(id)!), links };
  }, [data, byId, simNodes, neighbors, focus, selected, hidden, mode]);

  // 描画の関数は一度だけ渡すので、選択などの最新の状態は ref から読む
  const live = useRef({ selected, hover, q: "", neighbors, focus });
  useEffect(() => {
    live.current = { selected, hover, q: q.trim().toLowerCase(), neighbors, focus };
  });

  useEffect(() => {
    if (!box.current) return;
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    import("force-graph").then(({ default: ForceGraphCtor }) => {
      if (cancelled || !box.current) return;
      const el = box.current;
      const g = new ForceGraphCtor<SimNode, SimLink>(el)
        .backgroundColor("#0f0f0f")
        .nodeId("id")
        .nodeRelSize(1)
        .nodeVal((n) => radius(n) ** 2)
        .nodeLabel(() => "")
        .autoPauseRedraw(false)
        .cooldownTicks(200)
        .nodeCanvasObject((n, ctx, scale) => {
          const s = live.current;
          const nb = s.selected ? s.neighbors.get(s.selected) : undefined;
          const near = n.id === s.selected || nb?.has(n.id);
          const match = s.q !== "" && n.label.toLowerCase().includes(s.q);
          const dim = (s.selected && !s.focus && !near) || (s.q !== "" && !match && !near);
          const r = radius(n);
          ctx.globalAlpha = dim ? 0.18 : 1;
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI);
          ctx.fillStyle = COLORS[n.type];
          ctx.fill();
          if (n.id === s.selected || match) {
            ctx.lineWidth = 2 / scale;
            ctx.strokeStyle = n.id === s.selected ? "#ffffff" : "#ffe066";
            ctx.stroke();
          }
          // 名前は拡大したとき・選んだ丸のまわり・よくつながる分類だけに出して、文字で埋まらないようにする
          const showLabel = scale > 2.2 || near || match || n.id === s.hover || (n.type !== "project" && n.degree >= 4 && scale > 0.9);
          if (showLabel) {
            const size = Math.max(10 / scale, 1.5);
            ctx.font = `${n.id === s.selected ? 600 : 400} ${size}px "Noto Sans JP", sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = dim ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.88)";
            const text = n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label;
            ctx.fillText(text, n.x!, n.y! + r + 2 / scale);
          }
          ctx.globalAlpha = 1;
        })
        .linkColor((l) => {
          const s = live.current;
          const touches = s.selected && (endId(l.source) === s.selected || endId(l.target) === s.selected);
          if (l.kind === "similar") return `rgba(255,140,90,${0.25 + 0.6 * l.weight})`;
          return touches ? "rgba(255,255,255,0.55)" : s.selected && !s.focus ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.16)";
        })
        .linkWidth((l) => (l.kind === "similar" ? 0.6 + 2.4 * l.weight : 0.6))
        .onNodeHover((n) => {
          el.style.cursor = n ? "pointer" : "grab";
          setHover(n?.id ?? null);
        })
        .onNodeClick((n) => {
          setSelected(n.id);
          setFocus(true);
        });
      g.d3Force("charge")?.strength(-45);
      g.d3Force("link")?.distance((l: SimLink) => (l.kind === "similar" ? 55 : 28));
      const fit = () => g.width(el.clientWidth).height(el.clientHeight);
      fit();
      ro = new ResizeObserver(fit);
      ro.observe(el);
      fg.current = g;
      setReady(true);
      // スマホでは中心表示から始める（最新の事例を中心に）
      const first = window.matchMedia("(max-width: 767px)").matches && data.nodes.find((n) => n.type === "project");
      if (first) {
        setSelected(first.id);
        setFocus(true);
      }
    });
    return () => {
      cancelled = true;
      ro?.disconnect();
      fg.current?._destructor();
      fg.current = null;
    };
  }, [data]);

  // 表示する丸と線が変わったら差し替え、落ち着いたら全体が収まるように拡大率を合わせる
  useEffect(() => {
    const g = fg.current;
    if (!g || !ready) return;
    g.graphData(view);
    g.d3ReheatSimulation();
    let done = false;
    g.onEngineStop(() => {
      if (done) return;
      done = true;
      g.zoomToFit(600, 50);
      // 丸が少ないと拡大しすぎるので、上限を決めておく
      setTimeout(() => {
        if (g.zoom() > 2.2) g.zoom(2.2, 400);
      }, 650);
    });
  }, [view, ready]);

  const node = selected ? byId.get(selected) : undefined;
  const needle = q.trim().toLowerCase();
  const results = needle ? data.nodes.filter((n) => n.label.toLowerCase().includes(needle) || n.sub?.toLowerCase().includes(needle)).slice(0, 12) : [];
  const toggleType = (k: NodeType) => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const pick = (id: string) => { setSelected(id); setFocus(true); setQ(""); };
  const top = (k: NodeType) => data.nodes.filter((n) => n.type === k).sort((a, b) => b.degree - a.degree).slice(0, 5);
  const topTypes = (["designer", "species", "law", "award", "element", "method"] as const).filter((k) => counts[k] > 0);
  const topTabShown: NodeType = topTypes.includes(topTab as (typeof topTypes)[number]) ? topTab : topTypes[0] ?? "designer";
  const grouped = node
    ? NODE_TYPES.map((k) => ({ k, items: [...(neighbors.get(node.id) ?? [])].map((id) => byId.get(id)!).filter((n) => n.type === k).sort((a, b) => b.degree - a.degree) })).filter((g) => g.items.length)
    : [];

  return (
    <div className="graph-page relative grid h-[calc(100dvh-var(--hdr))] min-h-[520px] grid-rows-[auto_1fr] overflow-hidden bg-[#0f0f0f] text-white md:grid-cols-[256px_minmax(0,1fr)] md:grid-rows-1 lg:grid-cols-[272px_minmax(0,1fr)_340px]">
      {/* 左: 検索・種類の切り替え・つながりの多い項目 */}
      <aside className="z-10 grid min-w-0 content-start gap-3 overflow-x-hidden border-b border-white/10 p-3 [scrollbar-color:rgba(255,255,255,.18)_transparent] [scrollbar-width:thin] md:overflow-y-auto md:border-b-0 md:border-r md:p-4">
        <div className="hidden md:block">
          <h1 className="text-xl font-bold">{t.title}</h1>
          <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-white/55">{t.lead}</p>
        </div>
        <div className="relative">
          <label className="flex items-center gap-2 rounded border border-white/20 bg-white/5 px-3 py-2 text-sm">
            <Icon name="search" className="ico !h-4 !w-4 opacity-70" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/40" />
          </label>
          {needle && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded border border-white/15 bg-[#1a1a1a] py-1 text-sm shadow-xl">
              {results.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => pick(n.id)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-white/10">
                    <span className="h-2 w-2 flex-none rounded-full" style={{ background: COLORS[n.type] }} />
                    <span className="truncate">{n.label}</span>
                    <span className="ml-auto flex-none text-[11px] text-white/45">{t.types[n.type]}</span>
                  </button>
                </li>
              ))}
              {!results.length && <li className="px-3 py-1.5 text-white/50">{t.noMatch}</li>}
            </ul>
          )}
        </div>
        <div className="flex gap-1 rounded border border-white/15 p-0.5 text-xs" role="group" aria-label={t.modeLabel}>
          {(["structure", "similar"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`flex-1 rounded px-2 py-1.5 ${mode === m ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>
              {t[m]}
            </button>
          ))}
        </div>
        {/* 種類の表示・非表示。折り返すチップにして、縦に長くしない */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
          {NODE_TYPES.filter((k) => counts[k] > 0 || k === "tag").map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={!hidden.has(k)}
              disabled={!counts[k]}
              onClick={() => toggleType(k)}
              title={k === "tag" && !counts[k] ? t.tagsComing : undefined}
              className={`flex flex-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-xs ${hidden.has(k) || !counts[k] ? "border-white/10 text-white/35" : "border-white/20 text-white/90"} hover:border-white/50 disabled:cursor-default disabled:hover:border-white/10`}
            >
              <span className="h-2 w-2 flex-none rounded-full" style={{ background: hidden.has(k) || !counts[k] ? "transparent" : COLORS[k], border: `1.5px solid ${COLORS[k]}` }} />
              {t.types[k]}
              <span className="text-[10px] text-white/45 tabular-nums">{counts[k]}</span>
            </button>
          ))}
        </div>
        {/* つながりの多い項目。種類はタブで切り替えて、上位5件だけ出す */}
        {topTypes.length > 0 && (
          <div className="hidden border-t border-white/10 pt-3 md:block">
            <p className="mb-2 text-[11px] tracking-[.08em] text-white/45">{t.topLabel}</p>
            <div className="mb-2 flex flex-wrap gap-1" role="tablist">
              {topTypes.map((k) => (
                <button key={k} type="button" role="tab" aria-selected={topTabShown === k} onClick={() => setTopTab(k)} className={`rounded px-2 py-0.5 text-[11px] ${topTabShown === k ? "bg-white text-black" : "text-white/60 hover:text-white"}`}>
                  {t.types[k]}
                </button>
              ))}
            </div>
            <ul className="grid gap-0.5 text-[13px]">
              {top(topTabShown).map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => pick(n.id)} className="flex w-full min-w-0 items-center gap-2 rounded px-1.5 py-1 text-left text-white/80 hover:bg-white/5 hover:text-white">
                    <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: COLORS[n.type] }} />
                    <span className="min-w-0 truncate">{n.label}</span>
                    <span className="ml-auto flex-none text-[11px] text-white/40 tabular-nums">{n.degree}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* 中央: 図 */}
      <div className="relative min-h-0 min-w-0 overflow-hidden">
        <div ref={box} className="absolute inset-0" />
        <div className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-white/45 tabular-nums">
          {fmt(t.nodes, view.nodes.length)} · {fmt(t.links, view.links.length)}
        </div>
        {focus && (
          <button type="button" onClick={() => setFocus(false)} className="absolute left-3 top-3 rounded border border-white/25 bg-black/60 px-3 py-1.5 text-xs backdrop-blur hover:bg-white hover:text-black">
            {t.backToAll}
          </button>
        )}
      </div>

      {/* 右: 選んだ丸の詳細（スマホでは下から出るシート） */}
      <aside
        className={`fixed inset-x-0 bottom-0 z-20 max-h-[55dvh] overflow-y-auto rounded-t-2xl border-t border-white/15 bg-[#151515] p-5 shadow-[0_-10px_30px_rgba(0,0,0,.5)] transition-transform [scrollbar-color:rgba(255,255,255,.18)_transparent] [scrollbar-width:thin] md:absolute md:inset-x-auto md:bottom-0 md:right-0 md:top-0 md:w-[340px] md:max-h-none md:translate-y-0 md:rounded-none md:border-l md:border-t-0 md:shadow-[-10px_0_30px_rgba(0,0,0,.45)] lg:static lg:w-auto lg:translate-x-0 lg:shadow-none ${node ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full"}`}
      >
        {node ? (
          <div className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2 text-[11px] uppercase tracking-[.12em] text-white/55">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[node.type] }} />
                {t.types[node.type]}
              </span>
              <button type="button" onClick={() => setSelected(null)} aria-label={t.close} className="text-white/60 hover:text-white">
                <Icon name="x" className="ico !h-5 !w-5" />
              </button>
            </div>
            <h2 className="text-2xl font-bold leading-tight">{node.label}</h2>
            {node.sub && <p className="-mt-2 text-sm text-white/60">{node.sub}</p>}
            {node.img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={node.img} alt="" className="aspect-[16/10] w-full rounded object-cover" />
            )}
            {node.summary && <p className="text-sm leading-[1.8] text-white/80">{node.summary}</p>}
            {node.href && (
              <Link href={node.href} className="inline-flex items-center gap-1.5 justify-self-start rounded bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-white/85">
                {t.openPage} <Icon name="arrow" className="ico !h-4 !w-4" />
              </Link>
            )}
            <div className="grid gap-3 border-t border-white/10 pt-4">
              <h3 className="text-[11px] uppercase tracking-[.12em] text-white/45">{t.connections}</h3>
              {grouped.map(({ k, items }) => (
                <div key={k}>
                  <p className="mb-1 text-xs text-white/50">{t.types[k]}（{items.length}）</p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((n) => (
                      <button key={n.id} type="button" onClick={() => pick(n.id)} className="flex items-center gap-1.5 rounded border border-white/15 px-2 py-1 text-xs text-white/85 hover:border-white/50">
                        <span className="h-2 w-2 rounded-full" style={{ background: COLORS[n.type] }} />
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="hidden gap-3 text-sm leading-relaxed text-white/55 lg:grid">
            <p>{t.hint}</p>
            <p className="text-xs text-white/40">{t.tagsComing}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
