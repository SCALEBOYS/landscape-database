import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RuleMap, type MapNode } from "@/components/rule/RuleMap";
import { RuleMatrix } from "@/components/rule/RuleParts";
import { RuleTimeline, type TLItem, type TLProject } from "@/components/rule/RuleTimeline";
import { hasLocale } from "@/lib/i18n";
import { getRule, lawName, lawShort, PURPOSES, ROLE_COLORS, ROLES, RULE_T, TOPICS, topicOf } from "@/lib/rule";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/rule">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = RULE_T[lang];
  return { title: `${t.title} — ${t.sub}`, description: t.lead, alternates: alternates(lang, "/rule") };
}

export default async function RulePage({ params }: PageProps<"/[lang]/rule">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = RULE_T[lang];
  const { laws, links, uses, papers } = await getRule();
  const useCount = new Map<string, number>();
  for (const u of uses) useCount.set(u.law, (useCount.get(u.law) ?? 0) + 1);
  const bySlug = new Map(laws.map((l) => [l.slug, l]));
  const topics = TOPICS.map((x) => ({ key: x.key, label: x[lang], color: x.color, tint: x.tint }));

  const nodes: MapNode[] = laws.map((l) => ({
    slug: l.slug,
    kind: l.kind,
    label: lawShort(lang, l),
    full: lawName(lang, l),
    topic: l.topic ?? "planning",
    basis: l.basis?.slug ?? null,
    purposes: l.purposes,
    uses: useCount.get(l.slug) ?? 0,
    year: l.enacted_year,
  }));

  const items: TLItem[] = laws
    .filter((l) => l.enacted_year && l.kind !== "ordinance")
    .map((l) => ({ slug: l.slug, label: lawShort(lang, l), full: lawName(lang, l), kind: l.kind, topic: l.topic ?? "planning", year: l.enacted_year!, milestones: l.milestones }));

  // 事例ごとにまとめる
  const projects = new Map<string, { p: (typeof uses)[number]["project"]; list: typeof uses }>();
  for (const u of uses) {
    const cur = projects.get(u.project.slug) ?? { p: u.project, list: [] };
    cur.list.push(u);
    projects.set(u.project.slug, cur);
  }
  const pname = (p: { name_ja: string; name_en: string | null }) => (lang === "en" ? p.name_en ?? p.name_ja : p.name_ja);
  const tlProjects: TLProject[] = [...projects.values()]
    .filter((x) => x.p.completed_year)
    .map((x) => ({ slug: x.p.slug, label: pname(x.p), year: x.p.completed_year!, laws: x.list.map((u) => ({ slug: u.law, role: u.role })) }));

  const usedLaws = laws.filter((l) => useCount.has(l.slug)).sort((a, b) => TOPICS.findIndex((x) => x.key === a.topic) - TOPICS.findIndex((x) => x.key === b.topic) || a.sort_order - b.sort_order);
  const rows = [...projects.values()]
    .sort((a, b) => (a.p.completed_year ?? 9999) - (b.p.completed_year ?? 9999))
    .map((x) => ({
      slug: x.p.slug,
      label: pname(x.p),
      place: `${x.p.municipality ?? x.p.prefecture}${x.p.completed_year ? `・${x.p.completed_year}` : ""}`,
      cells: Object.fromEntries(x.list.map((u) => [u.law, { role: u.role, year: u.decided_year, note: lang === "en" ? u.note_en ?? u.note_ja : u.note_ja }])),
    }));
  const roles = Object.fromEntries(Object.entries(ROLES).map(([k, r]) => [k, { label: r[lang], mark: r.mark, color: ROLE_COLORS[k] }]));

  const counts = { law: 0, system: 0, ordinance: 0 };
  for (const l of laws) counts[l.kind]++;

  return (
    <>
      <div className="bg-ink text-white">
        <div className="wrap grid gap-6 py-12 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow !text-white/60">{t.sub}</p>
            <h1 className="mt-2 text-[56px] font-extrabold leading-none tracking-[-0.03em]">{t.title}</h1>
            <p className="mt-4 max-w-[44em] text-sm leading-[1.9] text-white/80">{t.lead}</p>
          </div>
          <dl className="grid grid-cols-4 gap-3">
            {([[counts.law, t.stats.law], [counts.system, t.stats.system], [counts.ordinance, t.stats.ordinance], [uses.length, t.stats.uses]] as const).map(([v, k]) => (
              <div key={k} className="grid gap-1 border-l border-white/20 pl-3">
                <dd className="num order-1 text-[clamp(20px,2.4vw,30px)] font-extrabold leading-none">{v}</dd>
                <dt className="order-2 text-[11px] text-white/60">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
        <nav className="wrap flex gap-5 overflow-x-auto pb-4 text-sm text-white/70">
          {[["map", t.map], ["timeline", t.timeline], ["matrix", t.matrix], ["research", t.research]].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="whitespace-nowrap hover:text-white">{label}</a>
          ))}
        </nav>
      </div>

      <section id="map" className="wrap scroll-mt-20 pt-12">
        <h2 className="text-2xl font-bold">{t.map}</h2>
        <p className="mb-5 mt-2 max-w-[52em] text-sm leading-[1.8] text-muted">{t.mapLead}</p>
        <RuleMap
          lang={lang}
          nodes={nodes}
          topics={topics}
          purposes={PURPOSES.map((p) => ({ key: p.key, label: p[lang] }))}
          labels={{ purposes: t.purposes, topics: t.topics, all: t.all, search: t.search, kinds: t.kinds, projects: lang === "en" ? "{n} projects" : "{n}件の事例" }}
        />
      </section>

      <section id="timeline" className="wrap scroll-mt-20 pt-16">
        <h2 className="text-2xl font-bold">{t.timeline}</h2>
        <p className="mb-5 mt-2 max-w-[52em] text-sm leading-[1.8] text-muted">{t.timelineLead}</p>
        <RuleTimeline
          lang={lang}
          items={items}
          links={links.map((k) => ({ from: k.from, to: k.to, note: k.note_ja }))}
          projects={tlProjects}
          topics={topics}
          roleColor={ROLE_COLORS}
          projectLabel={lang === "en" ? "Projects" : "事例"}
        />
      </section>

      <section id="matrix" className="wrap scroll-mt-20 pt-16">
        <h2 className="text-2xl font-bold">{t.matrix}</h2>
        <p className="mb-5 mt-2 max-w-[52em] text-sm leading-[1.8] text-muted">{t.matrixLead}</p>
        <RuleMatrix lang={lang} rows={rows} cols={usedLaws.map((l) => ({ slug: l.slug, label: lawShort(lang, l), color: topicOf(l.topic).color }))} roles={roles} />
      </section>

      <section id="research" className="wrap scroll-mt-20 pt-16">
        <h2 className="text-2xl font-bold">{t.research}</h2>
        <p className="mb-5 mt-2 text-sm text-muted">{t.researchLead}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {papers.map((p) => (
            <article key={p.slug} className="grid content-start gap-2 rounded-sm border border-line p-4">
              <div className="flex flex-wrap gap-1.5">
                {p.laws.map((s) => {
                  const l = bySlug.get(s);
                  if (!l) return null;
                  const tp = topicOf(l.topic);
                  return (
                    <Link key={s} href={`/${lang}/rule/${s}`} className="rounded-full px-2 py-0.5 text-[11px] font-medium hover:underline" style={{ background: tp.tint, color: tp.color }}>
                      {lawShort(lang, l)}
                    </Link>
                  );
                })}
              </div>
              <a href={p.doi ? `https://doi.org/${p.doi}` : p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="font-semibold leading-snug hover:underline">{p.title}</a>
              <p className="text-xs text-muted">{p.authors}（{p.year}）{p.venue}{p.volume ? ` ${p.volume}${p.issue ? `(${p.issue})` : ""}` : ""}{p.pages ? `, ${p.pages}` : ""}</p>
              <p className="text-sm leading-[1.8]">{p.summary_ja}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm"><Link href={`/${lang}/research`} className="text-accent hover:underline">{lang === "en" ? "More research →" : "研究をもっと見る →"}</Link></p>
      </section>
    </>
  );
}
