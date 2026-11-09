// サイト内検索の1件と、AI を使わないキーワード検索（サーバーと画面の両方で使う）
export const KINDS = ["project", "species", "material", "designer", "law", "method", "paper", "news"] as const;
export type Kind = (typeof KINDS)[number];

// サイト全体を探すときの1件。id は「種類:slug」
export type Entry = {
  id: string;
  kind: Kind;
  title: string;
  sub: string;
  href: string;
  image: string | null;
  // キーワード検索と AI に渡す文（日英まとめて）
  text: string;
};

const norm = (s: string) => s.normalize("NFKC").toLowerCase();

// AI を使わないキーワード検索。空白で区切った語がすべて含まれるものを、名前に含まれるものから順に返す
export function keywordSearch(entries: Entry[], q: string) {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return entries
    .map((e) => {
      const title = norm(e.title);
      const text = `${title} ${norm(e.text)}`;
      if (!terms.every((t) => text.includes(t))) return null;
      const score = terms.reduce((s, t) => s + (title === t ? 4 : title.startsWith(t) ? 3 : title.includes(t) ? 2 : 0), 0);
      return { e, score };
    })
    .filter((x): x is { e: Entry; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.e);
}
