import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { HomeBrowser, HomeBrowserFromUrl } from "@/components/browse/Browser";
import { RecentTags } from "@/components/browse/RecentTags";
import { HeroSlides, type Slide } from "@/components/HeroSlides";
import { ExploreMap } from "@/components/map/ExploreMap";
import type { BrowseItem, Ref } from "@/lib/browse";
import { getBrowseItems, getLawOptions } from "@/lib/browse-data";
import { getSpeciesList } from "@/lib/data";
import { Icon } from "@/components/Icon";
import { fmt, getDictionary, hasLocale, localName } from "@/lib/i18n";
import { satelliteImage } from "@/lib/mapbox";
import { yearRange } from "@/lib/years";
import type { Metadata } from "next";
import { alternates, jsonLd, SITE_URL } from "@/lib/site";

// 樹種・設計者は、最近探したものと事例の多いものを合わせてこの件数まで。ほかは地図で探す
const TAG_LIMIT = 15;

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { alternates: alternates(lang, "") } : {};
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).browse;
  const [items, lawOptions, speciesMaster] = await Promise.all([getBrowseItems(lang), getLawOptions(lang), getSpeciesList()]);

  // ヒーローは5秒ごとに事例を切り替える。自分の写真があれば写真、なければ航空写真
  const slides: Slide[] = items.flatMap((it) => {
    const img = it.photo ?? (it.lat !== null && it.lng !== null ? satelliteImage(it.lat, it.lng, { w: 1280, h: 640, zoom: 16 }) : null);
    return img ? [{ slug: it.slug, name: it.name, caption: it.photo ? it.place : t.aerialCaption, img }] : [];
  });

  const hero = (
    <div className="relative h-[clamp(300px,34vw,460px)] overflow-hidden bg-ink text-white">
      <HeroSlides lang={lang} slides={slides} labels={{ pause: t.slidePause, play: t.slidePlay, go: t.slideGo }} />
      <div className="wrap pointer-events-none absolute inset-x-0 bottom-[76px] md:bottom-[72px]">
        <div className="grid max-w-[980px] gap-3.5">
          <span className="eyebrow !text-white/75">{fmt(t.heroEyebrow, items.length)}</span>
          <h1 className="text-[clamp(30px,4.6vw,66px)] font-extrabold leading-[1.04] tracking-[-0.022em]">{t.heroTitle}</h1>
          <p className="hidden max-w-[52ch] text-[14px] leading-[1.75] text-white/85 lg:block">{t.heroLead}</p>
        </div>
      </div>
    </div>
  );

  const tally = (pick: (it: BrowseItem) => Ref[]) => {
    const m = new Map<string, Ref & { n: number }>();
    for (const it of items) for (const r of pick(it)) m.set(r.slug, { ...r, n: (m.get(r.slug)?.n ?? 0) + 1 });
    return [...m.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, lang));
  };
  // 樹種は事例で使われているものを優先。まだ1件もなければ樹種マスタから一部を出す
  const usedSpecies = tally((it) => it.species);
  // 学名は長くなるのでタグには出さない（樹種のページで見られる）
  const species = usedSpecies.length
    ? usedSpecies.map((r) => ({ ...r, sub: undefined }))
    : speciesMaster.slice(0, TAG_LIMIT).map((sp) => ({ slug: sp.slug, label: localName(lang, sp.name_ja, sp.name_en), n: 0 }));
  const allDesigners = tally((it) => it.designers);
  const tags = (kind: "species" | "designers", list: (Ref & { n: number })[]) => (
    <RecentTags lang={lang} kind={kind} base={kind} options={list} limit={TAG_LIMIT} recentLabel={t.recentMark} empty={t.noOptions} />
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
            <span className="text-[13px] text-muted">{usedSpecies.length ? fmt(t.nSpecies, usedSpecies.length) : ""}</span>
          </div>
          {!usedSpecies.length && <p className="text-[13px] text-muted">{t.speciesNotUsed}</p>}
          {tags("species", species)}
          <Link href={`/${lang}/explore?find=species`} className="inline-flex items-center gap-1.5 justify-self-start text-sm font-medium hover:underline">
            {t.allSpecies} <Icon name="arrow" />
          </Link>
        </div>
        <div className="grid content-start gap-4">
          <div className="flex items-baseline justify-between border-b border-line pb-3">
            <h2 className="text-2xl font-extrabold tracking-[-0.02em]">{t.byDesigner}</h2>
            <span className="text-[13px] text-muted">{fmt(t.nDesigners, allDesigners.length)}</span>
          </div>
          {tags("designers", allDesigners)}
          <Link href={`/${lang}/explore?find=designers`} className="inline-flex items-center gap-1.5 justify-self-start text-sm font-medium hover:underline">
            {fmt(t.allDesigners, allDesigners.length)} <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </>
  );

  const props = { lang, items, lawOptions, t, years: yearRange(items), hero, after };
  // サイト全体の情報と、サイト内検索の入口（検索エンジン向け）
  const site = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Landscape Database",
    url: `${SITE_URL}/${lang}`,
    inLanguage: lang,
    publisher: { "@type": "Organization", name: "Joulis Research & Architecture" },
    potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/${lang}/explore?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(site) }} />
    <Suspense fallback={<HomeBrowser {...props} />}>
      <HomeBrowserFromUrl {...props} />
    </Suspense>
    </>
  );
}
