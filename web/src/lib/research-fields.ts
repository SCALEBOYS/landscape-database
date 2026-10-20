// 研究の分野（手法の分類）。研究ページの絞り込みと色分けに使う（サーバーとブラウザの両方）
// 色はサイトのアクセント（#0d6b4e）に合わせた、くすみのある深い色
export const FIELDS = [
  { key: "perception", ja: "知覚・評価", en: "Perception", color: "#8c5a6b" },
  { key: "behavior", ja: "利用・行動", en: "Use & behaviour", color: "#9a7340" },
  { key: "imagery", ja: "画像・データ解析", en: "Imagery & data", color: "#4b6f8c" },
  { key: "spatial", ja: "空間解析", en: "Spatial analysis", color: "#6a5f8a" },
  { key: "environment", ja: "環境・生態", en: "Environment & ecology", color: "#0d6b4e" },
  { key: "design", ja: "設計論", en: "Design research", color: "#6f6a52" },
] as const;

export type FieldKey = (typeof FIELDS)[number]["key"];
export const fieldOf = (key: string) => FIELDS.find((f) => f.key === key) ?? FIELDS[0];
