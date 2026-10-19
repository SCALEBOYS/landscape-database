"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type Slide = { slug: string; name: string; caption: string; img: string };

const INTERVAL = 5000;

// トップの大きな画像。5秒ごとに次の事例へ切り替える。マウスを乗せている間・停止ボタンで止まる
export function HeroSlides({ lang, slides, labels }: { lang: string; slides: Slide[]; labels: { pause: string; play: string; go: string } }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const n = slides.length;

  useEffect(() => {
    if (n < 2 || paused || hover) return;
    const id = setTimeout(() => setI((x) => (x + 1) % n), INTERVAL);
    return () => clearTimeout(id);
  }, [i, n, paused, hover]);

  if (!n) return null;
  const cur = slides[i];
  // 読み込むのは今の画像と次の画像だけ
  const near = (k: number) => k === i || k === (i + 1) % n;

  return (
    <div className="absolute inset-0" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {slides.map((s, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.slug}
          src={near(k) || k < i ? s.img : undefined}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms]"
          style={{ opacity: k === i ? 1 : 0, animation: k === i ? "drift 26s ease-in-out infinite alternate" : undefined }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-black/65" />
      <Link
        key={cur.slug}
        href={`/${lang}/projects/${cur.slug}`}
        className="fade-in absolute right-4 top-4 z-10 text-right text-xs leading-relaxed text-white/85 hover:text-white md:right-8"
      >
        <b className="block text-sm font-medium">{cur.name}</b>
        {cur.caption}
      </Link>
      {n > 1 && (
        <div className="absolute bottom-[64px] right-4 z-10 flex items-center gap-2 md:right-8">
          {slides.map((s, k) => (
            <button
              key={s.slug}
              type="button"
              aria-label={`${labels.go}: ${s.name}`}
              aria-current={k === i}
              onClick={() => setI(k)}
              className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-white" : "w-1.5 bg-white/45 hover:bg-white/80"}`}
            />
          ))}
          <button type="button" onClick={() => setPaused((p) => !p)} className="ml-1 text-[11px] text-white/80 hover:text-white">
            {paused ? labels.play : labels.pause}
          </button>
        </div>
      )}
    </div>
  );
}
