// 検索・探索画面（クライアント側）に渡す1事例分のデータ。サーバーで組み立てて JSON で渡す
export type Ref = { slug: string; label: string; sub?: string };

export type BrowseItem = {
  slug: string;
  name: string;
  place: string;
  pref: string;
  prefLabel: string;
  muni: string;
  year: number | null;
  use: string;
  useLabel: string;
  elements: string[];
  species: Ref[];
  designers: Ref[];
  paving: Ref[];
  laws: Ref[];
  lat: number | null;
  lng: number | null;
  photo: string | null;
  // 名称・設計者・樹種（和名／学名／別名）・地名を小文字でつないだもの
  search: string;
};

export type Filters = {
  q: string;
  uses: string[];
  els: string[];
  prefs: string[];
  munis: string[];
  y0: number | null;
  y1: number | null;
  species: string[];
  designers: string[];
  paving: string[];
  laws: string[];
};

// 探す画面の法令の行に並べる候補（kind はアイコンの出し分けに使う）
export type LawOption = { slug: string; label: string; kind: string };

export const EMPTY: Filters = { q: "", uses: [], els: [], prefs: [], munis: [], y0: null, y1: null, species: [], designers: [], paving: [], laws: [] };

const LIST_KEYS = ["uses", "els", "prefs", "munis", "species", "designers", "paving", "laws"] as const;

export function parseFilters(params: URLSearchParams): Filters {
  const f: Filters = { ...EMPTY, q: params.get("q") ?? "" };
  for (const k of LIST_KEYS) f[k] = params.get(k)?.split(",").filter(Boolean) ?? [];
  const y0 = Number(params.get("y0")), y1 = Number(params.get("y1"));
  f.y0 = y0 || null;
  f.y1 = y1 || null;
  return f;
}

export function toQuery(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const k of LIST_KEYS) if (f[k].length) p.set(k, f[k].join(","));
  if (f.y0) p.set("y0", String(f.y0));
  if (f.y1) p.set("y1", String(f.y1));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// 用途どうしは「いずれか」、要素どうし・法令どうしは「すべて」、軸の間は「かつ」
export function matches(it: BrowseItem, f: Filters, skip?: "uses" | "els" | "laws" | "years") {
  if (f.q && !it.search.includes(f.q.toLowerCase())) return false;
  if (skip !== "uses" && f.uses.length && !f.uses.includes(it.use)) return false;
  if (skip !== "els" && !f.els.every((e) => it.elements.includes(e))) return false;
  if (skip !== "laws" && !f.laws.every((l) => it.laws.some((x) => x.slug === l))) return false;
  if (f.munis.length) {
    if (!f.munis.includes(it.muni)) return false;
  } else if (f.prefs.length && !f.prefs.includes(it.pref)) return false;
  if (skip !== "years" && (f.y0 || f.y1)) {
    if (it.year === null) return false;
    if (f.y0 && it.year < f.y0) return false;
    if (f.y1 && it.year > f.y1) return false;
  }
  if (!f.species.every((s) => it.species.some((x) => x.slug === s))) return false;
  if (f.designers.length && !it.designers.some((d) => f.designers.includes(d.slug))) return false;
  if (!f.paving.every((s) => it.paving.some((x) => x.slug === s))) return false;
  return true;
}
