import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";
import { SwimLane } from "@/components/rule/RuleParts";
import { hasLocale, locales } from "@/lib/i18n";
import { ACTOR_EN, ACTORS, getRule, lawName, lawShort, PURPOSES, ROLE_COLORS, ROLES, RULE_T, topicOf } from "@/lib/rule";
import { alternates } from "@/lib/site";

export async function generateStaticParams() {
  const { laws } = await getRule();
  return locales.flatMap((lang) => laws.map((l) => ({ lang, slug: l.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/rule/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const law = (await getRule()).laws.find((l) => l.slug === slug);
  if (!law || !hasLocale(lang)) return {};
  return { title: lawName(lang, law), description: (lang === "en" ? law.summary_en : law.summary_ja) ?? undefined, alternates: alternates(lang, `/rule/${slug}`) };
}

// 制度カード: 基礎情報・目的・メリット・要件・手続きの流れ・あゆみ・実現した事例・関係する制度・研究
export default async function RuleLawPage({ params }: PageProps<"/[lang]/rule/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const { laws, links, uses, papers } = await getRule();
  const law = laws.find((l) => l.slug === slug);
  if (!law) notFound();
  const t = RULE_T[lang];
  const tp = topicOf(law.topic);
  const ja = lang === "ja";
  const summary = ja ? law.summary_ja : law.summary_en ?? law.summary_ja;
  const mine = uses.filter((u) => u.law === slug);
  const derived = laws.filter((l) => l.basis?.slug === slug);
  const out = links.filter((k) => k.from === slug).map((k) => ({ law: laws.find((l) => l.slug === k.to), note: k.note_ja, dir: "→" }));
  const inn = links.filter((k) => k.to === slug).map((k) => ({ law: laws.find((l) => l.slug === k.from), note: k.note_ja, dir: "←" }));
  const related = [...inn, ...out].filter((x) => x.law);
  const myPapers = papers.filter((p) => p.laws.includes(slug));
  const purposes = PURPOSES.filter((p) => law.purposes.includes(p.key));
  const milestones = [...(law.enacted_year ? [{ year: law.enacted_year, label: ja ? "創設・制定" : "Created" }] : []), ...law.milestones.filter((m) => m.year !== law.enacted_year)].sort((a, b) => a.year - b.year);

  const info: [string, React.ReactNode][] = [
    [t.kind, t.kinds[law.kind]],
    ...(law.basis ? [[t.basis, <Link key="b" href={`/${lang}/rule/${law.basis.slug}`} className="underline decoration-line underline-offset-4 hover:decoration-ink">{lawName(lang, law.basis)}</Link>] as [string, React.ReactNode]] : []),
    [t.jurisdiction, ja ? law.jurisdiction_ja : law.jurisdiction_en ?? law.jurisdiction_ja],
    ...(law.enacted_year ? [[t.enacted, <span key="y" className="num">{law.enacted_year}</span>] as [string, React.ReactNode]] : []),
    [t.topic, <span key="t" className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: tp.color }} />{tp[lang]}</span>],
  ];

  return (
    <div className="pb-8">
      {/* 見出しの帯（分野の色） */}
      <div style={{ background: tp.tint }}>
        <div className="wrap pb-8 pt-8">
          <nav className="flex gap-2 text-xs text-muted">
            <Link href={`/${lang}/rule`} className="hover:text-ink hover:underline">RULE</Link>
            <span>/</span>
            <span style={{ color: tp.color }}>{tp[lang]}</span>
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-sm px-2 py-0.5 text-xs font-semibold text-white" style={{ background: tp.color }}>{t.kinds[law.kind]}</span>
            {purposes.map((p) => (
              <Link key={p.key} href={`/${lang}/rule#map`} className="rounded-full border bg-white/70 px-2.5 py-0.5 text-xs" style={{ borderColor: tp.color, color: tp.color }}>{p[lang]}</Link>
            ))}
          </div>
          <h1 className="mt-3 text-[clamp(28px,4vw,44px)] font-extrabold leading-tight tracking-[-0.02em]">{lawName(lang, law)}</h1>
          {summary && <p className="mt-4 max-w-[42em] text-[17px] leading-[1.85]">{summary}</p>}
        </div>
      </div>

      <div className="wrap grid grid-cols-[minmax(0,1fr)] gap-10 pt-10 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* 基礎情報 */}
        <aside className="grid content-start gap-4">
          <section className="rounded-sm border border-line">
            <h2 className="border-b border-line px-4 py-2 text-xs font-semibold tracking-wider" style={{ color: tp.color }}>{t.basic}</h2>
            <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2.5 px-4 py-3 text-sm">
              {info.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {law.official_url && (
              <a href={law.official_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 border-t border-line px-4 py-2.5 text-sm hover:bg-soft" style={{ color: tp.color }}>
                {t.official} <Icon name="arrow" className="ico ml-auto !h-4 !w-4" />
              </a>
            )}
          </section>
          {derived.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold text-muted">{t.derived}</h2>
              <div className="grid gap-1.5">
                {derived.map((d) => {
                  const dt = topicOf(d.topic);
                  return (
                    <Link key={d.slug} href={`/${lang}/rule/${d.slug}`} className="flex items-center gap-2 rounded-sm border border-line px-3 py-2 text-sm hover:border-ink">
                      <span className="h-2 w-2 flex-none rotate-45" style={{ background: dt.color }} />
                      {lawShort(lang, d)}
                      {d.enacted_year ? <span className="num ml-auto text-xs text-muted">{d.enacted_year}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </aside>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-10">
          {(law.purpose_ja || law.merits_ja.length || law.requirements_ja.length) && ja ? (
            <section className="grid gap-5">
              {law.purpose_ja && (
                <div>
                  <h2 className="mb-2 text-sm font-semibold" style={{ color: tp.color }}>{t.purpose}</h2>
                  <p className="leading-[1.85]">{law.purpose_ja}</p>
                </div>
              )}
              {(law.merits_ja.length > 0 || law.requirements_ja.length > 0) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    [t.merits, law.merits_ja, "＋"],
                    [t.requirements, law.requirements_ja, "□"],
                  ].map(([label, list, mark]) =>
                    (list as string[]).length ? (
                      <div key={label as string} className="rounded-sm p-4" style={{ background: tp.tint }}>
                        <h3 className="mb-2 text-sm font-semibold" style={{ color: tp.color }}>{label as string}</h3>
                        <ul className="grid gap-1.5 text-sm leading-relaxed">
                          {(list as string[]).map((x) => (
                            <li key={x} className="flex gap-2"><span style={{ color: tp.color }}>{mark as string}</span>{x}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </section>
          ) : null}

          {law.flow.length > 0 && (
            <section>
              <h2 className="mb-1 text-sm font-semibold" style={{ color: tp.color }}>{t.flow}</h2>
              <p className="mb-3 text-xs text-muted">{t.flowNote}</p>
              <SwimLane steps={law.flow} actors={[...ACTORS]} actorLabel={(a) => (ja ? a : ACTOR_EN[a] ?? a)} color={tp.color} />
            </section>
          )}

          {milestones.length > 1 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold" style={{ color: tp.color }}>{t.history}</h2>
              <ol className="relative grid gap-3 border-l-2 pl-5" style={{ borderColor: tp.tint }}>
                {milestones.map((m) => (
                  <li key={m.year + m.label} className="relative text-sm">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 bg-white" style={{ borderColor: tp.color }} />
                    <span className="num mr-3 font-semibold">{m.year}</span>
                    {m.label}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section>
            <h2 className="mb-4 border-b border-ink pb-2 text-lg font-medium">{t.usedIn}</h2>
            {mine.length ? (
              <ul className="grid gap-4">
                {mine.map((u) => {
                  const r = ROLES[u.role];
                  const note = ja ? u.note_ja : u.note_en ?? u.note_ja;
                  return (
                    <li key={u.project.slug} className="grid gap-1.5 border-b border-line pb-4 sm:grid-cols-[220px_1fr] sm:gap-5">
                      <div>
                        <Link href={`/${lang}/projects/${u.project.slug}`} className="font-semibold hover:underline">{ja ? u.project.name_ja : u.project.name_en ?? u.project.name_ja}</Link>
                        <span className="block text-xs text-muted">{u.project.municipality ?? u.project.prefecture}{u.project.completed_year ? `・${u.project.completed_year}` : ""}</span>
                      </div>
                      <div className="grid gap-1 text-sm">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: ROLE_COLORS[u.role] }}>
                          {r.mark} {r[lang]}
                          {u.decided_year ? <span className="num text-muted">{u.decided_year}</span> : null}
                        </span>
                        {note && <span className="leading-relaxed">{note}</span>}
                        {u.source_url && (
                          <a href={u.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-accent hover:underline">{t.source}: {new URL(u.source_url).hostname}</a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t.none}</p>
            )}
          </section>

          {related.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold" style={{ color: tp.color }}>{t.related}</h2>
              <ul className="grid gap-2">
                {related.map(({ law: l, note, dir }) => (
                  <li key={l!.slug + dir} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                    <span className="text-muted">{dir}</span>
                    <Link href={`/${lang}/rule/${l!.slug}`} className="font-medium hover:underline" style={{ color: topicOf(l!.topic).color }}>{lawShort(lang, l!)}</Link>
                    {note && ja ? <span className="text-xs text-muted">{note}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {myPapers.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold" style={{ color: tp.color }}>{t.papers}</h2>
              <ul className="grid gap-4">
                {myPapers.map((p) => (
                  <li key={p.slug} className="grid gap-1 border-l-2 pl-4" style={{ borderColor: tp.color }}>
                    <a href={p.doi ? `https://doi.org/${p.doi}` : p.url ?? "#"} target="_blank" rel="noopener noreferrer" className="font-medium leading-snug hover:underline">{p.title}</a>
                    <span className="text-xs text-muted">{p.authors}（{p.year}）{p.venue}</span>
                    <span className="text-sm leading-[1.8]">{p.summary_ja}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
