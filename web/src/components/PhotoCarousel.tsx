"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Icon } from "./Icon";

export type PhotoPoint = { x: number; y: number; kind: "species" | "material"; title: string; sub?: string; note?: string; href?: string };
export type Slide = { src: string; alt: string; caption?: string; points: PhotoPoint[] };
export type CarouselLabels = { species: string; material: string; more: string; prev: string; next: string; show: string; hide: string; close: string };

// 事例の写真を横に並べるカルーセル。1画面の枚数は スマホ 1枚（次が少しのぞく）・タブレット 2枚・PC 3枚
// 写真の上のポイントを押すと、その場所の樹種・素材がわかる（tecture のような仕組み）
export function PhotoCarousel({ slides, labels }: { slides: Slide[]; labels: CarouselLabels }) {
  const track = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [showPoints, setShowPoints] = useState(true);
  const hasPoints = slides.some((s) => s.points.length);

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const slide = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: dir * ((slide?.offsetWidth ?? el.clientWidth) + 12), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-end gap-2">
        {hasPoints && (
          <button type="button" onClick={() => { setShowPoints((v) => !v); setOpen(null); }} className="mr-auto text-xs text-muted hover:text-ink">
            {showPoints ? labels.hide : labels.show}
          </button>
        )}
        {slides.length > 1 && (
          <>
            <button type="button" onClick={() => scrollBy(-1)} aria-label={labels.prev} className="grid h-9 w-9 place-items-center rounded-full border border-line hover:border-ink">
              <Icon name="arrow" className="ico !h-4 !w-4 rotate-180" />
            </button>
            <button type="button" onClick={() => scrollBy(1)} aria-label={labels.next} className="grid h-9 w-9 place-items-center rounded-full border border-line hover:border-ink">
              <Icon name="arrow" className="ico !h-4 !w-4" />
            </button>
          </>
        )}
      </div>
      <div ref={track} className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((s, i) => (
          <figure key={s.src} className="w-[88%] flex-none snap-start md:w-[calc((100%-12px)/2)] lg:w-[calc((100%-24px)/3)]">
            {/* ポイントは写真の幅・高さに対する割合で置くので、写真は切り抜かずに全体を出す */}
            <div className="relative overflow-visible" onClick={(e) => e.target === e.currentTarget.firstElementChild && setOpen(null)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} loading={i < 3 ? "eager" : "lazy"} className="block w-full rounded-sm" />
              {showPoints &&
                s.points.map((p, j) => {
                  const id = `${i}-${j}`;
                  const on = open === id;
                  // 写真の端に近いときは、説明の箱を内側に向けて出す
                  const boxX = p.x > 0.6 ? "right-1/2 mr-3" : "left-1/2 ml-3";
                  const boxY = p.y > 0.6 ? "bottom-1/2" : "top-1/2";
                  return (
                    <div key={id} className="absolute" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, zIndex: on ? 20 : 10 }}>
                      <button
                        type="button"
                        aria-label={`${p.kind === "species" ? labels.species : labels.material}: ${p.title}`}
                        aria-expanded={on}
                        onClick={() => setOpen(on ? null : id)}
                        className="group relative grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center"
                      >
                        <span className="absolute inset-0 animate-ping rounded-full bg-white/60 [animation-duration:2.4s]" />
                        <span className={`relative h-5 w-5 rounded-full border-2 border-white shadow-[0_1px_6px_rgba(0,0,0,.45)] ${on ? "bg-ink" : p.kind === "species" ? "bg-[#2f8f5b]" : "bg-[#c47a2c]"}`} />
                      </button>
                      {on && (
                        <div className={`fade-in absolute ${boxX} ${boxY} w-56 rounded-md bg-white p-3 text-left text-ink shadow-[0_10px_30px_rgba(0,0,0,.28)]`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] uppercase tracking-[.12em] text-muted">{p.kind === "species" ? labels.species : labels.material}</span>
                            <button type="button" onClick={() => setOpen(null)} aria-label={labels.close} className="text-muted hover:text-ink">
                              <Icon name="x" className="ico !h-4 !w-4" />
                            </button>
                          </div>
                          <p className="mt-0.5 font-medium leading-snug">{p.title}</p>
                          {p.sub && <p className={`text-xs text-muted ${p.kind === "species" ? "italic" : ""}`}>{p.sub}</p>}
                          {p.note && <p className="mt-1.5 text-xs leading-relaxed">{p.note}</p>}
                          {p.href && (
                            <Link href={p.href} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                              {labels.more} <Icon name="arrow" className="ico !h-3.5 !w-3.5" />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
            <figcaption className="mt-1.5 flex justify-between gap-3 text-xs text-muted">
              <span>{s.caption}</span>
              <span className="num flex-none">{i + 1} / {slides.length}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
