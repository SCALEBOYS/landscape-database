// 比較に入れた事例（最大3件）。見ている人のブラウザだけに保存する
export const COMPARE_MAX = 3;
const KEY = "ld:compare";
const EVENT = "ld-compare";

export function readCompareRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseCompare(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

export function writeCompare(slugs: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(slugs.slice(0, COMPARE_MAX)));
  } catch {
    // 保存できない環境では何もしない
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeCompare(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
