"use client";

import { useMemo, useState } from "react";

import { CardGrid, type CardData } from "./ProjectCard";
import { ProjectMap } from "./ProjectMap";

export type BrowserItem = {
  card: CardData;
  lat: number | null;
  lng: number | null;
  use: string;
  prefecture: string;
  designers: string[];
  species: string[];
  paving: string[];
  // 検索対象（名称・設計者・樹種の和名／学名／別名）
  searchText: string;
};

type Option = { value: string; label: string };

export type BrowserLabels = {
  grid: string;
  map: string;
  keyword: string;
  use: string;
  prefecture: string;
  species: string;
  paving: string;
  designer: string;
  all: string;
  reset: string;
  more: string;
  none: string;
  countSuffix: { one: string; other: string };
};

const PAGE = 50;

export function ProjectBrowser({
  lang,
  items,
  labels,
  options,
}: {
  lang: string;
  items: BrowserItem[];
  labels: BrowserLabels;
  options: { use: Option[]; prefecture: Option[]; species: Option[]; paving: Option[]; designer: Option[] };
}) {
  const [view, setView] = useState<"grid" | "map">("grid");
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState({ use: "", prefecture: "", species: "", paving: "", designer: "" });
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return items.filter(
      (it) =>
        (!q || it.searchText.includes(q)) &&
        (!filters.use || it.use === filters.use) &&
        (!filters.prefecture || it.prefecture === filters.prefecture) &&
        (!filters.species || it.species.includes(filters.species)) &&
        (!filters.paving || it.paving.includes(filters.paving)) &&
        (!filters.designer || it.designers.includes(filters.designer)),
    );
  }, [items, keyword, filters]);

  const points = useMemo(
    () =>
      filtered
        .filter((it) => it.lat !== null && it.lng !== null)
        .map((it) => ({ slug: it.card.slug, name: it.card.name, sub: it.card.place, lat: it.lat!, lng: it.lng! })),
    [filtered],
  );

  const set = (key: keyof typeof filters) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setLimit(PAGE);
  };
  const active = keyword || Object.values(filters).some(Boolean);
  const count = filtered.length;

  return (
    <div>
      <div className="flex flex-col gap-3 border-y border-line py-4">
        <input
          type="search"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setLimit(PAGE);
          }}
          placeholder={labels.keyword}
          className="w-full rounded-md border border-line bg-white px-3 py-2 outline-none focus:border-accent"
        />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {(["use", "prefecture", "species", "paving", "designer"] as const).map((key) => (
            <label key={key} className="flex flex-col gap-1 text-xs text-muted">
              {labels[key]}
              <select
                value={filters[key]}
                onChange={set(key)}
                className="rounded-md border border-line bg-white px-2 py-2 text-sm text-ink"
              >
                <option value="">{labels.all}</option>
                {options[key].map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {count}
            {count === 1 ? labels.countSuffix.one : labels.countSuffix.other}
            {active && (
              <button
                type="button"
                onClick={() => {
                  setKeyword("");
                  setFilters({ use: "", prefecture: "", species: "", paving: "", designer: "" });
                }}
                className="ml-3 text-accent underline-offset-2 hover:underline"
              >
                {labels.reset}
              </button>
            )}
          </span>
          <div className="flex rounded-md border border-line p-0.5">
            {(["grid", "map"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`rounded px-3 py-1 ${view === v ? "bg-accent text-white" : "text-muted"}`}
              >
                {labels[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        {count === 0 ? (
          <p className="py-16 text-center text-muted">{labels.none}</p>
        ) : view === "map" ? (
          <ProjectMap lang={lang} points={points} />
        ) : (
          <>
            <CardGrid lang={lang} cards={filtered.slice(0, limit).map((it) => it.card)} />
            {count > limit && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => setLimit((l) => l + PAGE)}
                  className="rounded-md border border-accent px-6 py-2 text-accent hover:bg-accent hover:text-white"
                >
                  {labels.more}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
