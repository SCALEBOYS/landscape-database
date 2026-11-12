import Link from "next/link";

// 事例 × 制度 の表: 行が事例、列が制度（分野の色で区切る）。記号は関係の種類
export function RuleMatrix({
  lang,
  rows,
  cols,
  roles,
}: {
  lang: string;
  rows: { slug: string; label: string; place: string; cells: Record<string, { role: string; year: number | null; note: string | null }> }[];
  cols: { slug: string; label: string; color: string }[];
  roles: Record<string, { label: string; mark: string; color: string }>;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        {Object.entries(roles).map(([k, r]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span style={{ color: r.color }} className="text-sm">{r.mark}</span>
            {r.label}
          </span>
        ))}
      </div>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[200px] bg-white" />
              {cols.map((c) => (
                <th key={c.slug} className="h-[176px] w-9 border-l border-line p-0 align-bottom" style={{ borderTop: `3px solid ${c.color}` }}>
                  <Link href={`/${lang}/rule/${c.slug}`} className="mx-auto block pb-2 text-left text-[11px] font-medium leading-tight hover:underline [writing-mode:vertical-rl]">
                    {c.label}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-t border-line hover:bg-soft/70">
                <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-normal">
                  <Link href={`/${lang}/projects/${r.slug}`} className="font-medium hover:underline">{r.label}</Link>
                  <span className="block text-[11px] text-muted">{r.place}</span>
                </th>
                {cols.map((c) => {
                  const cell = r.cells[c.slug];
                  const role = cell ? roles[cell.role] : null;
                  return (
                    <td key={c.slug} className="border-l border-line p-0 text-center" title={cell?.note ?? undefined}>
                      {role ? (
                        <span className="grid place-items-center py-1 leading-none">
                          <span style={{ color: role.color }} className="text-base">{role.mark}</span>
                          {cell?.year ? <span className="num mt-0.5 text-[9px] text-muted">{String(cell.year).slice(2)}</span> : null}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 手続きの流れ（スイムレーン）: 行が担い手、列が手順の順番。箱を矢印でつなぐ
export function SwimLane({ steps, actors, actorLabel, color }: { steps: { actor: string; step: string }[]; actors: string[]; actorLabel: (a: string) => string; color: string }) {
  const lanes = actors.filter((a) => steps.some((s) => s.actor === a));
  const W = 168;
  const H = 76;
  const L = 108;
  const BW = W - 30;
  const BH = H - 18;
  const width = L + steps.length * W;
  const height = lanes.length * H;
  const box = (i: number) => {
    const r = lanes.indexOf(steps[i].actor);
    return { x: L + i * W + 8, y: r * H + 9 };
  };
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="relative" style={{ width, height }}>
        {lanes.map((a, r) => (
          <div key={a} className="absolute left-0 flex items-center border-t border-line text-xs font-medium" style={{ top: r * H, height: H, width }}>
            <span className="grid h-full w-[100px] place-items-center px-2 text-center" style={{ background: `${color}14`, color }}>{actorLabel(a)}</span>
          </div>
        ))}
        <div className="absolute left-0 border-t border-line" style={{ top: height, width }} />
        <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
          <defs>
            <marker id="sl-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill={color} />
            </marker>
          </defs>
          {steps.slice(1).map((_, k) => {
            const a = box(k);
            const b = box(k + 1);
            const x1 = a.x + BW;
            const y1 = a.y + BH / 2;
            const x2 = b.x;
            const y2 = b.y + BH / 2;
            const mx = (x1 + x2) / 2;
            return <path key={k} d={`M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2 - 2},${y2}`} fill="none" stroke={color} strokeWidth={1.4} markerEnd="url(#sl-arrow)" />;
          })}
        </svg>
        {steps.map((s, i) => {
          const b = box(i);
          return (
            <div key={i} className="absolute flex items-start gap-1.5 rounded-sm border bg-white p-2 text-[12px] leading-snug shadow-sm" style={{ left: b.x, top: b.y, width: BW, height: BH, borderColor: color }}>
              <span className="num grid h-4 w-4 flex-none place-items-center rounded-full text-[10px] text-white" style={{ background: color }}>{i + 1}</span>
              <span>{s.step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
