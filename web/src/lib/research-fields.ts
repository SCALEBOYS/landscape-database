// 研究の分野（手法の分類）。研究ページの絞り込みと色分けに使う（サーバーとブラウザの両方）
export const FIELDS = [
  { key: "perception", ja: "知覚・評価", en: "Perception", color: "#d9467a" },
  { key: "behavior", ja: "利用・行動", en: "Use & behaviour", color: "#e07b24" },
  { key: "imagery", ja: "画像・データ解析", en: "Imagery & data", color: "#2f7fd8" },
  { key: "spatial", ja: "空間解析", en: "Spatial analysis", color: "#7a5af0" },
  { key: "environment", ja: "環境・生態", en: "Environment & ecology", color: "#2f9e5b" },
  { key: "design", ja: "設計論", en: "Design research", color: "#8a7445" },
] as const;

export type FieldKey = (typeof FIELDS)[number]["key"];
export const fieldOf = (key: string) => FIELDS.find((f) => f.key === key) ?? FIELDS[0];
