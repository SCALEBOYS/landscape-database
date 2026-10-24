"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useEffect, useRef, useState } from "react";

import { MAPBOX_TOKEN, SATELLITE_CONFIG, STYLE_SATELLITE } from "@/lib/mapbox";
import { shotMarker } from "@/lib/shot-marker";

import { Icon } from "./Icon";

export type Spot = { n: number; lat: number; lng: number; heading: number | null; src: string; caption: string };

// 事例の写真をどこから・どの向きで撮ったかを航空写真の上に出す。点を押すとその写真が出る
export function PhotoSpotMap({ spots, total, labels }: { spots: Spot[]; total: number; labels: { title: string; hint: string; close: string } }) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Spot | null>(null);

  useEffect(() => {
    if (!box.current || !MAPBOX_TOKEN || !spots.length) return;
    let cancelled = false;
    let remove = () => {};
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !box.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const m = new mapboxgl.Map({
        container: box.current,
        style: STYLE_SATELLITE,
        config: SATELLITE_CONFIG,
        center: [spots[0].lng, spots[0].lat],
        zoom: 17,
        // 北を上に固定する（扇形の向きがずれないように）
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        cooperativeGestures: true,
      });
      m.touchZoomRotate.disableRotation();
      m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      if (spots.length > 1) {
        const b = new mapboxgl.LngLatBounds();
        spots.forEach((s) => b.extend([s.lng, s.lat]));
        m.fitBounds(b, { padding: 60, maxZoom: 18.5, duration: 0 });
      }
      const markers = spots.map((s) => {
        const el = shotMarker(s.n, s.heading);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setOpen(s);
        });
        return new mapboxgl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(m);
      });
      remove = () => {
        markers.forEach((mk) => mk.remove());
        m.remove();
      };
    });
    return () => {
      cancelled = true;
      remove();
    };
  }, [spots]);

  return (
    <section className="grid gap-3 pt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-ink pt-3">
        <h2 className="text-[13px] font-medium tracking-[.1em] text-muted">{labels.title}</h2>
        <span className="text-xs text-muted">{labels.hint}</span>
      </div>
      <div className="relative h-[clamp(220px,26vw,320px)] overflow-hidden rounded-sm bg-placeholder">
        {/* Mapbox の CSS が地図の箱を position: relative にするので、外側の箱で大きさを決める */}
        <div className="absolute inset-0">
          <div ref={box} className="h-full w-full" />
        </div>
        {open && (
          <figure className="fade-in absolute bottom-3 left-3 z-10 w-[min(320px,calc(100%-24px))] overflow-hidden rounded-md bg-white shadow-[0_10px_30px_rgba(0,0,0,.3)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.src} alt={open.caption} className="aspect-[16/9] w-full object-cover" />
            <figcaption className="flex items-start justify-between gap-2 p-2.5 text-xs">
              <span>
                <span className="num mr-2 text-muted">{open.n} / {total}</span>
                {open.caption}
              </span>
              <button type="button" onClick={() => setOpen(null)} aria-label={labels.close} className="text-muted hover:text-ink">
                <Icon name="x" className="ico !h-4 !w-4" />
              </button>
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
