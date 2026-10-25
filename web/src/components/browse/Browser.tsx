"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { ExploreMap } from "@/components/map/ExploreMap";
import { ProjectCard, type CardData } from "@/components/ProjectCard";
import { EMPTY, matches, parseFilters, toQuery, type BrowseItem, type Filters, type LawOption } from "@/lib/browse";
import { fmt, type BrowseText, type Locale } from "@/lib/i18n";

import { CategoryRows } from "./CategoryRows";
import { FilterButton, FilterPanel, type Tab } from "./FilterPanel";
import { ZeroResults } from "./ZeroResults";
import { rememberRecent } from "@/lib/recent";
import { SearchBar } from "./SearchBar";

// トップの新着は 25 件まで
const NEWEST_LIMIT = 25;

type Props = {
  lang: Locale;
  items: BrowseItem[];
  lawOptions: LawOption[];
  t: BrowseText;
  years: [number, number];
  hero?: React.ReactNode;
  before?: React.ReactNode; // 一覧の上に出すもの（トップの NEWS）
  after?: React.ReactNode;
  title?: string; // 一覧の見出し（既定は「新着の事例」）
  limit?: number; // 最初に出す件数（既定は25件。残りは「もっと見る」）
};

const toCard = (it: BrowseItem, t: BrowseText): CardData => ({
  slug: it.slug,
  name: it.name,
  place: it.place,
  year: it.year,
  use: it.use,
  useLabel: it.useLabel,
  cover: it.photo,
  lat: it.lat,
  lng: it.lng,
  designers: it.designers.map((d) => d.label).join("、") || t.unknownDesigner,
});

function useFilterState(initial: Filters) {
  const [filters, setFilters] = useState(initial);
  const pathname = usePathname();
  const update = useCallback((patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch })), []);
  // 条件は URL に残す（共有・戻る・地図画面への引き継ぎのため）
  useEffect(() => {
    window.history.replaceState(null, "", pathname + toQuery(filters));
    // 絞り込みに使った樹種・設計者は、トップの「最近探したもの」に出す
    rememberRecent("species", filters.species);
    rememberRecent("designers", filters.designers);
  }, [filters, pathname]);
  return { filters, update };
}

// URL の条件を読むので Suspense の中で使う。外側の fallback は条件なしの同じ画面
export function HomeBrowserFromUrl(props: Props) {
  return <HomeBrowser {...props} initial={parseFilters(new URLSearchParams(useSearchParams().toString()))} />;
}
export function ExploreFromUrl(props: Props) {
  const params = useSearchParams();
  const find = params.get("find");
  return <Explore {...props} initial={parseFilters(new URLSearchParams(params.toString()))} find={find === "species" || find === "designers" ? find : undefined} />;
}

export function HomeBrowser({ lang, items, lawOptions, t, years, hero, before, after, title, limit = NEWEST_LIMIT, initial = EMPTY }: Props & { initial?: Filters }) {
  const { filters, update } = useFilterState(initial);
  const [panel, setPanel] = useState(false);
  const list = useMemo(() => items.filter((it) => matches(it, filters)), [items, filters]);
  const [more, setMore] = useState(false);
  const shown = more ? list : list.slice(0, limit);
  // 条件を入れているあいだは、結果の一覧を NEWS などより上に出す。検索ボタンでは結果の位置まで送る
  const searching = toQuery(filters) !== "";
  const results = useRef<HTMLElement>(null);
  const showResults = () => results.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const list_ = (
      <section ref={results} className="wrap grid scroll-mt-[calc(var(--hdr)+12px)] gap-6 pt-9">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-3">
          <h2 className="text-[30px] font-extrabold tracking-[-0.02em]">{searching ? t.searchResults : (title ?? t.newest)}</h2>
          <span className="text-[13px] text-muted">{fmt(t.count, list.length)}</span>
          <Link href={`/${lang}/explore${toQuery(filters)}`} className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
            {t.seeOnMap} <Icon name="arrow" />
          </Link>
        </div>
        {list.length ? (
          <>
            {/* 「もっと見る」で全件を出したら、下の地図などへ行きやすいよう枠の中でスクロールさせる */}
            <div className={more ? "max-h-[min(1600px,180vh)] overflow-y-auto border-y border-line py-6 pr-2" : ""}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 xl:grid-cols-5">
                {shown.map((it, i) => (
                  <ProjectCard key={it.slug} lang={lang} card={toCard(it, t)} index={i} />
                ))}
              </div>
            </div>
            {list.length > limit && (
              <button type="button" onClick={() => setMore((m) => !m)} className="fbtn justify-self-center">
                {more ? t.showLess : fmt(t.showMore, list.length - limit)}
              </button>
            )}
          </>
        ) : (
          <ZeroResults items={items} filters={filters} update={update} t={t} lang={lang} lawOptions={lawOptions} />
        )}
      </section>
  );

  return (
    <>
      <section className="relative">
        {hero}
        <div className="wrap relative z-10 -mt-[38px]">
          <SearchBar items={items} filters={filters} update={update} t={t} lang={lang} years={years} onSubmit={showResults} />
        </div>
      </section>
      <div className="wrap flex items-start gap-5 pt-7">
        <CategoryRows items={items} filters={filters} update={update} t={t} lang={lang} lawOptions={lawOptions} />
        <FilterButton filters={filters} t={t} onClick={() => setPanel(true)} />
      </div>
      {searching ? (
        <>
          {list_}
          {before}
        </>
      ) : (
        <>
          {before}
          {list_}
        </>
      )}
      {after}
      {panel && <FilterPanel items={items} filters={filters} update={update} t={t} onClose={() => setPanel(false)} />}
    </>
  );
}

