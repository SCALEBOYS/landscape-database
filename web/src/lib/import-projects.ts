// 事例の一括取り込み: スプレッドシートから貼り付けた表（タブ区切り）や CSV を読み、取り込む行の形にそろえる
// 列名は日本語・英語のどちらでもよい（例: 「名称」でも「name_ja」でも）。知らない列は無視する

import { categoryLabels } from "./i18n";

export type ImportRow = {
  line: number; // 表の何行目か（見出しを1行目とする）
  name_ja: string;
  name_en: string;
  use_category: string;
  other_uses: string[];
  prefecture: string;
  municipality: string;
  address: string;
  lat: number | null;
  lng: number | null;
  completed_year: number | null;
  completed_on: string | null; // 月・日まで分かれば YYYY-MM-DD（月までなら 1 日）
  completed_precision: "year" | "month" | "day";
  site_area_m2: number | null;
  designers: string[];
  awards: { name: string; year: number | null }[];
  sources: string[];
  summary_ja: string;
  slug: string;
  errors: string[];
};

// 列名の言い換え（すべて小文字・空白なしで比べる）
const ALIASES: Record<string, string[]> = {
  name_ja: ["name_ja", "名称", "事例名", "名前", "名称（日本語）", "物件名"],
  name_en: ["name_en", "英語名", "名称（英語）", "english"],
  use_category: ["use_category", "用途", "use"],
  prefecture: ["prefecture", "都道府県", "府県"],
  municipality: ["municipality", "市区町村", "市町村"],
  address: ["address", "address_ja", "住所", "所在地"],
  lat: ["lat", "latitude", "緯度"],
  lng: ["lng", "lon", "longitude", "経度"],
  completed_year: ["completed_year", "竣工年", "竣工", "竣工日", "完成年", "開園年"],
  site_area_m2: ["site_area_m2", "面積", "敷地面積", "面積（㎡）", "面積(m2)"],
  designers: ["designers", "設計", "設計者", "設計事務所", "designer"],
  award: ["award", "awards", "受賞", "受賞歴"],
  award_year: ["award_year", "受賞年"],
  sources: ["source_url", "sources", "source", "出典", "出典url", "url"],
  summary_ja: ["summary_ja", "概要", "説明", "summary"],
  slug: ["slug"],
};

const norm = (s: string) => s.replace(/[\s　]/g, "").toLowerCase();

// タブ区切り（スプレッドシートからの貼り付け）か CSV かを見分けて、セルの二次元配列にする
export function parseTable(text: string): string[][] {
  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const firstLine = src.split("\n", 1)[0] ?? "";
  const sep = firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const toNum = (s: string) => {
  const v = Number(s.replace(/[,，㎡m²\s]/g, ""));
  return s.trim() && Number.isFinite(v) ? v : null;
};
const toYear = (s: string) => {
  const m = s.match(/(18|19|20)\d{2}/);
  return m ? Number(m[0]) : null;
};
// 竣工: 「2023」「2023-04」「2023/4/1」「2023年4月1日」などを、年・日付・精度にする
function toCompletion(v: string): { completed_year: number | null; completed_on: string | null; completed_precision: "year" | "month" | "day" } {
  const m = v.match(/((?:18|19|20)\d{2})\s*[-/.年]\s*(\d{1,2})(?:\s*[-/.月]\s*(\d{1,2}))?/);
  const pad = (n: string) => n.padStart(2, "0");
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) {
    const y = Number(m[1]);
    if (m[3] && Number(m[3]) >= 1 && Number(m[3]) <= 31) return { completed_year: y, completed_on: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, completed_precision: "day" };
    return { completed_year: y, completed_on: `${m[1]}-${pad(m[2])}-01`, completed_precision: "month" };
  }
  return { completed_year: toYear(v), completed_on: null, completed_precision: "year" };
}
// 「／」「/」「、」「,」「;」「改行」で分ける
const splitList = (s: string) => s.split(/[／/、,，;；\n]+/).map((x) => x.trim()).filter(Boolean);

