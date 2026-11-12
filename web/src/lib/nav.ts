// サイトの大分類（HOME・PROJECT・RESEARCH・DATA）と、その中のページ。ヘッダー・スマホのメニュー・フッターで共通に使う
import { getDictionary, type Locale } from "./i18n";

export type NavItem = { href: string; label: string; desc: string; icon: string };
export type NavGroup = { key: "home" | "project" | "rule" | "research" | "data"; label: string; href: string; items: NavItem[] };

// RULE タブ（法律・制度・都市計画）の項目
const RULE_NAV = {
  ja: [
    ["", "制度の地図", "やりたいこと・分野から制度を探す", "law-law"],
    ["#timeline", "年表", "法律と制度ができた流れと事例", "news"],
    ["#matrix", "事例 × 制度", "どの事例がどの制度で実現したか", "grid"],
    ["#research", "研究から見る", "制度の効果や課題を扱った研究", "field-perception"],
  ],
  en: [
    ["", "Map of systems", "Find systems by purpose or field", "law-law"],
    ["#timeline", "Timeline", "How laws and systems evolved", "news"],
    ["#matrix", "Projects × systems", "Which systems each project used", "grid"],
    ["#research", "Research", "Studies on these systems", "field-perception"],
  ],
} as const;

export function siteNav(lang: Locale): NavGroup[] {
  const g = getDictionary(lang).groups;
  const L = `/${lang}`;
  return [
    {
      key: "home",
      label: g.home.label,
      href: L,
      items: [
        { href: L, label: g.home.top, desc: g.home.topDesc, icon: "home" },
        { href: `${L}/news`, label: g.home.news, desc: g.home.newsDesc, icon: "news" },
        { href: `${L}/search`, label: g.home.search, desc: g.home.searchDesc, icon: "search" },
      ],
    },
    {
      key: "project",
      label: g.project.label,
      href: `${L}/projects`,
      items: [
        { href: `${L}/projects`, label: g.project.list, desc: g.project.listDesc, icon: "grid" },
        { href: `${L}/explore`, label: g.project.map, desc: g.project.mapDesc, icon: "map" },
        { href: `${L}/materials`, label: g.project.materials, desc: g.project.materialsDesc, icon: "stone" },
        { href: `${L}/species`, label: g.project.species, desc: g.project.speciesDesc, icon: "shade" },
        { href: `${L}/designers`, label: g.project.designers, desc: g.project.designersDesc, icon: "field-design" },
        { href: `${L}/compare`, label: g.project.compare, desc: g.project.compareDesc, icon: "compare" },
      ],
    },
    {
      key: "rule",
      label: "RULE",
      href: `${L}/rule`,
      items: RULE_NAV[lang].map(([hash, label, desc, icon]) => ({ href: `${L}/rule${hash}`, label, desc, icon })),
    },
    {
      key: "research",
      label: g.research.label,
      href: `${L}/research`,
      items: [
        { href: `${L}/research`, label: g.research.search, desc: g.research.searchDesc, icon: "search" },
        { href: `${L}/research#methods`, label: g.research.methods, desc: g.research.methodsDesc, icon: "field-perception" },
        { href: `${L}/research#papers`, label: g.research.papers, desc: g.research.papersDesc, icon: "news" },
        { href: `${L}/evaluation`, label: lang === "en" ? "What juries valued" : "評価の軸", desc: lang === "en" ? "Read from award comments" : "受賞の講評で何が評価されたか", icon: "spark" },
        { href: `${L}/ask`, label: g.research.ask, desc: g.research.askDesc, icon: "spark" },
      ],
    },
    {
      key: "data",
      label: g.data.label,
      href: `${L}/data`,
      items: [
        { href: `${L}/graph`, label: g.research.graph, desc: g.research.graphDesc, icon: "field-spatial" },
        { href: `${L}/data/photos`, label: g.data.photos, desc: g.data.photosDesc, icon: "camera" },
        { href: `${L}/data/models`, label: g.data.models, desc: g.data.modelsDesc, icon: "cube" },
      ],
    },
  ];
}
