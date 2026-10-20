"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import type { Map as MapboxMap } from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

import { MAPBOX_TOKEN, MODEL_CONFIG, SATELLITE_CONFIG, satelliteImage, STYLE_MAP, STYLE_SATELLITE } from "@/lib/mapbox";

type Mode = "photo" | "3d" | "flat";
type Labels = { photo: string; d3: string; flat: string; note: string; view: string };
// 地図に置く 3D モデル（GLB）。位置は事例の座標からの東・北のずれ（m）で決める
export type MapModel = { url: string; offsetEast: number; offsetNorth: number; altitude: number; rotation: number; scale: number };

const VIEW_3D = { zoom: 16.4, pitch: 62, bearing: -24 };
const VIEW_FLAT = { zoom: 16, pitch: 0, bearing: 0 };
// 3D は Standard スタイルの建物・樹木・ランドマークの 3D モデル、平面は航空写真
const styleFor = (m: Mode) => (m === "3d" ? { style: STYLE_MAP, config: MODEL_CONFIG } : { style: STYLE_SATELLITE, config: SATELLITE_CONFIG });
type SetStyleOptions = Parameters<MapboxMap["setStyle"]>[1];

// 事例詳細の大きな見出し画像。最初は必ず静止画（自分の写真、なければ航空写真の静止画）を出し、3D の地図はボタンで切り替える
export function SiteHero({
  photo,
  lat,
  lng,
  alt,
  labels,
  models = [],
  children,
}: {
  models?: MapModel[];
  photo: string | null;
  lat: number | null;
  lng: number | null;
  alt: string;
  labels: Labels;
  children: React.ReactNode;
}) {
  const canMap = lat !== null && lng !== null && !!MAPBOX_TOKEN;
  const still = photo ?? (canMap ? satelliteImage(lat!, lng!, { w: 1280, h: 720, zoom: 17 }) : null);
  // 写真がないときは静止画がすでに航空写真なので、平面の航空写真地図は出さない
  const modes: Mode[] = [...(still ? (["photo"] as const) : []), ...(canMap ? (["3d"] as const) : []), ...(photo && canMap ? (["flat"] as const) : [])];
  const [mode, setMode] = useState<Mode>(modes[0] ?? "photo");
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const showMap = mode !== "photo";

  // 地図は最初に必要になったときに作り、以後は表示を切り替えるだけ
  useEffect(() => {
    if (!showMap || mapRef.current || !box.current || !canMap) return;
    let cancelled = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled || !box.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const m = new mapboxgl.Map({
        container: box.current,
        ...styleFor(mode),
        center: [lng!, lat!],
        ...(mode === "3d" ? VIEW_3D : VIEW_FLAT),
        interactive: false,
        attributionControl: true,
      });
      mapRef.current = m;
      // スタイルを切り替えるとレイヤーは消えるので、読み込むたびにモデルを置き直す
      const placeModels = () => {
        models.forEach((md, k) => {
          const id = `project-model-${k}`;
          const latM = lat! + md.offsetNorth / 111320;
          const lngM = lng! + md.offsetEast / (111320 * Math.cos((lat! * Math.PI) / 180));
          if (!m.hasModel(id)) m.addModel(id, md.url);
          if (!m.getSource(id)) m.addSource(id, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lngM, latM] } } });
          if (!m.getLayer(id)) {
            m.addLayer({
              id,
              type: "model",
              source: id,
              layout: { "model-id": id },
              paint: {
                "model-scale": [md.scale, md.scale, md.scale],
                "model-rotation": [0, 0, md.rotation],
                "model-translation": [0, 0, md.altitude],
                "model-type": "common-3d",
                "model-cast-shadows": true,
              },
            });
          }
        });
      };
      if (models.length) m.on("style.load", placeModels);
      // 3D のときはゆっくり回り込む。動きを減らす設定の人には回さない
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let dir = 1;
      const orbit = () => {
        if (calm || m.getPitch() < 30) return;
        dir = -dir;
        m.easeTo({ bearing: VIEW_3D.bearing + dir * 18, duration: 26000, easing: (x) => x });
      };
      m.on("moveend", orbit);
      m.once("load", orbit);
    });
    return () => {
      cancelled = true;
    };
  }, [showMap, canMap, lat, lng, mode, models]);

  useEffect(() => () => mapRef.current?.remove(), []);

  const choose = (next: Mode) => {
    setMode(next);
    const m = mapRef.current;
    if (!m) return;
    m.stop();
    if (next !== "photo") {
      const { style, config } = styleFor(next);
      m.setStyle(style, { config } as unknown as SetStyleOptions);
    }
    if (next === "3d") m.easeTo({ ...VIEW_3D, duration: 1200 });
    if (next === "flat") m.easeTo({ ...VIEW_FLAT, duration: 1200 });
  };

  const names: Record<Mode, string> = { photo: photo ? labels.photo : labels.flat, "3d": labels.d3, flat: labels.flat };

  return (
    <section className="d-hero">
      {still && mode === "photo" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={still} alt={alt} className="absolute inset-0 h-full w-full object-cover" style={{ animation: "drift 26s ease-in-out infinite alternate" }} />
      )}
      <div className="absolute inset-0" style={{ visibility: showMap ? "visible" : "hidden" }}>
        <div ref={box} className="h-full w-full" />
      </div>
      <div className="shade" />
      {!photo && canMap && <span className="hnote">{labels.note}</span>}
      {modes.length > 1 && (
        <div className="hctl" role="group" aria-label={labels.view}>
          {modes.map((k) => (
            <button key={k} type="button" aria-pressed={mode === k} onClick={() => choose(k)}>
              {names[k]}
            </button>
          ))}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 z-[3] pb-8 text-white">{children}</div>
    </section>
  );
}
