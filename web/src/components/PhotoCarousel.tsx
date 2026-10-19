"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icon } from "./Icon";

export type PhotoPoint = { x: number; y: number; kind: "species" | "material"; title: string; sub?: string; note?: string; href?: string };
export type Slide = { src: string; alt: string; caption?: string; points: PhotoPoint[] };
export type CarouselLabels = { species: string; material: string; more: string; prev: string; next: string; show: string; hide: string; close: string };

const CARD_W = 224;
const GAP = 12;

// 事例の写真を横に並べるカルーセル。1画面の枚数は スマホ 約1.4枚（次が半分ほどのぞく）・タブレット 3枚・PC 4枚
// 写真の上のポイントを押すと、その場所の樹種・素材がわかる（tecture のような仕組み）
export function PhotoCarousel({ slides, labels }: { slides: Slide[]; labels: CarouselLabels }) {
  const track = useRef<HTMLDivElement>(null);
  // 説明の箱は写真の枠に切られないよう、画面に対して位置を決めて出す
  const [open, setOpen] = useState<{ id: string; point: PhotoPoint; left: number; top: number } | null>(null);
  const [showPoints, setShowPoints] = useState(true);
  const hasPoints = slides.some((s) => s.points.length);

  // スクロールや画面サイズの変更で位置がずれるので、そのときは閉じる
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    const el = track.current;
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    el?.addEventListener("scroll", close, { passive: true });
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
      el?.removeEventListener("scroll", close);
    };
  }, [open]);

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const slide = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: dir * ((slide?.offsetWidth ?? el.clientWidth) + GAP), behavior: "smooth" });
  };

  const toggle = (id: string, point: PhotoPoint, button: HTMLElement) => {
    if (open?.id === id) return setOpen(null);
    const r = button.getBoundingClientRect();
    const right = r.right + GAP + CARD_W <= window.innerWidth;
    const left = right ? r.right + GAP / 2 : Math.max(8, r.left - GAP / 2 - CARD_W);
    const top = Math.min(Math.max(8, r.top - 16), window.innerHeight - 220);
    setOpen({ id, point, left, top });
  };

  const p = open?.point;

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
            <button type="button" onClick={() => scrollBy(-1)} aria-label={labels.prev} className="grid h-8 w-8 place-items-center rounded-full border border-line hover:border-ink">
              <Icon name="arrow" className="ico !h-4 !w-4 rotate-180" />
            </button>
            <button type="button" onClick={() => scrollBy(1)} aria-label={labels.next} className="grid h-8 w-8 place-items-center rounded-full border border-line hover:border-ink">
              <Icon name="arrow" className="ico !h-4 !w-4" />
            </button>
          </>
        )}
      </div>
      <div ref={track} className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((s, i) => (
          <figure key={s.src} className="w-[70%] flex-none snap-start md:w-[calc((100%-24px)/3)] lg:w-[calc((100%-36px)/4)]">
            {/* ポイントは写真の幅・高さに対する割合で置くので、写真は切り抜かずに全体を出す */}
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.alt} loading={i < 4 ? "eager" : "lazy"} className="block w-full rounded-sm" />
              {showPoints &&
                s.points.map((pt, j) => {
                  const id = `${i}-${j}`;
                  const on = open?.id === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={`${pt.kind === "species" ? labels.species : labels.material}: ${pt.title}`}
                      aria-expanded={on}
                      onClick={(e) => toggle(id, pt, e.currentTarget)}
                      className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center"
                      style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
                    >
                      <span className="absolute inset-0 animate-ping rounded-full bg-white/60 [animation-duration:2.4s]" />
                      <span className={`relative h-4 w-4 rounded-full border-2 border-white shadow-[0_1px_6px_rgba(0,0,0,.45)] ${on ? "bg-ink" : pt.kind === "species" ? "bg-[#2f8f5b]" : "bg-[#c47a2c]"}`} />
                    </button>
                  );
                })}
            </div>
            <figcaption className="mt-1 flex justify-between gap-3 text-[11px] text-muted">
              <span className="truncate">{s.caption}</span>
              <span className="num flex-none">{i + 1} / {slides.length}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {open && p && (
        <>
          <button type="button" aria-label={labels.close} onClick={() => setOpen(null)} className="fixed inset-0 z-40 cursor-default" />
          <div className="fade-in fixed z-50 rounded-md bg-white p-3 text-left text-ink shadow-[0_10px_30px_rgba(0,0,0,.28)]" style={{ left: open.left, top: open.top, width: CARD_W }}>
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
        </>
      )}
    </div>
  );
}
