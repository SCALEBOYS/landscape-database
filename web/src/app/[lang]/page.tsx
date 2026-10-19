import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { HomeBrowser, HomeBrowserFromUrl } from "@/components/browse/Browser";
import { ExploreMap } from "@/components/map/ExploreMap";
import type { BrowseItem, Ref } from "@/lib/browse";
import { getBrowseItems, getLawOptions } from "@/lib/browse-data";
import { fmt, getDictionary, hasLocale } from "@/lib/i18n";
import { satelliteImage } from "@/lib/mapbox";
import { yearRange } from "@/lib/years";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).browse;
  const [items, lawOptions] = await Promise.all([getBrowseItems(lang), getLawOptions(lang)]);

  // ヒーローは自分の写真がある最新の事例。まだなければ最新の事例の航空写真
  const heroItem = items.find((it) => it.photo) ?? items.find((it) => it.lat !== null);
  const heroImg = heroItem?.photo ?? (heroItem?.lat != null && heroItem.lng != null ? satelliteImage(heroItem.lat, heroItem.lng, { w: 1280, h: 640, zoom: 16 }) : null);

  const hero = (
    <div className="relative h-[clamp(440px,52vw,640px)] overflow-hidden bg-ink text-white">
      {heroImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full scale-[1.04] object-cover" style={{ animation: "drift 26s ease-in-out infinite alternate" }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/65" />
      {heroItem && (
        <Link href={`/${lang}/projects/${heroItem.slug}`} className="absolute right-4 top-4 z-10 text-right text-xs leading-relaxed text-white/85 hover:text-white md:right-8">
          <b className="block text-sm font-medium">{heroItem.name}</b>
          {heroItem.photo ? heroItem.place : t.aerialCaption}
        </Link>
      )}
      <div className="wrap absolute inset-x-0 bottom-[110px] md:bottom-[96px]">
        <div className="grid max-w-[980px] gap-3.5">
          <span className="eyebrow !text-white/75">{fmt(t.heroEyebrow, items.length)}</span>
          <h1 className="text-[clamp(36px,6.4vw,92px)] font-extrabold leading-[1.02] tracking-[-0.035em]">{t.heroTitle}</h1>
          <p className="hidden max-w-[52ch] text-[15px] leading-[1.8] text-white/85 md:block">{t.heroLead}</p>
        </div>
      </div>
    </div>
  );

  const tally = (pick: (it: BrowseItem) => Ref[]) => {
    const m = new Map<string, Ref & { n: number }>();
    for (const it of items) for (const r of pick(it)) m.set(r.slug, { ...r, n: (m.get(r.slug)?.n ?? 0) + 1 });
    return [...m.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, lang));
  };
  const species = tally((it) => it.species);
  const designers = tally((it) => it.designers);
  const tags = (list: (Ref & { n: number })[], base: string) =>
    list.length ? (
      <div className="flex flex-wrap gap-2">
        {list.map((r) => (
          <Link key={r.slug} href={`/${lang}/${base}/${r.slug}`} className="rounded-sm border border-line px-3 py-1.5 text-[13px] hover:border-ink">
            {r.label}
            {r.sub && <i className="ml-1 text-muted">{r.sub}</i>}
            <span className="ml-1.5 text-[11px] text-muted">{r.n}</span>
          </Link>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted">{t.noOptions}</p>
    );

  const after = (
    <>
      <section className="wrap pt-16">
        <div className="grid overflow-hidden rounded-sm border border-line md:grid-cols-[1.2fr_1fr]">
          <div className="relative min-h-[300px]">
            <ExploreMap lang={lang} items={items} t={t} interactive={false} />
          </div>
          <div className="grid content-center gap-3.5 p-8">
            <span className="eyebrow">Map</span>
            <h2 className="text-[30px] font-extrabold tracking-[-0.02em]">{t.mapTitle}</h2>
            <p className="leading-[1.8] text-muted">{t.mapLead}</p>
            <Link href={`/${lang}/explore`} className="solid justify-self-start">
              {t.openMap}
            </Link>
          </div>
        </div>
      </section>
      <section className="wrap grid gap-12 pt-16 md:grid-cols-2">
        <div className="grid content-start gap-4">
          <div className="flex items-baseline justify-between border-b border-line pb-3">
            <h2 className="text-2xl font-extrabold tracking-[-0.02em]">{t.bySpecies}</h2>
            <span className="text-[13px] text-muted">{fmt(t.nSpecies, species.length)}</span>
          </div>
          {tags(species, "species")}
        </div>
        <div className="grid content-start gap-4">
          <div className="flex items-baseline justify-between border-b border-line pb-3">
            <h2 className="text-2xl font-extrabold tracking-[-0.02em]">{t.byDesigner}</h2>
            <span className="text-[13px] text-muted">{fmt(t.nDesigners, designers.length)}</span>
          </div>
          {tags(designers, "designers")}
        </div>
      </section>
    </>
  );

  const props = { lang, items, lawOptions, t, years: yearRange(items), hero, after };
  return (
    <Suspense fallback={<HomeBrowser {...props} />}>
      <HomeBrowserFromUrl {...props} />
    </Suspense>
  );
}
