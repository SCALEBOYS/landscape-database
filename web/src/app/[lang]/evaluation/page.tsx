import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EvalBoard, type BoardPoint } from "@/components/evaluation/EvalBoard";
import { AXES, AXIS_GROUPS, EVAL_T, getEvaluations } from "@/lib/evaluation";
import { hasLocale } from "@/lib/i18n";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/evaluation">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = EVAL_T[lang];
  return { title: `${t.title} — ${t.sub}`, description: t.lead, alternates: alternates(lang, "/evaluation") };
}

// 評価の軸: 受賞の講評で何が評価されたかを、軸ごとに図で見る
export default async function EvaluationPage({ params }: PageProps<"/[lang]/evaluation">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = EVAL_T[lang];
  const en = lang === "en";
  const rows = await getEvaluations();
  const name = (x: { name_ja: string; name_en: string | null }) => (en ? x.name_en ?? x.name_ja : x.name_ja);

  const axes = AXES.map((a) => ({ key: a.key, label: a[lang], desc: en ? a.desc_en : a.desc_ja, group: a.group, color: AXIS_GROUPS[a.group].color, tint: AXIS_GROUPS[a.group].tint }));
  const groups = Object.entries(AXIS_GROUPS).map(([key, g]) => ({ key, label: g[lang], color: g.color }));
  const points: BoardPoint[] = [...rows]
    .sort((a, b) => (a.project.completed_year ?? 9999) - (b.project.completed_year ?? 9999) || a.project.slug.localeCompare(b.project.slug) || a.sort_order - b.sort_order)
    .map((r) => ({
      axis: r.axis,
      stance: r.stance,
      text: en ? r.point_en ?? r.point_ja : r.point_ja,
      source: r.source_url,
      program: r.program ? name(r.program) : null,
      project: r.project.slug,
      projectLabel: name(r.project),
      place: `${r.project.municipality ?? r.project.prefecture}${r.project.completed_year ? `・${r.project.completed_year}` : ""}`,
    }));

  // 賞ごとの傾向
  const programs = new Map<string, { label: string; total: number; projects: Set<string>; by: Map<string, number> }>();
  for (const r of rows) {
    if (!r.program || r.stance !== "valued") continue;
    const cur = programs.get(r.program.slug) ?? { label: name(r.program), total: 0, projects: new Set<string>(), by: new Map<string, number>() };
    cur.total++;
    cur.projects.add(r.project.slug);
    cur.by.set(r.axis, (cur.by.get(r.axis) ?? 0) + 1);
    programs.set(r.program.slug, cur);
  }
  const progList = [...programs.values()].sort((a, b) => b.total - a.total);

  const stats = [
    [rows.filter((r) => r.stance === "valued").length, t.stats.points],
    [rows.filter((r) => r.stance === "concern").length, t.stats.concerns],
    [new Set(rows.map((r) => r.project.slug)).size, t.stats.projects],
    [programs.size, t.stats.programs],
  ] as const;

  return (
    <>
      <div className="bg-ink text-white">
        <div className="wrap grid gap-6 py-12 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow !text-white/60">{t.sub}</p>
            <h1 className="mt-2 text-[clamp(36px,6vw,56px)] font-extrabold leading-none tracking-[-0.03em]">{t.title}</h1>
            <p className="mt-4 max-w-[44em] text-sm leading-[1.9] text-white/80">{t.lead}</p>
          </div>
          <dl className="grid grid-cols-4 gap-3">
            {stats.map(([v, k]) => (
              <div key={k} className="grid gap-1 border-l border-white/20 pl-3">
                <dd className="num order-1 text-[clamp(20px,2.4vw,30px)] font-extrabold leading-none">{v}</dd>
                <dt className="order-2 text-[11px] text-white/60">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
        <nav className="wrap flex gap-5 overflow-x-auto pb-4 text-sm text-white/70">
          {[["overview", t.overview], ["matrix", t.matrix], ["words", t.words], ["programs", t.programs]].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="whitespace-nowrap hover:text-white">{label}</a>
          ))}
        </nav>
      </div>

      <div className="wrap pt-12">
        <EvalBoard
          lang={lang}
          axes={axes}
          groups={groups}
          points={points}
          labels={{ overview: t.overview, overviewLead: t.overviewLead, matrix: t.matrix, matrixLead: t.matrixLead, words: t.words, wordsLead: t.wordsLead, valued: t.valued, concern: t.concern, all: t.all, source: t.source }}
        />
      </div>

      <section id="programs" className="wrap scroll-mt-20 pt-16">
        <h2 className="text-2xl font-bold">{t.programs}</h2>
        <p className="mb-5 mt-2 max-w-[52em] text-sm leading-[1.8] text-muted">{t.programsLead}</p>
        <div className="grid gap-5 md:grid-cols-3">
          {progList.map((p) => {
            const max = Math.max(...p.by.values());
            return (
              <article key={p.label} className="rounded-sm border border-line p-4">
                <h3 className="font-semibold">{p.label}</h3>
                <p className="num mb-3 text-xs text-muted">{en ? `${p.projects.size} projects, ${p.total} points` : `${p.projects.size} 事例・${p.total} 点`}</p>
                <div className="grid gap-1.5">
                  {axes.map((a) => {
                    const n = p.by.get(a.key) ?? 0;
                    return (
                      <div key={a.key} className="grid grid-cols-[9.5em_1fr_1.5em] items-center gap-2 text-xs">
                        <span className={n ? "" : "text-muted"}>{a.label}</span>
                        <span className="h-2 bg-soft"><span className="block h-2" style={{ width: `${(n / max) * 100}%`, background: a.color }} /></span>
                        <span className="num text-right text-muted">{n || ""}</span>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-muted">{t.note}</p>
      </section>
    </>
  );
}
