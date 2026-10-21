// サイトの大分類（HOME・PROJECT・RESEARCH・DATA）と、その中のページ。ヘッダー・スマホのメニュー・フッターで共通に使う
import { getDictionary, type Locale } from "./i18n";

export type NavItem = { href: string; label: string; desc: string; icon: string };
export type NavGroup = { key: "home" | "project" | "research" | "data"; label: string; href: string; items: NavItem[] };

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
      key: "research",
      label: g.research.label,
      href: `${L}/research`,
      items: [
        { href: `${L}/research`, label: g.research.search, desc: g.research.searchDesc, icon: "search" },
        { href: `${L}/research#methods`, label: g.research.methods, desc: g.research.methodsDesc, icon: "field-perception" },
        { href: `${L}/research#papers`, label: g.research.papers, desc: g.research.papersDesc, icon: "news" },
        { href: `${L}/laws`, label: g.research.laws, desc: g.research.lawsDesc, icon: "law-law" },
        { href: `${L}/graph`, label: g.research.graph, desc: g.research.graphDesc, icon: "field-spatial" },
      ],
    },
    {
      key: "data",
      label: g.data.label,
      href: `${L}/data`,
      items: [
        { href: `${L}/data/models`, label: g.data.models, desc: g.data.modelsDesc, icon: "cube" },
        { href: `${L}/data/photos`, label: g.data.photos, desc: g.data.photosDesc, icon: "camera" },
      ],
    },
  ];
}
