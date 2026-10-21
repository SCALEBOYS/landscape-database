import { HeroSlides, type Slide } from "@/components/HeroSlides";
import type { BrowseItem } from "@/lib/browse";
import { fmt, type BrowseText, type Locale } from "@/lib/i18n";
import { satelliteImage } from "@/lib/mapbox";

// 事例の画像。自分の写真があれば写真、なければ航空写真（aerial なら写真があっても航空写真）
export function projectSlides(lang: Locale, items: BrowseItem[], t: BrowseText, aerial = false): Slide[] {
  return items.flatMap((it) => {
    const sat = it.lat !== null && it.lng !== null ? satelliteImage(it.lat, it.lng, { w: 1280, h: 640, zoom: aerial ? 15 : 16 }) : null;
    const img = aerial ? sat : (it.photo ?? sat);
    const own = !aerial && !!it.photo;
    return img ? [{ href: `/${lang}/projects/${it.slug}`, name: it.name, caption: own ? it.place : t.aerialCaption, img }] : [];
  });
}

// ページ上部の大きな画像と見出し（トップ・事例・地図・素材・樹種で共通）。画像は5秒ごとに切り替える
export function PhotoHero({ slides, t, eyebrow, title, lead }: { slides: Slide[]; t: BrowseText; eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="relative h-[clamp(300px,34vw,460px)] overflow-hidden bg-ink text-white">
      <HeroSlides slides={slides} labels={{ pause: t.slidePause, play: t.slidePlay, go: t.slideGo }} />
      <div className="wrap pointer-events-none absolute inset-x-0 bottom-[76px] md:bottom-[72px]">
        <div className="grid max-w-[980px] gap-3.5">
          <span className="eyebrow !text-white/75">{eyebrow}</span>
          <h1 className="text-[clamp(30px,4.6vw,66px)] font-extrabold leading-[1.04] tracking-[-0.022em]">{title}</h1>
          {lead && <p className="hidden max-w-[52ch] text-[14px] leading-[1.75] text-white/85 lg:block">{lead}</p>}
        </div>
      </div>
    </div>
  );
}

// トップと「事例から探す」のヒーロー
export function ProjectHero({ lang, items, t, title, lead }: { lang: Locale; items: BrowseItem[]; t: BrowseText; title: string; lead?: string }) {
  return <PhotoHero slides={projectSlides(lang, items, t)} t={t} eyebrow={fmt(t.heroEyebrow, items.length)} title={title} lead={lead} />;
}
