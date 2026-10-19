import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";
import { ExploreMap } from "@/components/map/ExploreMap";
import { SiteHero } from "@/components/map/SiteHero";
import { CardGrid, ProjectCard } from "@/components/ProjectCard";
import { getBrowseItems } from "@/lib/browse-data";
import { ELEMENTS, elementsOf } from "@/lib/catalog";
import { coverPhoto, getProject, getProjects, photoUrl } from "@/lib/data";
import {
  categoryLabels,
  componentKindLabels,
  getDictionary,
  hasLocale,
  label,
  layerLabels,
  localName,
  locales,
} from "@/lib/i18n";
import { place, summary, toCard } from "@/lib/view";

export async function generateStaticParams() {
  const projects = await getProjects();
  return locales.flatMap((lang) => projects.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/projects/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const found = hasLocale(lang) ? await getProject(slug) : null;
  if (!found || !hasLocale(lang)) return {};
  return { title: localName(lang, found.project.name_ja, found.project.name_en) };
}

const LAYERS = ["tall_tree", "mid_tree", "shrub", "ground_cover", "climber", "other"];

export default async function ProjectPage({ params }: PageProps<"/[lang]/projects/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const found = await getProject(slug);
  if (!found) notFound();
  const { project: p, parent, children } = found;
  const dict = getDictionary(lang);
  const t = dict.project;
  const b = dict.browse;
  const name = localName(lang, p.name_ja, p.name_en);
  const text = summary(p, lang);
  const useLabel = label(categoryLabels, p.use_category, lang);

  const plantingsByLayer = LAYERS.map((layer) => ({ layer, items: p.plantings.filter((pl) => pl.layer === layer) })).filter((g) => g.items.length);
  const componentKinds = [...new Set(p.components.map((c) => c.category.kind))];
  const elements = elementsOf(p);

  // 前後の事例（一覧と同じ並び）と、位置の小さな地図
  const projects = await getProjects();
  const i = projects.findIndex((x) => x.id === p.id);
  const neighbours = projects.length > 1 ? [projects[(i + projects.length - 1) % projects.length], projects[(i + 1) % projects.length]] : [];
  const mapItems = (await getBrowseItems(lang)).filter((it) => it.slug === p.slug && it.lat !== null);

  const facts: [string, React.ReactNode][] = [
    [t.location, place(p, lang)],
    [t.completed, p.completed_year ? <span className="num text-lg">{p.completed_year}</span> : null],
    [t.area, p.site_area_m2 ? <span className="num text-lg">{Number(p.site_area_m2).toLocaleString()} m²</span> : null],
    [t.use, <Link key="use" href={`/${lang}/explore?uses=${p.use_category}`} className="underline decoration-line underline-offset-4 hover:decoration-ink">{useLabel}</Link>],
    [
      t.designers,
      p.credits.length ? (
        <span className="grid gap-1">
          {p.credits.map((c) => (
            <Link key={c.party.slug} href={`/${lang}/designers/${c.party.slug}`} className="underline decoration-line underline-offset-4 hover:decoration-ink">
              {localName(lang, c.party.name_ja, c.party.name_en)}
            </Link>
          ))}
        </span>
      ) : null,
    ],
    [
      t.awards,
      p.awards.length ? (
        <span className="grid gap-1">
          {p.awards.map((a, k) => (
            <span key={k}>{a.award_name}{a.award_year ? `（${a.award_year}）` : ""}</span>
          ))}
        </span>
      ) : null,
    ],
  ];

  return (
    <article>
      <SiteHero
        photo={coverPhoto(p)}
        lat={p.lat}
        lng={p.lng}
        alt={name}
        labels={{ photo: b.heroPhoto, d3: b.hero3d, flat: b.heroFlat, note: b.heroNote, view: b.viewLabel }}
      >
        <div className="wrap grid gap-2.5">
          <span className="eyebrow !text-white/80">{useLabel} · {place(p, lang)}</span>
          <h1 className="text-[clamp(34px,6vw,84px)] font-extrabold leading-[1.04] tracking-[-0.035em]">{name}</h1>
          {lang === "ja" && p.name_en && <span className="text-[15px] opacity-80">{p.name_en}</span>}
        </div>
      </SiteHero>

      <div className="wrap">
        <nav className="flex flex-wrap gap-2 pt-4 text-xs text-muted">
          <Link href={`/${lang}`} className="hover:text-ink hover:underline">{dict.nav.projects}</Link>
          <span>/</span>
          {parent ? (
            <Link href={`/${lang}/projects/${parent.slug}`} className="hover:text-ink hover:underline">{localName(lang, parent.name_ja, parent.name_en)}</Link>
          ) : (
            <Link href={`/${lang}/explore?uses=${p.use_category}`} className="hover:text-ink hover:underline">{useLabel}</Link>
          )}
          <span>/</span>
          <span>{name}</span>
        </nav>

        <div className="grid gap-14 pt-11 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            {text && <p className="max-w-[38em] text-xl leading-[1.75]">{text}</p>}
            {lang === "en" && !text && (p.summary_ja || p.summary_en) && <p className="text-sm text-muted">{dict.englishPending}</p>}

            {elements.length > 0 && (
              <Section title={b.elRow}>
                <div className="flex flex-wrap gap-2.5">
                  {elements.map((k) => (
                    <Link key={k} href={`/${lang}/explore?els=${k}`} className="chip">
                      <Icon name={k} />
                      {ELEMENTS.find((e) => e.key === k)![lang]}
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {p.photos.length > 1 && (
              <Section title={b.heroPhoto}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {p.photos.map((ph) => (
                    <figure key={ph.storage_path}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl(ph.storage_path)} alt={(lang === "en" ? ph.caption_en : ph.caption_ja) ?? name} className="w-full rounded-sm" />
                      <figcaption className="mt-1 text-xs text-muted">{(lang === "en" ? ph.caption_en : ph.caption_ja) ?? ""} © Landscape Database</figcaption>
                    </figure>
                  ))}
                </div>
              </Section>
            )}

            <Section title={t.plantings}>
              {plantingsByLayer.length ? (
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {plantingsByLayer.flatMap((g) =>
                      g.items.map((pl, k) => (
                        <tr key={`${g.layer}-${pl.species.slug}`} className="border-b border-line">
                          <td className="w-20 py-2.5 align-baseline text-xs text-muted">{k === 0 ? label(layerLabels, g.layer, lang) : ""}</td>
                          <td className="py-2.5 align-baseline">
                            <Link href={`/${lang}/species/${pl.species.slug}`} className="hover:underline">{localName(lang, pl.species.name_ja, pl.species.name_en)}</Link>
                          </td>
                          <td className="py-2.5 align-baseline italic text-muted">{pl.species.scientific_name}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted">{t.noPlantings}</p>
              )}
            </Section>

            <Section title={t.components}>
              {componentKinds.length ? (
                <dl className="grid gap-3">
                  {componentKinds.map((kind) => (
                    <div key={kind} className="grid grid-cols-[6rem_1fr] gap-3 border-b border-line pb-3">
                      <dt className="text-xs text-muted">{label(componentKindLabels, kind, lang)}</dt>
                      <dd className="text-sm">
                        {p.components
                          .filter((c) => c.category.kind === kind)
                          .map((c, k) => (
                            <div key={k}>
                              {localName(lang, c.category.name_ja, c.category.name_en)}
                              {(c.product_name || c.maker_name) && <span className="text-muted"> — {[c.product_name, c.maker_name].filter(Boolean).join(" / ")}</span>}
                            </div>
                          ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted">{t.noComponents}</p>
              )}
            </Section>

            {p.sources.length > 0 && (
              <Section title={t.sources}>
                <ul className="grid gap-1 break-all text-sm">
                  {p.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{s.title ?? new URL(s.url).hostname}</a>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {children.length > 0 && (
              <Section title={t.children}>
                <CardGrid lang={lang} cards={children.map((c) => toCard(c, lang))} />
              </Section>
            )}
          </div>

          <aside className="lg:sticky lg:top-[calc(var(--hdr)+16px)] lg:self-start">
            <dl className="grid grid-cols-[88px_1fr] border-t-2 border-ink">
              {facts.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="border-b border-line py-3.5 text-xs text-muted">{k}</dt>
                  <dd className="border-b border-line py-3 text-sm">{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
            {mapItems.length > 0 && (
              <div className="mt-5">
                <div className="relative h-[220px] overflow-hidden rounded-sm">
                  <ExploreMap lang={lang} items={mapItems} t={b} interactive={false} />
                </div>
                <p className="mt-1 text-xs text-muted">{t.approxLocation}</p>
              </div>
            )}
          </aside>
        </div>

        {neighbours.length > 0 && (
          <div className="grid gap-6 pt-16 md:grid-cols-2">
            {neighbours.map((x, k) => (
              <div key={`${k}-${x.slug}`} className="grid gap-2.5">
                <span className="eyebrow">{k === 0 ? (lang === "ja" ? "前の事例" : "Previous") : lang === "ja" ? "次の事例" : "Next"}</span>
                <ProjectCard lang={lang} card={toCard(x, lang)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 pt-10">
      <h2 className="border-t border-ink pt-3 text-[13px] font-medium tracking-[.1em] text-muted">{title}</h2>
      {children}
    </section>
  );
}
