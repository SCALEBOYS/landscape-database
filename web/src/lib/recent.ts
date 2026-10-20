// 最近探した樹種・設計者を、見ている人のブラウザだけに残す（サーバーには送らない）
export type RecentKind = "species" | "designers";

const KEY = (kind: RecentKind) => `ld:recent:${kind}`;
const MAX = 15;

export function readRecentRaw(kind: RecentKind): string {
  try {
    return window.localStorage.getItem(KEY(kind)) ?? "";
  } catch {
    return "";
  }
}

export function parseRecent(raw: string): string[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function rememberRecent(kind: RecentKind, slugs: string[]) {
  if (!slugs.length) return;
  try {
    const next = [...slugs, ...parseRecent(readRecentRaw(kind)).filter((s) => !slugs.includes(s))].slice(0, MAX);
    window.localStorage.setItem(KEY(kind), JSON.stringify(next));
  } catch {
    // 保存できない環境（プライベートモードなど）では何もしない
  }
}
