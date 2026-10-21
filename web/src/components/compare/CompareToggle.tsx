"use client";

import { Icon } from "@/components/Icon";

import { useCompare } from "./useCompare";

// 事例カード・事例ページの「比較に追加」。3件を超えると古いものから外れる
export function CompareToggle({ slug, labels, variant = "card" }: { slug: string; labels: { add: string; added: string }; variant?: "card" | "page" }) {
  const c = useCompare();
  const on = c.has(slug);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        c.toggle(slug);
      }}
      title={on ? labels.added : labels.add}
      className={
        variant === "card"
          ? `absolute right-2 top-2 z-[2] flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium backdrop-blur transition ${on ? "bg-white text-ink" : "bg-black/45 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"}`
          : `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm ${on ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`
      }
    >
      <Icon name="compare" className="ico !h-3.5 !w-3.5" />
      {on ? labels.added : labels.add}
    </button>
  );
}
