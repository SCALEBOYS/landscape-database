// 年表: 分野ごとの帯に、法律（●）と制度（◆）をできた年に置き、影響の矢印でつなぐ。下の段は事例の完成年と、使った制度への線（マウスを重ねると強調）
export type TLItem = { slug: string; label: string; full: string; kind: "law" | "system" | "ordinance"; topic: string; year: number; milestones: { year: number; label: string }[] };
export type TLProject = { slug: string; label: string; year: number; laws: { slug: string; role: string }[] };
type Topic = { key: string; label: string; color: string; tint: string };

const GUTTER = 112; // 帯の名前
const EARLY = 48; // 1945年より前をまとめて縮めて描く幅
const PX = 13; // 1年の幅
const START = 1945;
const END = 2028;
const ROW = 22;
const CH = 11.5; // 文字の幅の目安

const xOf = (y: number) => (y < START ? GUTTER + ((Math.max(y, 1885) - 1885) / (START - 1885)) * EARLY : GUTTER + EARLY + (y - START) * PX);

// 名前が重ならないよう、帯の中で段を分ける
function pack<T extends { year: number; label: string }>(items: T[]) {
  const ends: number[] = [];
  return [...items]
    .sort((a, b) => a.year - b.year)
    .map((it) => {
      const x = xOf(it.year);
      const w = 14 + it.label.length * CH;
      let row = ends.findIndex((e) => e < x - 4);
      if (row < 0) row = ends.length;
      ends[row] = x + w;
      return { ...it, x, row };
    });
}

