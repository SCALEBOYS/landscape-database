"use client";

import { Icon } from "@/components/Icon";
import { matches, type BrowseItem, type Filters } from "@/lib/browse";
import { ELEMENTS, USE_KEYS } from "@/lib/catalog";
import { categoryLabels, type BrowseText, type Locale } from "@/lib/i18n";

// 1段目＝用途（いずれか）、2段目＝要素（すべて）。件数は他の条件を当てた残りの数
export function CategoryRows({
  items,
  filters,
  update,
  t,
  lang,
}: {
  items: BrowseItem[];
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  t: BrowseText;
  lang: Locale;
}) {
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const countUse = (k: string) => items.filter((it) => it.use === k && matches(it, filters, "uses")).length;
  const countEl = (k: string) => items.filter((it) => it.elements.includes(k) && matches(it, filters, "els")).length;

  const row = (
    key: "uses" | "els",
    title: string,
    rule: string,
    list: { key: string; label: string; n: number }[],
  ) => (
    <div className="catrow">
      <span className="rl">
        {title}
        <br />
        <span className="rule">{rule}</span>
      </span>
      <div className="chips">
        {list.map((c) => {
          const on = filters[key].includes(c.key);
          return (
            <button key={c.key} type="button" className={`chip ${!c.n && !on ? "zero" : ""}`} aria-pressed={on} onClick={() => update({ [key]: toggle(filters[key], c.key) })}>
              <Icon name={c.key} />
              <span>
                {c.label} <span className="n">{c.n || ""}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="grid min-w-0 flex-1 gap-1">
      {row("uses", t.useRow, t.useRule, USE_KEYS.map((k) => ({ key: k, label: categoryLabels[k][lang], n: countUse(k) })))}
      {row("els", t.elRow, t.elRule, ELEMENTS.map((e) => ({ key: e.key, label: e[lang], n: countEl(e.key) })))}
    </div>
  );
}
