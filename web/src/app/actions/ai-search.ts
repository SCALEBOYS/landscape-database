"use server";

import { z } from "zod";

import { AiError, aiErrorMessage, askJson, takeQuota } from "@/lib/ai";
import { EMPTY, type Filters } from "@/lib/browse";
import { getBrowseItems, getLawOptions } from "@/lib/browse-data";
import { ELEMENTS, USE_KEYS } from "@/lib/catalog";
import { categoryLabels, hasLocale } from "@/lib/i18n";

const Answer = z.object({
  uses: z.array(z.string()),
  els: z.array(z.string()),
  prefs: z.array(z.string()),
  munis: z.array(z.string()),
  species: z.array(z.string()),
  designers: z.array(z.string()),
  paving: z.array(z.string()),
  laws: z.array(z.string()),
  y0: z.number().int().nullable(),
  y1: z.number().int().nullable(),
  q: z.string(),
  note: z.string(),
});

export type AiSearchResult = { ok: true; filters: Filters; note: string } | { ok: false; message: string };

// 「木陰の多い駅前の広場」のような文章を、探す画面の絞り込み条件に置き換える
export async function aiSearch(text: string, lang: string): Promise<AiSearchResult> {
  const l = hasLocale(lang) ? lang : "ja";
  const sentence = text.trim().slice(0, 300);
  if (!sentence) return { ok: false, message: l === "en" ? "Type what you are looking for." : "探したいものを文章で入れてください。" };

  try {
    const record = await takeQuota("search");
    const [items, laws] = await Promise.all([getBrowseItems(l), getLawOptions(l)]);
    const uniq = (pairs: [string, string][]) => [...new Map(pairs).entries()];
    const species = uniq(items.flatMap((it) => it.species.map((s) => [s.slug, s.label] as [string, string])));
    const designers = uniq(items.flatMap((it) => it.designers.map((d) => [d.slug, d.label] as [string, string])));
    const paving = uniq(items.flatMap((it) => it.paving.map((p) => [p.slug, p.label] as [string, string])));
    const prefs = [...new Set(items.map((it) => it.pref))];
    const munis = [...new Set(items.map((it) => it.muni).filter(Boolean))];
    const years = items.map((it) => it.year).filter((y): y is number => y !== null);
    const list = (pairs: [string, string][]) => pairs.map(([k, v]) => `${k}=${v}`).join(", ");

    // 選べる値の一覧。事例データから作るので、ここにない値は選ばせない
    const vocabulary = [
      `uses (用途): ${USE_KEYS.map((k) => `${k}=${categoryLabels[k].ja}`).join(", ")}`,
      `els (要素): ${ELEMENTS.map((e) => `${e.key}=${e.ja}`).join(", ")}`,
      `prefs (都道府県): ${prefs.join(", ")}`,
      `munis (市区町村): ${munis.join(", ")}`,
      `species (樹種): ${list(species)}`,
      `designers (設計): ${list(designers)}`,
      `paving (舗装): ${list(paving)}`,
      `laws (法令・制度): ${laws.map((x) => `${x.slug}=${x.label}`).join(", ")}`,
      `竣工年の範囲: ${Math.min(...years)}–${Math.max(...years)}`,
    ].join("\n");

    const { data, usage } = await askJson({
      schema: Answer,
      effort: "low",
      maxTokens: 4000,
      system: [
        "あなたはランドスケープ事例データベースの検索窓口です。利用者の文章を、下の一覧にある絞り込み条件に置き換えます。",
        "各配列には一覧の左側のキー（slug）だけを入れます。一覧にない値は作らず、文章に合う条件がなければ空にします。",
        "条件は文章がはっきり求めているものだけにします。広げすぎると結果が出なくなるので、迷う条件は入れません。",
        "地名で市区町村が一覧にあれば munis、都道府県だけなら prefs に入れます。年代の指定があれば y0・y1 に西暦で入れ、なければ null にします。",
        "条件に置き換えられない固有名詞（事例名など）があれば q に入れます。なければ空文字にします。",
        `note には、どう置き換えたかを${l === "en" ? "英語" : "日本語"}で一文だけ書きます。`,
        "",
        vocabulary,
      ].join("\n"),
      content: sentence,
    });
    void record(usage);

    // 一覧にない値は捨てる
    const keep = (vals: string[], allowed: Iterable<string>) => {
      const set = new Set(allowed);
      return [...new Set(vals)].filter((v) => set.has(v));
    };
    const filters: Filters = {
      ...EMPTY,
      q: data.q.trim().slice(0, 100),
      uses: keep(data.uses, USE_KEYS),
      els: keep(data.els, ELEMENTS.map((e) => e.key)),
      prefs: keep(data.prefs, prefs),
      munis: keep(data.munis, munis),
      species: keep(data.species, species.map(([k]) => k)),
      designers: keep(data.designers, designers.map(([k]) => k)),
      paving: keep(data.paving, paving.map(([k]) => k)),
      laws: keep(data.laws, laws.map((x) => x.slug)),
      y0: data.y0,
      y1: data.y1,
    };
    return { ok: true, filters, note: data.note.slice(0, 300) };
  } catch (e) {
    return { ok: false, message: aiErrorMessage(e instanceof AiError ? e.code : "failed", l) };
  }
}