export function RuleTimeline({ lang, items, links, projects, topics, roleColor, projectLabel }: { lang: string; items: TLItem[]; links: { from: string; to: string; note: string | null }[]; projects: TLProject[]; topics: Topic[]; roleColor: Record<string, string>; projectLabel: string }) {
  const lanes: { topic: Topic; top: number; h: number; placed: (TLItem & { x: number; row: number })[] }[] = [];
  let y = 28;
  for (const t of topics) {
    const placed = pack(items.filter((i) => i.topic === t.key));
    const rows = Math.max(1, ...placed.map((p) => p.row + 1));
    const h = rows * ROW + 14;
    lanes.push({ topic: t, top: y, h, placed });
    y += h + 4;
  }
  const pos = new Map<string, { x: number; y: number; color: string }>();
  for (const l of lanes) for (const p of l.placed) pos.set(p.slug, { x: p.x, y: l.top + 10 + p.row * ROW + 6, color: l.topic.color });

  const projTop = y + 26;
  const projPlaced = pack(projects);
  const projRows = Math.max(1, ...projPlaced.map((p) => p.row + 1));
  const height = projTop + projRows * ROW + 30;
  const width = xOf(END) + 40;
  const ticks = [];
  for (let yr = 1950; yr <= 2025; yr += 5) ticks.push(yr);

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block text-[11px]" role="img" aria-label="timeline">
        <defs>
          <marker id="tl-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="#555" />
          </marker>
        </defs>
        {/* 目盛り */}
        {ticks.map((yr) => (
          <g key={yr}>
            <line x1={xOf(yr)} x2={xOf(yr)} y1={20} y2={height - 18} stroke={yr % 10 === 0 ? "#d9d9d6" : "#efefec"} />
            {yr % 10 === 0 ? <text x={xOf(yr)} y={14} textAnchor="middle" fill="#5f615c" className="num">{yr}</text> : null}
          </g>
        ))}
        <text x={GUTTER + EARLY / 2} y={14} textAnchor="middle" fill="#5f615c">〜1945</text>
        <line x1={GUTTER + EARLY} x2={GUTTER + EARLY} y1={20} y2={height - 18} stroke="#5f615c" strokeDasharray="2 3" />

        {/* 分野の帯 */}
        {lanes.map((l) => (
          <g key={l.topic.key}>
            <rect x={GUTTER} y={l.top} width={width - GUTTER - 20} height={l.h} fill={l.topic.tint} opacity={0.55} />
            <rect x={0} y={l.top} width={4} height={l.h} fill={l.topic.color} />
            <text x={12} y={l.top + 16} fill={l.topic.color} fontWeight={600}>{l.topic.label}</text>
          </g>
        ))}

        {/* 影響の矢印 */}
        {links.map((k) => {
          const a = pos.get(k.from);
          const b = pos.get(k.to);
          if (!a || !b) return null;
          const mx = (a.x + b.x) / 2;
          const lift = Math.min(60, Math.abs(b.x - a.x) / 3 + 14);
          return (
            <path key={`${k.from}-${k.to}`} d={`M${a.x},${a.y} Q${mx},${Math.min(a.y, b.y) - lift} ${b.x - 6},${b.y}`} fill="none" stroke="#555" strokeWidth={1} strokeDasharray="3 2" markerEnd="url(#tl-arrow)" opacity={0.55}>
              <title>{k.note ?? ""}</title>
            </path>
          );
        })}

        {/* 法律・制度 */}
        {lanes.map((l) =>
          l.placed.map((p) => {
            const cy = l.top + 10 + p.row * ROW + 6;
            return (
              <a key={p.slug} href={`/${lang}/rule/${p.slug}`} className="[&:hover_text]:underline">
                <title>{`${p.full}（${p.year}）`}</title>
                {p.milestones
                  .filter((m) => m.year !== p.year)
                  .map((m) => (
                    <g key={m.year + m.label}>
                      <line x1={xOf(m.year)} x2={xOf(m.year)} y1={cy - 5} y2={cy + 5} stroke={l.topic.color} strokeWidth={2} opacity={0.6}>
                        <title>{`${m.year} ${m.label}`}</title>
                      </line>
                    </g>
                  ))}
                {p.kind === "law" ? (
                  <circle cx={p.x} cy={cy} r={5} fill={l.topic.color} />
                ) : (
                  <path d={`M${p.x},${cy - 5.5} L${p.x + 5.5},${cy} L${p.x},${cy + 5.5} L${p.x - 5.5},${cy} z`} fill="#fff" stroke={l.topic.color} strokeWidth={1.6} />
                )}
                <text x={p.x + 9} y={cy + 4} fill="#0a0a0a" fontWeight={p.kind === "law" ? 600 : 400}>{p.label}</text>
              </a>
            );
          }),
        )}

        {/* 事例 */}
        <text x={12} y={projTop - 10} fill="#0a0a0a" fontWeight={600}>{projectLabel}</text>
        <line x1={GUTTER} x2={width - 20} y1={projTop - 8} y2={projTop - 8} stroke="#0a0a0a" />
        {/* 事例と、使った制度への線（ふだんは薄く、事例にマウスを重ねると強調） */}
        <style>{`.tlp .ln{opacity:.14;transition:opacity .15s}.tlp:hover .ln{opacity:.95;stroke-width:1.8}svg:has(.tlp:hover) .tlp:not(:hover){opacity:.35}`}</style>
        {projPlaced.map((p) => {
          const cy = projTop + p.row * ROW + 6;
          return (
            <a key={p.slug} href={`/${lang}/projects/${p.slug}`} className="tlp">
              <title>{`${p.label}（${p.year}）`}</title>
              {p.laws.map((l) => {
                const b = pos.get(l.slug);
                if (!b) return null;
                return <path key={l.slug} className="ln" d={`M${p.x},${cy} C${p.x},${cy - 60} ${b.x},${b.y + 60} ${b.x},${b.y}`} fill="none" stroke={roleColor[l.role] ?? "#999"} strokeWidth={1} pointerEvents="none" />;
              })}
              <rect x={p.x - 4} y={cy - 4} width={8} height={8} fill="#0a0a0a" />
              <text x={p.x + 8} y={cy + 4} fill="#0a0a0a">{p.label}</text>
            </a>
          );
        })}
      </svg>
    </div>
  );
}
