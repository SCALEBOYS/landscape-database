import "server-only";

import { ELEMENTS, elementsOf } from "./catalog";
import { coverPhoto, getLaws, getProjects } from "./data";
import { getResearch } from "./research";
import { categoryLabels, label, localName, prefectureEn, type Locale } from "./i18n";
import { satelliteImage } from "./mapbox";
import { place, summary } from "./view";

import type { GraphData, GraphLink, GraphNode, NodeType } from "./graph-types";

// 似ている事例の判定に使う分類（用途・都道府県・年代は共通しやすく、似ているとは言いにくいので除く）
const SIMILAR_TYPES: NodeType[] = ["designer", "species", "law", "element", "award", "tag"];
const SIMILAR_PER_PROJECT = 5;

export async function getGraph(lang: Locale): Promise<GraphData> {
  const [projects, laws, research] = await Promise.all([getProjects(), getLaws(), getResearch()]);
  const lawSummary = new Map(laws.map((l) => [l.slug, lang === "en" ? l.summary_en : l.summary_ja]));
  const nodes = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  const add = (n: Omit<GraphNode, "degree">) => {
    if (!nodes.has(n.id)) nodes.set(n.id, { ...n, degree: 0 });
    return n.id;
  };
  const owned = new Map<string, Set<string>>();

  for (const p of projects) {
    const pid = add({
      id: `project:${p.slug}`,
      type: "project",
      label: localName(lang, p.name_ja, p.name_en),
      sub: [label(categoryLabels, p.use_category, lang), place(p, lang), p.completed_year].filter(Boolean).join(" · "),
      href: `/${lang}/projects/${p.slug}`,
      img: coverPhoto(p) ?? (p.lat !== null && p.lng !== null ? satelliteImage(p.lat, p.lng, { w: 640, h: 400 }) : null),
      summary: summary(p, lang),
    });
    const targets = new Set<string>();
    const link = (id: string) => targets.add(id);

    for (const c of p.credits) {
      link(add({ id: `designer:${c.party.slug}`, type: "designer", label: localName(lang, c.party.name_ja, c.party.name_en), href: `/${lang}/designers/${c.party.slug}` }));
    }
    for (const pl of p.plantings) {
      const s = pl.species;
      link(add({ id: `species:${s.slug}`, type: "species", label: localName(lang, s.name_ja, s.name_en), sub: s.scientific_name, href: `/${lang}/species/${s.slug}` }));
    }
    for (const { law } of p.laws) {
      link(add({ id: `law:${law.slug}`, type: "law", label: localName(lang, law.name_ja, law.name_en), href: `/${lang}/laws/${law.slug}`, summary: lawSummary.get(law.slug) }));
    }
    for (const u of [p.use_category, ...(p.other_uses ?? []).filter((x) => x !== p.use_category)]) {
      link(add({ id: `use:${u}`, type: "use", label: label(categoryLabels, u, lang), href: `/${lang}/explore?uses=${u}` }));
    }
    for (const e of elementsOf(p)) {
      const el = ELEMENTS.find((x) => x.key === e)!;
      link(add({ id: `element:${e}`, type: "element", label: el[lang], href: `/${lang}/explore?els=${e}` }));
    }
    for (const a of p.awards) {
      link(add({ id: `award:${a.award_name}`, type: "award", label: a.award_name }));
    }
    link(add({ id: `pref:${p.prefecture}`, type: "pref", label: lang === "en" ? prefectureEn[p.prefecture] ?? p.prefecture : p.prefecture, href: `/${lang}/explore?prefs=${encodeURIComponent(p.prefecture)}` }));
    if (p.completed_year) {
      const d = Math.floor(p.completed_year / 10) * 10;
      link(add({ id: `decade:${d}`, type: "decade", label: lang === "en" ? `${d}s` : `${d}年代`, href: `/${lang}/explore?y0=${d}&y1=${d + 9}` }));
    }

    for (const t of targets) links.push({ source: pid, target: t, kind: "has", weight: 1 });
    owned.set(pid, targets);
  }

  // 事例どうしの近さ: 共通する分類の数を、それぞれの分類数で割って 0〜1 にする（コサイン類似度）
  const ids = [...owned.keys()];
  const similar = new Map<string, { other: string; shared: number; weight: number }[]>();
  const comparable = (set: Set<string>) => new Set([...set].filter((id) => SIMILAR_TYPES.includes(nodes.get(id)!.type)));
  const sets = new Map(ids.map((id) => [id, comparable(owned.get(id)!)]));
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = sets.get(ids[i])!, b = sets.get(ids[j])!;
      if (!a.size || !b.size) continue;
      const shared = [...a].filter((x) => b.has(x)).length;
      if (!shared) continue;
      const weight = shared / Math.sqrt(a.size * b.size);
      for (const [x, y] of [[ids[i], ids[j]], [ids[j], ids[i]]]) {
        similar.set(x, [...(similar.get(x) ?? []), { other: y, shared, weight }]);
      }
    }
  }
  const seen = new Set<string>();
  for (const [id, list] of similar) {
    for (const s of list.sort((a, b) => b.weight - a.weight).slice(0, SIMILAR_PER_PROJECT)) {
      const key = [id, s.other].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ source: id, target: s.other, kind: "similar", weight: s.weight });
    }
  }

  // 論文は手法・事例・樹種とつなぐ（事例どうしの近さの計算には入れない）
  const methodName = new Map(research.methods.map((m) => [m.slug, lang === "en" ? m.name_en : m.name_ja]));
  for (const pa of research.papers) {
    const id = add({
      id: `paper:${pa.slug}`,
      type: "paper",
      label: lang === "ja" ? pa.title_ja ?? pa.title : pa.title,
      sub: `${pa.authors} · ${pa.year}`,
      href: `/${lang}/research/papers/${pa.slug}`,
      summary: lang === "en" ? pa.summary_en ?? pa.summary_ja : pa.summary_ja,
    });
    const to = (target: string) => links.push({ source: id, target, kind: "has", weight: 1 });
    for (const { method } of pa.methods) {
      to(add({ id: `method:${method.slug}`, type: "method", label: methodName.get(method.slug) ?? method.slug, href: `/${lang}/research/methods/${method.slug}` }));
    }
    for (const { project } of pa.projects) if (nodes.has(`project:${project.slug}`)) to(`project:${project.slug}`);
    for (const { species: s } of pa.species) {
      to(add({ id: `species:${s.slug}`, type: "species", label: localName(lang, s.name_ja, s.name_en), sub: s.scientific_name, href: `/${lang}/species/${s.slug}` }));
    }
  }

  for (const l of links) {
    if (l.kind !== "has") continue;
    nodes.get(l.source)!.degree++;
    nodes.get(l.target)!.degree++;
  }
  return { nodes: [...nodes.values()], links };
}
