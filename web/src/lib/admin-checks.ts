// 事例ごとに、入力が足りているかを見る項目
export const CHECKS = [
  { key: "coords", label: "座標" },
  { key: "year", label: "竣工年" },
  { key: "summary", label: "説明" },
  { key: "english", label: "英訳" },
  { key: "designers", label: "設計" },
  { key: "sources", label: "出典" },
  { key: "plantings", label: "植栽" },
  { key: "components", label: "素材" },
  { key: "photos", label: "写真" },
] as const;
export type CheckKey = (typeof CHECKS)[number]["key"];

type Counted = { count: number }[];
export type ProjectStatusSource = {
  completed_year: number | null;
  summary_ja: string | null;
  summary_en_status: string;
  photos: Counted;
  credits: Counted;
  sources: Counted;
  plantings: Counted;
  components: Counted;
};
export const STATUS_SELECT =
  "completed_year, summary_ja, summary_en_status, photos(count), credits:project_credits(count), sources(count), plantings:project_plantings(count), components:project_components(count)";

const n = (v: Counted) => v[0]?.count ?? 0;
// 事例の行（STATUS_SELECT で取ったもの）と座標の有無から、項目ごとの入力の有無を出す
export function projectChecks(p: ProjectStatusSource, located: boolean): Record<CheckKey, boolean> {
  return {
    coords: located,
    year: !!p.completed_year,
    summary: !!p.summary_ja?.trim(),
    english: p.summary_en_status === "reviewed",
    designers: n(p.credits) > 0,
    sources: n(p.sources) > 0,
    plantings: n(p.plantings) > 0,
    components: n(p.components) > 0,
    photos: n(p.photos) > 0,
  };
}
