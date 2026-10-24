import type { Project } from "./data";
import { categoryLabels, label, localName, type Locale } from "./i18n";

export type RelatedGroup = { key: "related" | "use" | "era" | "near"; items: { project: Project; note: string }[] };

const LIMIT = 4;
const usesOf = (p: Project) => [p.use_category, ...(p.other_uses ?? [])];

// 2点間のおおよその距離（km）
function km(a: Project, b: Project) {
  if (a.lat === null || a.lng === null || b.lat === null || b.lng === null) return Infinity;
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
}

// 事例ページの下に出す「関連する事例」「用途が近い事例」「年代が近い事例」「近くの事例」
// 上の段に出した事例は、下の段では繰り返さない
export function relatedGroups(p: Project, all: Project[], lang: Locale): RelatedGroup[] {
  const others = all.filter((x) => x.id !== p.id && x.parent_id !== p.id && x.id !== p.parent_id);
  const shown = new Set<string>();
  const take = (list: { project: Project; note: string }[]) => {
    const out = list.filter((x) => !shown.has(x.project.id)).slice(0, LIMIT);
    out.forEach((x) => shown.add(x.project.id));
    return out;
  };
  const sep = lang === "en" ? ", " : "・";

  // 関連: 設計・樹種・法令・受賞が共通しているほど上に
  const designers = new Map(p.credits.map((c) => [c.party.slug, localName(lang, c.party.name_ja, c.party.name_en)]));
  const species = new Map(p.plantings.map((pl) => [pl.species.slug, localName(lang, pl.species.name_ja, pl.species.name_en)]));
  const laws = new Map(p.laws.map(({ law }) => [law.slug, localName(lang, law.name_ja, law.name_en)]));
  const awards = new Set(p.awards.map((a) => a.award_name.replace(/\s/g, "")));
  const related = others
    .map((x) => {
      const d = [...new Set(x.credits.map((c) => c.party.slug))].filter((s) => designers.has(s));
      const sp = [...new Set(x.plantings.map((pl) => pl.species.slug))].filter((s) => species.has(s));
      const lw = [...new Set(x.laws.map(({ law }) => law.slug))].filter((s) => laws.has(s));
      const aw = x.awards.filter((a) => awards.has(a.award_name.replace(/\s/g, ""))).length;
      const score = d.length * 3 + lw.length * 2 + sp.length + aw;
      const note = d.length
        ? `${lang === "en" ? "Same designer" : "同じ設計"}: ${d.map((s) => designers.get(s)).join(sep)}`
        : lw.length
          ? `${lang === "en" ? "Same rule" : "同じ制度"}: ${lw.map((s) => laws.get(s)).join(sep)}`
          : sp.length
            ? `${lang === "en" ? "Shared plants" : "共通の樹種"}: ${sp.slice(0, 3).map((s) => species.get(s)).join(sep)}`
            : lang === "en" ? "Same award" : "同じ賞";
      return { project: x, note, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // 用途: 共通の用途が多いほど、同じ都道府県ほど上に
  const mine = new Set(usesOf(p));
  const byUse = others
    .map((x) => ({ project: x, shared: usesOf(x).filter((u) => mine.has(u)) }))
    .filter((x) => x.shared.length)
    .sort((a, b) => b.shared.length - a.shared.length || Number(b.project.prefecture === p.prefecture) - Number(a.project.prefecture === p.prefecture) || km(p, a.project) - km(p, b.project))
    .map((x) => ({ project: x.project, note: x.shared.map((u) => label(categoryLabels, u, lang)).join(sep) }));

  // 年代: 竣工年が前後5年以内で、近い順
  const byEra = p.completed_year
    ? others
        .filter((x) => x.completed_year && Math.abs(x.completed_year - p.completed_year!) <= 5)
        .sort((a, b) => Math.abs(a.completed_year! - p.completed_year!) - Math.abs(b.completed_year! - p.completed_year!))
        .map((x) => ({ project: x, note: lang === "en" ? `Completed ${x.completed_year}` : `${x.completed_year}年竣工` }))
    : [];

  // 近く: 5km 以内で近い順
  const near = others
    .map((x) => ({ project: x, d: km(p, x) }))
    .filter((x) => x.d <= 5)
    .sort((a, b) => a.d - b.d)
    .map((x) => ({ project: x.project, note: x.d < 1 ? `${Math.max(100, Math.round(x.d * 10) * 100)}m` : `${x.d.toFixed(1)}km` }));

  return [
    { key: "related" as const, items: take(related) },
    { key: "use" as const, items: take(byUse) },
    { key: "era" as const, items: take(byEra) },
    { key: "near" as const, items: take(near) },
  ].filter((g) => g.items.length);
}
