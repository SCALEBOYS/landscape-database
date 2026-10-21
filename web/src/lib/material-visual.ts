// 素材を見た目で探すための色と質感。DB の component_categories.colors / textures と同じキー
export const MATERIAL_COLORS: Record<string, { ja: string; en: string; hex: string }> = {
  white: { ja: "白", en: "White", hex: "#ecebe6" },
  gray: { ja: "グレー", en: "Gray", hex: "#9a9a96" },
  black: { ja: "黒", en: "Black", hex: "#2f2f2d" },
  beige: { ja: "ベージュ", en: "Beige", hex: "#d6c4a1" },
  brown: { ja: "茶", en: "Brown", hex: "#8a6446" },
  red: { ja: "赤・テラコッタ", en: "Red / terracotta", hex: "#b45f45" },
  green: { ja: "緑", en: "Green", hex: "#6f8f5a" },
  blue: { ja: "青・水", en: "Blue / water", hex: "#6c93a8" },
};

export const MATERIAL_TEXTURES: Record<string, { ja: string; en: string }> = {
  smooth: { ja: "なめらか", en: "Smooth" },
  rough: { ja: "ざらざら", en: "Rough" },
  grainy: { ja: "粒・砂利感", en: "Grainy" },
  pattern: { ja: "目地・パターン", en: "Jointed / patterned" },
  natural: { ja: "不揃い・自然", en: "Irregular / natural" },
  wood: { ja: "木目", en: "Wood grain" },
  soft: { ja: "やわらか", en: "Soft" },
  metal: { ja: "金属", en: "Metal" },
  water: { ja: "水面", en: "Water" },
};

// 写真がまだない素材の見本。色を並べ、質感ごとの模様を重ねる（CSS の背景）
export function swatchStyle(colors: string[], texture?: string): React.CSSProperties {
  const hexes = (colors.length ? colors : ["gray"]).map((c) => MATERIAL_COLORS[c]?.hex ?? "#9a9a96");
  const base = hexes.length === 1 ? hexes[0] : `linear-gradient(90deg, ${hexes.map((h, i) => `${h} ${(i / hexes.length) * 100}% ${((i + 1) / hexes.length) * 100}%`).join(", ")})`;
  const line = "rgba(255,255,255,.28)";
  const dark = "rgba(0,0,0,.14)";
  const overlay: Record<string, string> = {
    pattern: `linear-gradient(${line} 2px, transparent 2px) 0 0 / 28px 14px, linear-gradient(90deg, ${line} 2px, transparent 2px) 0 0 / 28px 14px`,
    grainy: `radial-gradient(${dark} 1.2px, transparent 1.6px) 0 0 / 7px 7px, radial-gradient(${line} 1px, transparent 1.4px) 3px 4px / 9px 9px`,
    rough: `radial-gradient(${dark} .8px, transparent 1.2px) 0 0 / 4px 4px`,
    natural: `radial-gradient(circle at 30% 40%, ${line} 0 18%, transparent 19%) 0 0 / 46px 38px, radial-gradient(circle at 70% 70%, ${dark} 0 14%, transparent 15%) 0 0 / 38px 30px`,
    wood: `repeating-linear-gradient(90deg, ${dark} 0 1px, transparent 1px 9px), repeating-linear-gradient(90deg, transparent 0 40px, ${line} 40px 42px)`,
    soft: `radial-gradient(circle, ${line} 0 30%, transparent 60%) 0 0 / 22px 22px`,
    metal: `linear-gradient(115deg, transparent 30%, ${line} 45%, transparent 60%)`,
    water: `repeating-radial-gradient(circle at 30% 40%, ${line} 0 1px, transparent 1px 12px)`,
    smooth: `linear-gradient(160deg, ${line}, transparent 55%)`,
  };
  const o = texture ? overlay[texture] : undefined;
  return { background: o ? `${o}, ${base}` : base };
}