// find があれば（トップの「ほかは地図で探す」から来たとき）、そのタブで絞り込みパネルを開いておく
export function Explore({ lang, items, lawOptions, t, years, hero, initial = EMPTY, find }: Props & { initial?: Filters; find?: Tab }) {
  const { filters, update } = useFilterState(initial);
  const [panel, setPanel] = useState(!!find);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState<Set<string> | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const ex = useRef<HTMLDivElement>(null);

  const matched = useMemo(() => items.filter((it) => matches(it, filters)), [items, filters]);
  const shown = useMemo(() => new Set(matched.map((it) => it.slug)), [matched]);
  const list = inView && visible ? matched.filter((it) => visible.has(it.slug)) : matched;

  // 検索バーとカテゴリの高さを差し引いて、地図を画面の残りいっぱいにする
  useEffect(() => {
    const el = top.current;
    if (!el) return;
    const ro = new ResizeObserver(() => ex.current?.style.setProperty("--ex-top", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      {hero}
      <div ref={top} className="compact border-b border-line bg-white">
        <div className="grid gap-1.5 px-4 py-2.5 md:px-8">
          <div className="max-w-[860px]">
            <SearchBar items={items} filters={filters} update={update} t={t} lang={lang} years={years} compact />
          </div>
          <div className="flex items-center gap-4">
            <CategoryRows items={items} filters={filters} update={update} t={t} lang={lang} lawOptions={lawOptions} />
            <FilterButton filters={filters} t={t} onClick={() => setPanel(true)} />
          </div>
        </div>
      </div>
      <div ref={ex} className="ex">
        <div className="ex-map">
          <ExploreMap lang={lang} items={items} shown={shown} hovered={hovered} onHover={setHovered} onBounds={setVisible} t={t} />
        </div>
        <Sheet>
          <div className="grid gap-4 px-4 pb-10 pt-1 md:px-6 md:pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
              <span>
                <b className="num text-xl font-medium">{list.length}</b> {lang === "ja" ? "件" : list.length === 1 ? "project" : "projects"}
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2 text-muted">
                <input type="checkbox" checked={inView} onChange={(e) => setInView(e.target.checked)} className="accent-[var(--accent)]" />
                {t.inView}
              </label>
            </div>
            {list.length ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:gap-x-4 md:gap-y-7">
                {list.map((it, i) => (
                  <ProjectCard key={it.slug} lang={lang} card={toCard(it, t)} index={i} highlighted={hovered === it.slug} onHover={setHovered} />
                ))}
              </div>
            ) : (
              <ZeroResults items={items} filters={filters} update={update} t={t} lang={lang} lawOptions={lawOptions} />
            )}
          </div>
        </Sheet>
      </div>
      {panel && <FilterPanel items={items} filters={filters} update={update} t={t} initialTab={find} onClose={() => setPanel(false)} />}
    </>
  );
}

// スマホでは一覧を下から引き上げるシートにする。つまみを押すと 3 段階で切り替わり、引っぱると好きな高さで止まる
function Sheet({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; h: number; H: number } | null>(null);
  const snaps = [0.16, 0.42, 0.9];
  const [idx, setIdx] = useState(1);
  const set = (f: number) => ref.current?.parentElement?.style.setProperty("--sheet", `${(f * 100).toFixed(1)}%`);
  useEffect(() => set(snaps[idx]));

  return (
    <aside ref={ref} className="ex-list">
      <div
        className="grabber"
        onPointerDown={(e) => {
          const parent = ref.current!.parentElement!;
          drag.current = { y: e.clientY, h: ref.current!.offsetHeight, H: parent.offsetHeight };
          e.currentTarget.setPointerCapture(e.pointerId);
          ref.current!.classList.add("dragging");
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) set(Math.min(0.95, Math.max(0.1, (d.h + d.y - e.clientY) / d.H)));
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (!d) return;
          drag.current = null;
          ref.current!.classList.remove("dragging");
          const f = ref.current!.offsetHeight / d.H;
          const next = Math.abs(e.clientY - d.y) > 6 ? snaps.reduce((b, s, i) => (Math.abs(s - f) < Math.abs(snaps[b] - f) ? i : b), 0) : (idx + 1) % snaps.length;
          setIdx(next);
          set(snaps[next]);
        }}
      >
        <span />
      </div>
      <div className="ex-list-in">{children}</div>
    </aside>
  );
}
