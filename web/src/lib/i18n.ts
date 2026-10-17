export const locales = ["ja", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ja";
export const LANG_COOKIE = "lang";

export const hasLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

const ja = {
  siteName: "Landscape Database",
  tagline: "日本のランドスケープ事例データベース",
  nav: { projects: "事例", species: "樹種", designers: "設計者" },
  view: { grid: "写真", map: "地図" },
  filter: {
    keyword: "名称・設計者・樹種で検索",
    use: "用途",
    prefecture: "都道府県",
    species: "樹種",
    paving: "舗装材",
    designer: "設計者",
    all: "すべて",
    reset: "条件をクリア",
    count: (n: number) => `${n}件`,
    more: "もっと見る",
    none: "条件に合う事例がありません",
  },
  project: {
    basics: "基本情報",
    use: "用途",
    location: "所在地",
    completed: "竣工",
    area: "敷地面積",
    designers: "設計",
    awards: "受賞",
    sources: "出典",
    plantings: "植栽",
    components: "構成要素",
    children: "この中の空間",
    noPlantings: "植栽データは未登録です",
    noComponents: "構成要素データは未登録です",
    noPhoto: "写真準備中",
    approxLocation: "位置は概算です",
  },
  species: {
    title: "樹種",
    aliases: "別名",
    family: "科",
    form: "生活形",
    evergreen: "常緑",
    deciduous: "落葉",
    usedIn: "この樹種を使っている事例",
    usedCount: (n: number) => `${n}件の事例`,
    noProjects: "まだ事例がありません",
  },
  designers: { title: "設計者", projects: "設計した事例", count: (n: number) => `${n}件` },
  footer: {
    copyright: "写真の無断転載を禁じます © Landscape Database",
    policy: "写真はすべて自前で撮影したものです。文章は公開情報を要約し、出典へのリンクを付けています。",
  },
  englishPending: "",
};

type Dict = typeof ja;

const en: Dict = {
  siteName: "Landscape Database",
  tagline: "A database of landscape architecture in Japan",
  nav: { projects: "Projects", species: "Plants", designers: "Designers" },
  view: { grid: "Photos", map: "Map" },
  filter: {
    keyword: "Search by name, designer or plant",
    use: "Type",
    prefecture: "Prefecture",
    species: "Plant",
    paving: "Paving",
    designer: "Designer",
    all: "All",
    reset: "Clear filters",
    count: (n: number) => `${n} ${n === 1 ? "project" : "projects"}`,
    more: "Show more",
    none: "No projects match these filters",
  },
  project: {
    basics: "Overview",
    use: "Type",
    location: "Location",
    completed: "Completed",
    area: "Site area",
    designers: "Design",
    awards: "Awards",
    sources: "Sources",
    plantings: "Planting",
    components: "Elements",
    children: "Spaces within this project",
    noPlantings: "No planting data yet",
    noComponents: "No element data yet",
    noPhoto: "Photos coming soon",
    approxLocation: "Location is approximate",
  },
  species: {
    title: "Plants",
    aliases: "Also known as",
    family: "Family",
    form: "Growth form",
    evergreen: "Evergreen",
    deciduous: "Deciduous",
    usedIn: "Projects using this plant",
    usedCount: (n: number) => `${n} ${n === 1 ? "project" : "projects"}`,
    noProjects: "No projects yet",
  },
  designers: { title: "Designers", projects: "Projects", count: (n: number) => `${n} ${n === 1 ? "project" : "projects"}` },
  footer: {
    copyright: "Do not reproduce photos without permission © Landscape Database",
    policy: "All photos are our own. Texts summarize public information and link to their sources.",
  },
  englishPending: "The English description for this project is still being reviewed.",
};

const dictionaries: Record<Locale, Dict> = { ja, en };
export const getDictionary = (locale: Locale) => dictionaries[locale];

export const categoryLabels: Record<string, { ja: string; en: string }> = {
  park: { ja: "公園", en: "Park" },
  plaza: { ja: "広場", en: "Plaza" },
  greenway: { ja: "緑道", en: "Greenway" },
  street: { ja: "街路", en: "Street" },
  waterfront: { ja: "水辺", en: "Waterfront" },
  commercial: { ja: "商業施設外構", en: "Commercial" },
  office: { ja: "オフィス外構・公開空地", en: "Office / public open space" },
  housing: { ja: "集合住宅外構", en: "Housing" },
  public_facility: { ja: "公共建築外構", en: "Public facility" },
  education: { ja: "学校・キャンパス", en: "Campus" },
  healthcare: { ja: "病院・福祉", en: "Healthcare" },
  rooftop: { ja: "屋上緑化", en: "Rooftop garden" },
  wall_greening: { ja: "壁面緑化", en: "Green wall" },
  redevelopment: { ja: "再開発", en: "Redevelopment" },
  other: { ja: "その他", en: "Other" },
};

export const layerLabels: Record<string, { ja: string; en: string }> = {
  tall_tree: { ja: "高木", en: "Tall trees" },
  mid_tree: { ja: "中木", en: "Small trees" },
  shrub: { ja: "低木", en: "Shrubs" },
  ground_cover: { ja: "地被", en: "Ground cover" },
  climber: { ja: "つる", en: "Climbers" },
  other: { ja: "その他", en: "Other" },
};

export const componentKindLabels: Record<string, { ja: string; en: string }> = {
  paving: { ja: "舗装", en: "Paving" },
  furniture: { ja: "ファニチャー", en: "Furniture" },
  lighting: { ja: "照明", en: "Lighting" },
  water: { ja: "水景", en: "Water" },
  play: { ja: "遊具", en: "Play" },
  greening_system: { ja: "屋上・壁面緑化", en: "Greening systems" },
  wall_fence: { ja: "擁壁・柵", en: "Walls and fences" },
  other: { ja: "その他", en: "Other" },
};

export const growthFormLabels: Record<string, { ja: string; en: string }> = {
  tree: { ja: "高木・中木", en: "Tree" },
  shrub: { ja: "低木", en: "Shrub" },
  ground_cover: { ja: "地被", en: "Ground cover" },
  climber: { ja: "つる", en: "Climber" },
  grass: { ja: "草本・芝", en: "Grass" },
  fern: { ja: "シダ", en: "Fern" },
  aquatic: { ja: "水生", en: "Aquatic" },
  bamboo: { ja: "竹・ササ", en: "Bamboo" },
  other: { ja: "その他", en: "Other" },
};

export const prefectureEn: Record<string, string> = {
  大阪府: "Osaka",
  兵庫県: "Hyogo",
  京都府: "Kyoto",
  滋賀県: "Shiga",
  奈良県: "Nara",
  和歌山県: "Wakayama",
};

export const label = (map: Record<string, { ja: string; en: string }>, key: string, locale: Locale) =>
  map[key]?.[locale] ?? key;

export const localName = (locale: Locale, ja: string, en: string | null | undefined) =>
  locale === "en" && en ? en : ja;
