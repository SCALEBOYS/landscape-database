import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";
import { ExploreMap } from "@/components/map/ExploreMap";
import { ModelSection } from "@/components/ModelSection";
import { PhotoCarousel, type PhotoPoint, type Slide } from "@/components/PhotoCarousel";
import { PhotoSpotMap, type Spot } from "@/components/PhotoSpotMap";
import { SiteHero } from "@/components/map/SiteHero";
import { CardGrid, ProjectCard } from "@/components/ProjectCard";
import { getBrowseItems } from "@/lib/browse-data";
import { ELEMENTS, elementsOf } from "@/lib/catalog";
import { coverPhoto, getProject, getProjects, modelUrl, photoUrl } from "@/lib/data";
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

  // 写真のカルーセル: カバー写真を先頭に。ポイントの素材には、この事例の構成要素から製品名・メーカーを添える
  const ordered = [...p.photos].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);
  // 撮影地点（公開してよいものだけ）。番号はカルーセルの順番
  const spots: Spot[] = ordered.flatMap((ph, k) => {
    const loc = Array.isArray(ph.location) ? ph.location[0] : ph.location;
    return loc ? [{ n: k + 1, lat: loc.lat, lng: loc.lng, heading: loc.heading, src: photoUrl(ph.storage_path), caption: (lang === "en" ? ph.caption_en : ph.caption_ja) ?? name }] : [];
  });
  const slides: Slide[] = ordered
    .map((ph) => ({
      src: photoUrl(ph.storage_path),
      alt: (lang === "en" ? ph.caption_en : ph.caption_ja) ?? name,
      caption: [(lang === "en" ? ph.caption_en : ph.caption_ja) ?? "", "© Landscape Database"].filter(Boolean).join(" "),
      points: [...ph.points]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .flatMap((pt): PhotoPoint[] => {
          const note = (lang === "en" ? pt.note_en : pt.note_ja) ?? undefined;
          if (pt.species) {
            return [{ x: pt.x, y: pt.y, kind: "species", title: localName(lang, pt.species.name_ja, pt.species.name_en), sub: pt.species.scientific_name, note, href: `/${lang}/species/${pt.species.slug}` }];
          }
          if (pt.category) {
            const cat = pt.category;
            const products = p.components.filter((c) => c.category.slug === cat.slug).map((c) => [c.product_name, c.maker_name].filter(Boolean).join(" / ")).filter(Boolean);
            return [{ x: pt.x, y: pt.y, kind: "material", title: localName(lang, cat.name_ja, cat.name_en), sub: products.join("、") || undefined, note, href: cat.kind === "paving" ? `/${lang}/explore?paving=${cat.slug}` : undefined }];
          }
          return [];
        }),
    }));

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
        models={p.models
          .filter((m) => m.show_on_map)
          .map((m) => ({ url: modelUrl(m.storage_path), offsetEast: m.offset_east_m, offsetNorth: m.offset_north_m, altitude: m.altitude_m, rotation: m.rotation_deg, scale: m.scale }))}
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

        {slides.length > 0 && (
          <section className="pt-8">
            <PhotoCarousel
              slides={slides}
              labels={{ species: t.pointSpecies, material: t.pointMaterial, more: t.pointMore, prev: t.photoPrev, next: t.photoNext, show: t.showPoints, hide: t.hidePoints, close: t.close }}
            />
          </section>
        )}

        {spots.length > 0 && <PhotoSpotMap spots={spots} total={slides.length} labels={{ title: t.spots, hint: t.spotsHint, close: t.close }} />}

        {p.models.length > 0 && (
          <ModelSection
            models={p.models.map((m) => ({ src: modelUrl(m.storage_path), name: m.file_name, caption: (lang === "en" ? m.caption_en : m.caption_ja) ?? undefined }))}
            labels={{ title: t.model, hint: t.modelHint, fullscreen: t.fullscreen }}
          />
        )}

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

            {p.laws.length > 0 && (
              <Section title={dict.laws.section}>
                <ul className="grid gap-3">
                  {p.laws.map(({ law, note_ja, note_en, source_url }) => {
                    const note = lang === "en" ? note_en : note_ja;
                    return (
                      <li key={law.slug} className="grid gap-1 border-b border-line pb-3">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-[11px] text-muted">{dict.laws.kinds[law.kind]}</span>
                          <Link href={`/${lang}/laws/${law.slug}`} className="font-medium hover:underline">{localName(lang, law.name_ja, law.name_en)}</Link>
                          {law.kind === "ordinance" && <span className="text-xs text-muted">{lang === "en" ? law.jurisdiction_en ?? law.jurisdiction_ja : law.jurisdiction_ja}</span>}
                        </span>
                        {note && <span className="text-sm leading-relaxed">{note}</span>}
                        {source_url && (
                          <a href={source_url} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-accent hover:underline">
                            {dict.laws.source}: {new URL(source_url).hostname}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
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