// 用途は、英語のキー（park）でも日本語（公園）でもよい
function useKey(v: string) {
  const s = v.trim();
  if (!s) return "";
  if (categoryLabels[s]) return s;
  const hit = Object.entries(categoryLabels).find(([, l]) => l.ja === s || l.en.toLowerCase() === s.toLowerCase() || l.ja.split("・").includes(s));
  return hit?.[0] ?? "";
}

export function toImportRows(table: string[][]): { rows: ImportRow[]; unknownColumns: string[] } {
  const [head = [], ...body] = table;
  const index: Record<string, number> = {};
  const unknownColumns: string[] = [];
  head.forEach((h, i) => {
    const key = Object.entries(ALIASES).find(([, names]) => names.some((n) => norm(n) === norm(h)))?.[0];
    if (key && index[key] === undefined) index[key] = i;
    else if (!key && h.trim()) unknownColumns.push(h.trim());
  });
  const get = (r: string[], key: string) => (index[key] === undefined ? "" : (r[index[key]] ?? "").trim());

  const rows = body.map((r, k): ImportRow => {
    const awardYear = toYear(get(r, "award_year"));
    const errors: string[] = [];
    const name_ja = get(r, "name_ja");
    const rawUse = get(r, "use_category");
    // 「公園／広場」のように複数書ける。最初が主な用途
    const useParts = splitList(rawUse);
    const useKeys = useParts.map(useKey);
    const use_category = useKeys[0] ?? "";
    const badUse = useParts.find((u, i) => !useKeys[i]);
    const prefecture = get(r, "prefecture");
    if (!name_ja) errors.push("名称がありません");
    if (!prefecture) errors.push("都道府県がありません");
    if (!rawUse) errors.push("用途がありません");
    else if (badUse) errors.push(`用途「${badUse}」が分かりません`);
    const lat = toNum(get(r, "lat"));
    const lng = toNum(get(r, "lng"));
    if ((lat === null) !== (lng === null) || (lat !== null && (Math.abs(lat) > 90 || Math.abs(lng!) > 180))) errors.push("緯度・経度が正しくありません");
    return {
      line: k + 2,
      name_ja,
      name_en: get(r, "name_en"),
      use_category,
      other_uses: [...new Set(useKeys.slice(1))].filter((u) => u && u !== use_category),
      prefecture,
      municipality: get(r, "municipality"),
      address: get(r, "address"),
      lat: errors.some((e) => e.startsWith("緯度")) ? null : lat,
      lng: errors.some((e) => e.startsWith("緯度")) ? null : lng,
      ...toCompletion(get(r, "completed_year")),
      site_area_m2: toNum(get(r, "site_area_m2")),
      designers: splitList(get(r, "designers")),
      awards: splitList(get(r, "award")).map((name) => ({ name, year: awardYear })),
      sources: get(r, "sources").split(/[\s;；]+/).filter((u) => /^https?:\/\//.test(u)),
      summary_ja: get(r, "summary_ja"),
      slug: get(r, "slug"),
      errors,
    };
  });
  return { rows, unknownColumns };
}

// 取り込み用のひな形（スプレッドシートの1行目にそのまま使える）
export const TEMPLATE_HEADERS = ["名称", "英語名", "用途", "都道府県", "市区町村", "住所", "緯度", "経度", "竣工年", "面積", "設計", "受賞", "受賞年", "出典", "概要"];
export const TEMPLATE_EXAMPLE = ["東遊園地再整備", "Higashi Yuenchi Park", "公園／広場", "兵庫県", "神戸市中央区", "兵庫県神戸市中央区加納町6丁目4", "", "", "2023", "", "空間創研／公園マネジメント研究所", "CLA賞設計部門最優秀賞", "2023", "https://www.cla.or.jp/", "（自分の言葉で短く）"];

// CSV に書き出す（ひな形と書き出しで共通）。カンマ・改行・引用符を含むセルは引用符で囲む
const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
export const toCsv = (rows: string[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
