"use server";

import { cosine, embedDocuments, embedQuery } from "@/lib/embed";
import { hasLocale } from "@/lib/i18n";
import { type Entry, siteIndex } from "@/lib/site-index";
import { keywordSearch } from "@/lib/site-search";

export type SitePick = Omit<Entry, "text"> & { reason: string };
export type SiteAiResult = { ok: true; picks: SitePick[]; note: string } | { ok: false; message: string };

const MAX = 12;

// 「雨庭のある公園と、関係する研究」のような文章で、意味の近いページを探す（ベクトル検索）。
// 外部の AI は使わない。言葉がそのまま入っているページは少し上に上げる
export async function siteAiSearch(text: string, lang: string): Promise<SiteAiResult> {
  const l = hasLocale(lang) ? lang : "ja";
  const sentence = text.trim().slice(0, 300);
  if (!sentence) return { ok: false, message: l === "en" ? "Type what you are looking for." : "探したいものを文章で入れてください。" };
  try {
    // ベクトルは日本語の内容から作る（英語の画面でも、同じページは同じベクトル）
    const [entries, shown] = await Promise.all([siteIndex("ja"), l === "ja" ? null : siteIndex(l)]);
    const [docs, q] = await Promise.all([embedDocuments(entries.map((e) => e.text)), embedQuery(sentence)]);
    const literal = new Set(keywordSearch(entries, sentence).map((e) => e.id));
    const scored = entries
      .map((e, i) => ({ e, score: cosine(docs[i], q) + (literal.has(e.id) ? 0.05 : 0) }))
      .sort((a, b) => b.score - a.score);
    // 一番近いものから離れすぎたものは出さない
    const top = scored[0]?.score ?? 0;
    const byId = new Map((shown ?? entries).map((e) => [e.id, e]));
    const picks: SitePick[] = scored
      .filter((s) => s.score >= top - 0.08)
      .slice(0, MAX)
      .map(({ e }) => byId.get(e.id) ?? e)
      .map((e) => ({ id: e.id, kind: e.kind, title: e.title, sub: e.sub, href: e.href, image: e.image, reason: "" }));
    return { ok: true, picks, note: "" };
  } catch (e) {
    console.error("semantic search failed", e);
    return { ok: false, message: l === "en" ? "Search failed. Please try again." : "検索に失敗しました。もう一度お試しください。" };
  }
}
