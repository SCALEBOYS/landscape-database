import type { BrowseItem } from "./browse";

// 竣工年スライダーの範囲。登録済みの年に合わせて広がり、最低でも 2000〜2026 を取る
export function yearRange(items: BrowseItem[]): [number, number] {
  const ys = items.map((it) => it.year).filter((y): y is number => y !== null);
  return [Math.min(2000, ...ys), Math.max(2026, ...ys)];
}
