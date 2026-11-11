// 会社名・賞の名前の表記ゆれをそろえるための照合（画面とサーバーの両方で使う）

/** 比べるときだけ使う形。全角半角・大文字小文字・法人格・空白や中黒の違いを無視する */
export function normName(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/株式会社|有限会社|合同会社|一般社団法人|公益社団法人|一般財団法人|公益財団法人|\(株\)|\(有\)|㈱|㈲/g, "")
    .replace(/[\s・･.,、。\-‐－–—_/'"“”‘’「」『』]/g, "");
}

export type PartyOption = { id: string; name_ja: string; name_en: string | null; aliases: string[] };

const partyNames = (p: PartyOption) => [p.name_ja, p.name_en ?? "", ...p.aliases].filter(Boolean);

/** 名前・英名・別名のどれかと同じとみなせる会社 */
export function findParty(name: string, parties: PartyOption[]): PartyOption | null {
  const n = normName(name);
  if (!n) return null;
  return parties.find((p) => partyNames(p).some((x) => normName(x) === n)) ?? null;
}

// 2文字ずつの重なり具合（0〜1）
function dice(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const grams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const ga = grams(a);
  const gb = grams(b);
  let hit = 0;
  for (const [g, k] of ga) hit += Math.min(k, gb.get(g) ?? 0);
  return (2 * hit) / (a.length - 1 + b.length - 1);
}

/** 入力に近い会社（候補表示・「似た名前があります」の警告に使う） */
export function similarParties(name: string, parties: PartyOption[], limit = 5): PartyOption[] {
  const n = normName(name);
  if (!n) return [];
  const scored = parties
    .map((p) => {
      let best = 0;
      for (const x of partyNames(p)) {
        const m = normName(x);
        if (!m) continue;
        const s = m === n ? 1 : m.includes(n) || n.includes(m) ? 0.9 : dice(m, n);
        if (s > best) best = s;
      }
      return { p, best };
    })
    .filter((x) => x.best >= 0.5)
    .sort((a, b) => b.best - a.best);
  return scored.slice(0, limit).map((x) => x.p);
}

export type AwardProgramOption = { id: string; name_ja: string; name_en: string | null; aliases: string[]; prizes: string[] };

/** 表示用の賞の名前（賞 + 賞の種類） */
export const awardLabel = (programName: string, prize: string | null | undefined) => (prize?.trim() ? `${programName} ${prize.trim()}` : programName);

// original の先頭から、正規化すると target になる部分の長さ
function prefixLength(original: string, target: string): number {
  for (let i = 1; i <= original.length; i++) {
    const n = normName(original.slice(0, i));
    if (n === target) {
      // 後ろに続く区切り文字（空白など）も含めておく
      let j = i;
      while (j < original.length && normName(original.slice(i, j + 1)) === "") j++;
      return j;
    }
    if (!target.startsWith(n)) return -1;
  }
  return -1;
}

/**
 * 自由に書かれた賞の名前（AI の下書き・取り込み）を、賞のマスタと賞の種類に分ける。
 * 例: 「都市公園等コンクール国土交通大臣賞（特定テーマ）」→ 都市公園等コンクール ＋ 国土交通大臣賞（特定テーマ）
 */
export function splitAward(text: string, programs: AwardProgramOption[]): { program: AwardProgramOption; prize: string } | null {
  const t = text.trim().replace(/^(令和|平成)?\s*\d+\s*年度?\s*/, "");
  let best: { program: AwardProgramOption; len: number } | null = null;
  for (const program of programs) {
    for (const name of [program.name_ja, program.name_en ?? "", ...program.aliases]) {
      const target = normName(name);
      if (!target) continue;
      const len = prefixLength(t, target);
      if (len > 0 && (!best || len > best.len)) best = { program, len };
    }
  }
  if (!best) return null;
  let prize = t.slice(best.len).trim();
  const wrapped = prize.match(/^[（(](.*)[）)]$/);
  if (wrapped) prize = wrapped[1].trim();
  // マスタにある賞の種類と同じとみなせるなら、そちらの書き方にそろえる
  const known = best.program.prizes.find((x) => normName(x) === normName(prize));
  return { program: best.program, prize: known ?? prize };
}

export const creditRoleLabels: Record<string, { ja: string; en: string }> = {
  landscape_design: { ja: "ランドスケープ設計", en: "Landscape design" },
  architecture: { ja: "建築設計", en: "Architecture" },
  urban_design: { ja: "都市計画・全体計画", en: "Urban design" },
  construction: { ja: "施工", en: "Construction" },
  landscape_construction: { ja: "造園施工", en: "Landscape construction" },
  client: { ja: "事業者・発注者", en: "Client" },
  other: { ja: "その他", en: "Other" },
};
