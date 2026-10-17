import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CardGrid } from "@/components/ProjectCard";
import { ProjectMap } from "@/components/ProjectMap";
import { getProject, getProjects, photoUrl } from "@/lib/data";
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
  const t = getDictionary(lang);
  const name = localName(lang, p.name_ja, p.name_en);
  const text = summary(p, lang);

  const plantingsByLayer = LAYERS.map((layer) => ({ layer, items: p.plantings.filter((pl) => pl.layer === layer) })).filter(
    (g) => g.items.length,
  );
  const componentKinds = [...new Set(p.components.map((c) => c.category.kind))];

  return (
    <article>
      {parent && (
        <nav className="mb-4 text-sm text-muted">
          <Link href={`/${lang}/projects/${parent.slug}`} className="hover:text-accent">
            {localName(lang, parent.name_ja, parent.name_en)}
          </Link>
          <span className="mx-2">/</span>
          <span>{name}</span>
        </nav>
      )}
      <h1 className="text-3xl font-light leading-tight">{name}</h1>
      <p className="mt-2 text-muted">
        {place(p, lang)} · {label(categoryLabels, p.use_category, lang)}
      </p>

      <section className="mt-8">
        {p.photos.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {p.photos.map((ph) => (
              <figure key={ph.storage_path}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(ph.storage_path)} alt={(lang === "en" ? ph.caption_en : ph.caption_ja) ?? name} className="w-full rounded-md" />
                <figcaption className="mt-1 text-xs text-muted">
                  {(lang === "en" ? ph.caption_en : ph.caption_ja) ?? ""} © Landscape Database
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="flex aspect-[21/9] items-center justify-center rounded-md bg-placeholder text-sm tracking-widest text-accent/70">
            {t.project.noPhoto}
          </div>
        )}
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-10">
          {text && <p className="leading-loose">{text}</p>}
          {lang === "en" && !text && (p.summary_ja || p.summary_en) && <p className="text-sm text-muted">{t.englishPending}</p>}

          <section>
            <h2 className="mb-3 border-b border-line pb-2 text-lg font-medium">{t.project.plantings}</h2>
            {plantingsByLayer.length ? (
              <dl className="space-y-3">
                {plantingsByLayer.map((g) => (
                  <div key={g.layer} className="grid grid-cols-[6rem_1fr] gap-3">
                    <dt className="text-sm text-muted">{label(layerLabels, g.layer, lang)}</dt>
                    <dd className="flex flex-wrap gap-x-4 gap-y-1">
                      {g.items.map((pl) => (
                        <Link key={pl.species.slug} href={`/${lang}/species/${pl.species.slug}`} className="hover:text-accent">
                          {localName(lang, pl.species.name_ja, pl.species.name_en)}{" "}
                          <i className="text-sm text-muted">{pl.species.scientific_name}</i>
                        </Link>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted">{t.project.noPlantings}</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 border-b border-line pb-2 text-lg font-medium">{t.project.components}</h2>
            {componentKinds.length ? (
              <dl className="space-y-3">
                {componentKinds.map((kind) => (
                  <div key={kind} className="grid grid-cols-[6rem_1fr] gap-3">
                    <dt className="text-sm text-muted">{label(componentKindLabels, kind, lang)}</dt>
                    <dd>
                      {p.components
                        .filter((c) => c.category.kind === kind)
                        .map((c, i) => (
                          <div key={i}>
                            {localName(lang, c.category.name_ja, c.category.name_en)}
                            {(c.product_name || c.maker_name) && (
                              <span className="text-sm text-muted"> — {[c.product_name, c.maker_name].filter(Boolean).join(" / ")}</span>
                            )}
                          </div>
                        ))}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted">{t.project.noComponents}</p>
            )}
          </section>

          {children.length > 0 && (
            <section>
              <h2 className="mb-4 border-b border-line pb-2 text-lg font-medium">{t.project.children}</h2>
              <CardGrid lang={lang} cards={children.map((c) => toCard(c, lang))} />
            </section>
          )}
        </div>

        <aside className="space-y-6 text-sm">
          <dl className="space-y-3">
            {p.credits.length > 0 && (
              <div>
                <dt className="text-muted">{t.project.designers}</dt>
                <dd className="mt-1 space-y-1">
                  {p.credits.map((c) => (
                    <Link key={c.party.slug} href={`/${lang}/designers/${c.party.slug}`} className="block hover:text-accent">
                      {localName(lang, c.party.name_ja, c.party.name_en)}
                    </Link>
                  ))}
                </dd>
              </div>
            )}
            {p.completed_year && (
              <div>
                <dt className="text-muted">{t.project.completed}</dt>
                <dd>{p.completed_year}</dd>
              </div>
            )}
            {p.site_area_m2 && (
              <div>
                <dt className="text-muted">{t.project.area}</dt>
                <dd>{Number(p.site_area_m2).toLocaleString()} m²</dd>
              </div>
            )}
            {p.awards.length > 0 && (
              <div>
                <dt className="text-muted">{t.project.awards}</dt>
                <dd className="mt-1 space-y-1">
                  {p.awards.map((a, i) => (
                    <div key={i}>{a.award_name}{a.award_year ? `（${a.award_year}）` : ""}</div>
                  ))}
                </dd>
              </div>
            )}
            {p.sources.length > 0 && (
              <div>
                <dt className="text-muted">{t.project.sources}</dt>
                <dd className="mt-1 space-y-1 break-all">
                  {p.sources.map((s) => (
                    <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-accent hover:underline">
                      {s.title ?? new URL(s.url).hostname}
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
          {p.lat !== null && p.lng !== null && (
            <div>
              <ProjectMap
                lang={lang}
                height={260}
                points={[p, ...children]
                  .filter((x) => x.lat !== null && x.lng !== null)
                  .map((x) => ({ slug: x.slug, name: localName(lang, x.name_ja, x.name_en), sub: place(x, lang), lat: x.lat!, lng: x.lng! }))}
              />
              <p className="mt-1 text-xs text-muted">{t.project.approxLocation}</p>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
