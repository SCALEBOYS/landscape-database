import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { supabase } from "./data";
import type { Locale } from "./i18n";

// RULE タブ（法律・制度・条例と、事例・研究とのつながり）

export type Topic = "planning" | "park" | "landscape" | "building" | "water" | "road" | "ppp";
export type Role = "system" | "decision" | "zone";
export type LawKind = "law" | "system" | "ordinance";

// 分野ごとの色（年表の帯・図の箱・カードの見出しで共通に使う）
export const TOPICS: { key: Topic; ja: string; en: string; color: string; tint: string }[] = [
  { key: "planning", ja: "都市計画", en: "Planning", color: "#2f5d8a", tint: "#e6eef6" },
  { key: "building", ja: "建築・開発", en: "Building", color: "#6b4f9a", tint: "#efeaf6" },
  { key: "park", ja: "公園・緑地", en: "Parks & green", color: "#0d6b4e", tint: "#e3f1ea" },
  { key: "landscape", ja: "景観・歴史", en: "Landscape & heritage", color: "#9a6a1f", tint: "#f6eedf" },
  { key: "water", ja: "水辺・港", en: "Water & ports", color: "#1f7f97", tint: "#e0f1f5" },
  { key: "road", ja: "道路", en: "Streets", color: "#7a6f62", tint: "#efedea" },
  { key: "ppp", ja: "官民連携・運営", en: "Public-private", color: "#c0492a", tint: "#f9e7e1" },
];
export const topicOf = (k: string | null) => TOPICS.find((t) => t.key === k) ?? TOPICS[0];

// やりたいことから探す
export const PURPOSES: { key: string; ja: string; en: string }[] = [
  { key: "open-space", ja: "広場・空地をつくる", en: "Create open space" },
  { key: "green", ja: "緑を守る・増やす", en: "Protect and add green" },
  { key: "private", ja: "民間の力を生かす", en: "Work with private partners" },
  { key: "waterfront", ja: "水辺を使う", en: "Use the waterfront" },
  { key: "walkable", ja: "歩いて楽しいまちに", en: "Make streets walkable" },
  { key: "heritage", ja: "歴史を生かす", en: "Make use of heritage" },
  { key: "townscape", ja: "まちなみを整える", en: "Shape the townscape" },
  { key: "disaster", ja: "災害に備える", en: "Prepare for disasters" },
  { key: "land", ja: "土地を整える", en: "Reorganize land" },
];

export const ROLES: Record<Role, { ja: string; en: string; mark: string }> = {
  system: { ja: "制度を活用", en: "Used the system", mark: "●" },
  decision: { ja: "都市計画決定・認可", en: "Planning decision", mark: "◆" },
  zone: { ja: "区域・地域の指定", en: "Designated area", mark: "□" },
};

export const ROLE_COLORS: Record<string, string> = { system: "#0d6b4e", decision: "#2f5d8a", zone: "#9a6a1f" };

export const ACTORS = ["国", "都道府県", "自治体", "審議会", "事業者", "住民・地権者"] as const;
export const ACTOR_EN: Record<string, string> = { 国: "National gov.", 都道府県: "Prefecture", 自治体: "Local gov.", 審議会: "Council", 事業者: "Private / operator", "住民・地権者": "Residents / owners" };

type Named = { slug: string; name_ja: string; name_en: string | null };
export type RuleLaw = Named & {
  kind: LawKind;
  short_ja: string | null;
  short_en: string | null;
  jurisdiction_ja: string;
  jurisdiction_en: string | null;
  summary_ja: string | null;
  summary_en: string | null;
  official_url: string | null;
  sort_order: number;
  topic: Topic | null;
  enacted_year: number | null;
  purposes: string[];
  purpose_ja: string | null;
  merits_ja: string[];
  requirements_ja: string[];
  flow: { actor: string; step: string }[];
  milestones: { year: number; label: string }[];
  basis: Named | null;
};
export type RuleUse = {
  law: string;
  role: Role;
  decided_year: number | null;
  note_ja: string | null;
  note_en: string | null;
  source_url: string | null;
  project: Named & { completed_year: number | null; use_category: string; municipality: string | null; prefecture: string };
};
export type RulePaper = { slug: string; title: string; authors: string; year: number; venue: string; volume: string | null; issue: string | null; pages: string | null; doi: string | null; url: string | null; summary_ja: string; laws: string[] };
export type RuleData = { laws: RuleLaw[]; links: { from: string; to: string; note_ja: string | null }[]; uses: RuleUse[]; papers: RulePaper[] };

