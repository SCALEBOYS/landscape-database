import type { Project } from "./data";

// 用途（projects.use_category）の並び順。カテゴリの1段目
export const USE_KEYS = [
  "park", "plaza", "greenway", "street", "waterfront", "commercial", "office", "housing",
  "public_facility", "education", "healthcare", "rooftop", "wall_greening", "redevelopment", "other",
] as const;

// 要素（カテゴリの2段目）。部材の種別・細目と植栽から自動で判定する
export const ELEMENTS = [
  { key: "water", ja: "水景", en: "Water" },
  { key: "lawn", ja: "芝生", en: "Lawn" },
  { key: "shade", ja: "木陰", en: "Shade trees" },
  { key: "stone", ja: "石張り", en: "Stone paving" },
  { key: "deck", ja: "木デッキ", en: "Timber deck" },
  { key: "play", ja: "遊具", en: "Play" },
  { key: "bench", ja: "ベンチ", en: "Seating" },
  { key: "light", ja: "照明", en: "Lighting" },
  { key: "mist", ja: "ミスト", en: "Mist" },
  { key: "rain", ja: "レインガーデン", en: "Rain garden" },
] as const;

export const REGIONS: { key: string; ja: string; en: string; prefectures: string[] }[] = [
  { key: "kansai", ja: "関西", en: "Kansai", prefectures: ["大阪府", "京都府", "兵庫県", "滋賀県", "奈良県", "和歌山県"] },
];

export function elementsOf(p: Project): string[] {
  const slugs = new Set(p.components.map((c) => c.category.slug));
  const kinds = new Set(p.components.map((c) => c.category.kind));
  const has = {
    water: kinds.has("water") && [...slugs].some((s) => ["fountain", "stream", "pond"].includes(s)),
    lawn: slugs.has("lawn-paving") || p.plantings.some((pl) => pl.species.growth_form === "grass"),
    shade: p.plantings.some((pl) => pl.layer === "tall_tree"),
    stone: slugs.has("natural-stone"),
    deck: slugs.has("wood-deck"),
    play: kinds.has("play"),
    bench: slugs.has("bench") || slugs.has("table-set"),
    light: kinds.has("lighting"),
    mist: slugs.has("mist"),
    rain: slugs.has("rain-garden"),
  };
  return ELEMENTS.map((e) => e.key).filter((k) => has[k]);
}
