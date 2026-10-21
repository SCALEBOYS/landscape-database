import { HeroSlides, type Slide } from "@/components/HeroSlides";
import type { BrowseItem } from "@/lib/browse";
import { fmt, type BrowseText, type Locale } from "@/lib/i18n";
import { satelliteImage } from "@/lib/mapbox";

// トップと「事例から探す」で共通のヒーロー。5秒ごとに事例を切り替える。自分の写真があれば写真、なければ航空写真
export function ProjectHero({ lang, items, t, title, lead }: { lang: Locale; items: BrowseItem[]; t: BrowseText; title: string; lead?: string }) {
  const slides: Slide[] = items.flatMap((it) => {
    const img = it.photo ?? (it.lat !== null && it.lng !== null ? satelliteImage(it.lat, it.lng, { w: 1280, h: 640, zoom: 16 }) : null);
    return img ? [{ slug: it.slug, name: it.name, caption: it.photo ? it.place : t.aerialCaption, img }] : [];
  });
  return (
    <div className="relative h-[clamp(300px,34vw,460px)] overflow-hidden bg-ink text-white">
      <HeroSlides lang={lang} slides={slides} labels={{ pause: t.slidePause, play: t.slidePlay, go: t.slideGo }} />
      <div className="wrap pointer-events-none absolute inset-x-0 bottom-[76px] md:bottom-[72px]">
        <div className="grid max-w-[980px] gap-3.5">
          <span className="eyebrow !text-white/75">{fmt(t.heroEyebrow, items.length)}</span>
          <h1 className="text-[clamp(30px,4.6vw,66px)] font-extrabold leading-[1.04] tracking-[-0.022em]">{title}</h1>
          {lead && <p className="hidden max-w-[52ch] text-[14px] leading-[1.75] text-white/85 lg:block">{lead}</p>}
        </div>
      </div>
    </div>
  );
}
