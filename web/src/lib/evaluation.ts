import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { supabase } from "./data";

// 評価の軸: 受賞の講評で「何が評価されたか」を軸ごとにまとめたもの

export type AxisGroup = "place" | "space" | "system";
export const AXIS_GROUPS: Record<AxisGroup, { ja: string; en: string; color: string; tint: string }> = {
  place: { ja: "場所を読む", en: "Reading the place", color: "#0d6b4e", tint: "#e3f1ea" },
  space: { ja: "空間をつくる", en: "Shaping space", color: "#2f5d8a", tint: "#e6eef6" },
  system: { ja: "しくみを育てる", en: "Building the system", color: "#c0492a", tint: "#f9e7e1" },
};

export const AXES: { key: string; group: AxisGroup; ja: string; en: string; desc_ja: string; desc_en: string }[] = [
  { key: "context", group: "place", ja: "敷地の条件を生かす", en: "Site and terrain", desc_ja: "地形や立地の難しさを読み取り、設計で解いているか", desc_en: "Reading terrain and constraints and resolving them by design" },
  { key: "heritage", group: "place", ja: "歴史・記憶を引き継ぐ", en: "History and memory", desc_ja: "土地の履歴や文化を、今の空間につないでいるか", desc_en: "Carrying the history and culture of the place forward" },
  { key: "green", group: "place", ja: "緑・生きもの", en: "Planting and ecology", desc_ja: "植栽の質、既存の樹木や生きものへの配慮", desc_en: "Quality of planting and care for existing trees and habitats" },
  { key: "activity", group: "space", ja: "使われ方・居場所", en: "Use and places to stay", desc_ja: "さまざまな人が思い思いに過ごせているか", desc_en: "Whether many kinds of people can spend time in their own way" },
  { key: "connect", group: "space", ja: "まちとのつながり", en: "Links to the city", desc_ja: "動線や境界の開き方、歩きやすさ", desc_en: "Routes, open edges and walkability" },
  { key: "detail", group: "space", ja: "造形・細部の質", en: "Form and detail", desc_ja: "形、素材、照明など細部の仕上がり", desc_en: "Form, materials, lighting and finish" },
  { key: "integration", group: "space", ja: "分野をこえた一体の設計", en: "Integrated design", desc_ja: "建築・土木・公園、複数の事業が一つになっているか", desc_en: "Architecture, civil works and parks working as one" },
  { key: "process", group: "system", ja: "合意形成・進め方", en: "Process and consensus", desc_ja: "協議や社会実験、発注者と設計者の進め方", desc_en: "Consultation, pilots and how client and designer worked" },
  { key: "management", group: "system", ja: "運営・維持管理", en: "Operation and upkeep", desc_ja: "運営の体制、官民連携、手入れが続くしくみ", desc_en: "Operating bodies, partnerships and lasting upkeep" },
  { key: "impact", group: "system", ja: "まちへの波及", en: "Wider impact", desc_ja: "周りの地域や他の都市への広がり", desc_en: "Effects on the surrounding area and other cities" },
];

export type Stance = "valued" | "concern";
export type EvalPoint = {
  axis: string;
  stance: Stance;
  point_ja: string;
  point_en: string | null;
  source_url: string | null;
  sort_order: number;
  program: { slug: string; name_ja: string; name_en: string | null } | null;
  project: { slug: string; name_ja: string; name_en: string | null; completed_year: number | null; municipality: string | null; prefecture: string };
};

export async function getEvaluations(): Promise<EvalPoint[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("projects");
  const { data, error } = await supabase()
    .from("project_evaluations")
    .select("axis, stance, point_ja, point_en, source_url, sort_order, program:award_programs(slug, name_ja, name_en), project:projects(slug, name_ja, name_en, completed_year, municipality, prefecture)")
    .order("sort_order");
  if (error) throw error;
  // 非公開の事例は RLS で読めない
  return (data as unknown as (Omit<EvalPoint, "project"> & { project: EvalPoint["project"] | null })[]).filter((x) => x.project) as EvalPoint[];
}

export const EVAL_T = {
  ja: {
    title: "評価の軸",
    sub: "受賞の講評から読む",
    lead: "賞の講評で「何が評価されたか」を、10 の軸に分けて並べました。講評の文章そのものではなく、要点を短くまとめたものです。どの軸に入れるかは運営者の読み取りで、審査員による分類ではありません。くわしくは出典の講評を読んでください。",
    stats: { points: "評価された点", projects: "事例", programs: "賞", concerns: "課題・期待" },
    overview: "軸の全体像",
    overviewLead: "軸を選ぶと、下の表とことばがその軸に絞られます。",
    matrix: "事例 × 評価の軸",
    matrixLead: "どの事例が、どの軸で評価されたかの一覧です。",
    words: "ことばで読む",
    wordsLead: "軸ごとに、評価された点と、課題・期待として挙げられた点を並べています。",
    programs: "賞ごとの傾向",
    programsLead: "賞によって、よく挙がる軸が違います。件数が少ないうちは参考程度に見てください。",
    valued: "評価された点",
    concern: "課題・期待",
    all: "すべての軸",
    source: "出典",
    note: "講評が公開されている受賞だけを対象にしています。ログインした方の意見を集める機能は準備中です。",
  },
  en: {
    title: "What juries valued",
    sub: "Read from award comments",
    lead: "What award juries valued in each project, sorted into ten axes. These are short summaries in our own words, not the comments themselves, and the sorting into axes is our own reading, not the juries’; follow the sources for the full text. Summaries are in Japanese.",
    stats: { points: "Points valued", projects: "Projects", programs: "Awards", concerns: "Concerns / hopes" },
    overview: "Overview of axes",
    overviewLead: "Pick an axis to filter the table and the notes below.",
    matrix: "Projects × axes",
    matrixLead: "Which project was valued on which axis.",
    words: "In words",
    wordsLead: "Points that were valued, and concerns or hopes raised, by axis.",
    programs: "By award",
    programsLead: "Different awards stress different axes. Treat this as a rough guide while the sample is small.",
    valued: "Valued",
    concern: "Concern / hope",
    all: "All axes",
    source: "Source",
    note: "Only awards with published jury comments are covered. Opinions from signed-in visitors are planned.",
  },
};