export async function getRule(): Promise<RuleData> {
  "use cache";
  cacheLife("hours");
  cacheTag("laws");
  cacheTag("projects");
  const db = supabase();
  const [l, k, u, p] = await Promise.all([
    db
      .from("laws")
      .select(
        "slug, kind, name_ja, name_en, short_ja, short_en, jurisdiction_ja, jurisdiction_en, summary_ja, summary_en, official_url, sort_order, topic, enacted_year, purposes, purpose_ja, merits_ja, requirements_ja, flow, milestones, basis:basis_id(slug, name_ja, name_en)",
      )
      .order("sort_order"),
    db.from("law_links").select("note_ja, from:from_law_id(slug), to:to_law_id(slug)"),
    // 非公開の事例は RLS で読めない（project が null になる）
    db.from("project_laws").select("role, decided_year, note_ja, note_en, source_url, sort_order, law:laws(slug), project:projects(slug, name_ja, name_en, completed_year, use_category, municipality, prefecture)").order("sort_order"),
    db.from("papers").select("slug, title, authors, year, venue, volume, issue, pages, doi, url, summary_ja, laws:paper_laws(law:laws(slug))").order("year", { ascending: false }),
  ]);
  for (const r of [l, k, u, p]) if (r.error) throw r.error;
  const links = (k.data as unknown as { note_ja: string | null; from: { slug: string }; to: { slug: string } }[]).map((x) => ({ from: x.from.slug, to: x.to.slug, note_ja: x.note_ja }));
  const uses = (u.data as unknown as (Omit<RuleUse, "law" | "project"> & { law: { slug: string }; project: RuleUse["project"] | null })[])
    .filter((x) => x.project)
    .map((x) => ({ ...x, law: x.law.slug, project: x.project! }));
  const papers = (p.data as unknown as (Omit<RulePaper, "laws"> & { laws: { law: { slug: string } }[] })[])
    .map((x) => ({ ...x, laws: x.laws.map((y) => y.law.slug) }))
    .filter((x) => x.laws.length);
  return { laws: l.data as unknown as RuleLaw[], links, uses, papers };
}

export const lawName = (lang: Locale, l: { name_ja: string; name_en: string | null }) => (lang === "en" ? l.name_en ?? l.name_ja : l.name_ja);
export const lawShort = (lang: Locale, l: RuleLaw) => (lang === "en" ? l.short_en ?? l.name_en ?? l.name_ja : l.short_ja ?? l.name_ja);

export const RULE_T = {
  ja: {
    title: "RULE",
    sub: "法律・制度・都市計画",
    lead: "ランドスケープの事例が、どの法律や制度、都市計画の決定によって実現したのかを、図と年表でたどれます。制度の説明は要点をまとめたもので、正確な内容は原文や自治体の資料を確認してください。",
    stats: { law: "法律", system: "制度", ordinance: "条例", uses: "事例とのつながり" },
    kinds: { law: "法律", system: "制度", ordinance: "条例" } as Record<LawKind, string>,
    map: "制度の地図",
    mapLead: "分野ごとに、国の法律からその法律にもとづく制度、自治体の条例へと並べています。線は「根拠となる法律」です。やりたいことや分野で絞り込めます。",
    purposes: "やりたいこと",
    topics: "分野",
    all: "すべて",
    search: "制度の名前で探す",
    timeline: "年表",
    timelineLead: "法律と制度ができた年を分野ごとの帯に並べ、矢印で影響の流れを示しています。下の段は事例の完成年で、線はその事例が使った制度です（事例にマウスを重ねると強調されます）。",
    matrix: "事例 × 制度",
    matrixLead: "公開中の事例が、どの制度・都市計画の決定・区域の指定のもとで実現したかの一覧です。",
    research: "研究から見る",
    researchLead: "制度の効果や課題を扱った研究です。",
    projects: (n: number) => `${n}件の事例`,
    basic: "基礎情報",
    kind: "種類",
    basis: "根拠となる法律",
    jurisdiction: "所管",
    enacted: "できた年",
    topic: "分野",
    official: "原文を見る",
    purpose: "制度の目的",
    merits: "メリット",
    requirements: "要件・基準",
    flow: "手続きのおおまかな流れ",
    flowNote: "自治体や事業の内容によって手順は変わります。",
    history: "あゆみ",
    usedIn: "この制度で実現した事例",
    related: "関係する制度",
    derived: "この法律にもとづく制度",
    influence: "影響",
    papers: "関係する研究",
    none: "まだ事例が登録されていません",
    source: "出典",
    yearUnknown: "年不明",
    seeAll: "法令の一覧",
  },
  en: {
    title: "RULE",
    sub: "Laws, systems and city planning",
    lead: "Trace which laws, planning systems and city planning decisions made each landscape project possible, through diagrams and a timeline. Summaries are brief; check the original texts for details.",
    stats: { law: "Laws", system: "Systems", ordinance: "Ordinances", uses: "Project links" },
    kinds: { law: "Law", system: "System", ordinance: "Ordinance" } as Record<LawKind, string>,
    map: "Map of systems",
    mapLead: "Each column is a field, from national laws to the systems based on them and local ordinances. Lines show the law each system is based on.",
    purposes: "What you want to do",
    topics: "Field",
    all: "All",
    search: "Search by name",
    timeline: "Timeline",
    timelineLead: "Laws and systems by the year they were created, in bands by field. Arrows show influence. The bottom row shows projects by completion year, linked to the systems they used (hover to highlight).",
    matrix: "Projects × systems",
    matrixLead: "Which systems, planning decisions and designated areas each published project relied on.",
    research: "Research",
    researchLead: "Studies on the effects and issues of these systems.",
    projects: (n: number) => `${n} ${n === 1 ? "project" : "projects"}`,
    basic: "Basics",
    kind: "Type",
    basis: "Based on",
    jurisdiction: "Authority",
    enacted: "Created",
    topic: "Field",
    official: "Read the original",
    purpose: "Purpose",
    merits: "Benefits",
    requirements: "Requirements",
    flow: "Outline of the procedure",
    flowNote: "Steps vary by municipality and project.",
    history: "History",
    usedIn: "Projects realized with this system",
    related: "Related systems",
    derived: "Systems based on this law",
    influence: "Influence",
    papers: "Related research",
    none: "No projects yet",
    source: "Source",
    yearUnknown: "Year unknown",
    seeAll: "All rules",
  },
};
