"use server";

import { z } from "zod";

import { AiError, aiErrorMessage, askJson, takeQuota } from "@/lib/ai";
import { hasLocale } from "@/lib/i18n";
import { type Entry, siteIndex } from "@/lib/site-index";

const Answer = z.object({
  picks: z.array(z.object({ id: z.string(), reason: z.string() })),
  note: z.string(),
});

export type SitePick = Omit<Entry, "text"> & { reason: string };
export type SiteAiResult = { ok: true; picks: SitePick[]; note: string } | { ok: false; message: string };

// 「雨庭のある公園と、関係する研究」のような文章で、事例・樹種・素材・設計・法令・研究・NEWS をまとめて探す
export async function siteAiSearch(text: string, lang: string): Promise<SiteAiResult> {
  const l = hasLocale(lang) ? lang : "ja";
  const sentence = text.trim().slice(0, 300);
  if (!sentence) return { ok: false, message: l === "en" ? "Type what you are looking for." : "探したいものを文章で入れてください。" };

  try {
    const record = await takeQuota("search");
    const entries = await siteIndex(l);
    const catalog = entries.map((e) => `${e.id} | ${e.text.slice(0, 400)}`).join("\n");

    const { data, usage } = await askJson({
      schema: Answer,
      effort: "low",
      maxTokens: 3000,
      system: [
        "あなたはランドスケープのデータベースサイトの検索窓口です。下の一覧（サイトに載っているすべてのページ）から、利用者の文章に合うものを選びます。",
        "一覧の各行は「id | 内容」です。picks の id には一覧の左側の id だけをそのまま入れます。一覧にないものは作りません。",
        "合う順に最大12件まで選びます。種類（project=事例, species=樹種, material=素材, designer=設計, law=法令, method=研究の手法, paper=論文, news=NEWS）は混ざって構いません。",
        "文章とはっきり関係するものだけを選び、合うものがなければ picks を空にします。",
        `reason には、なぜ合うのかを${l === "en" ? "英語" : "日本語"}で短く（40字程度）書きます。一覧に書かれていることだけを根拠にします。`,
        `note には、どう探したかを${l === "en" ? "英語" : "日本語"}で一文だけ書きます。`,
        "",
        catalog,
      ].join("\n"),
      content: sentence,
    });
    void record(usage);

    // 一覧にない id は捨て、画面に出す情報を付けて返す
    const byId = new Map(entries.map((e) => [e.id, e]));
    const seen = new Set<string>();
    const picks: SitePick[] = [];
    for (const p of data.picks) {
      const e = byId.get(p.id);
      if (!e || seen.has(p.id) || picks.length >= 12) continue;
      seen.add(p.id);
      picks.push({ id: e.id, kind: e.kind, title: e.title, sub: e.sub, href: e.href, image: e.image, reason: p.reason.slice(0, 120) });
    }
    return { ok: true, picks, note: data.note.slice(0, 300) };
  } catch (e) {
    return { ok: false, message: aiErrorMessage(e instanceof AiError ? e.code : "failed", l) };
  }
}
