"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/Icon";
import { COMPARE_MAX } from "@/lib/compare";

import { useCompare } from "./useCompare";

export type TrayProject = { slug: string; name: string; img: string | null };
export type TrayLabels = { title: string; open: string; clear: string; remove: string; hint: string };

// 比較に入れた事例を画面の下に出す。比較ページ自身では出さない
export function CompareTray({ lang, projects, labels }: { lang: string; projects: TrayProject[]; labels: TrayLabels }) {
  const c = useCompare();
  const pathname = usePathname();
  if (!c.slugs.length || pathname.startsWith(`/${lang}/compare`)) return null;
  const byslug = new Map(projects.map((p) => [p.slug, p]));
  const picked = c.slugs.map((s) => byslug.get(s)).filter((p): p is TrayProject => !!p);

  return (
    <div className="fade-in fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 shadow-[0_-8px_30px_rgba(0,0,0,.12)] backdrop-blur">
      <div className="wrap flex flex-wrap items-center gap-3 py-3">
        <span className="text-xs font-semibold tracking-[.08em] text-muted">{labels.title}</span>
        <ul className="flex flex-1 gap-2 overflow-x-auto">
          {Array.from({ length: COMPARE_MAX }, (_, i) => picked[i]).map((p, i) =>
            p ? (
              <li key={p.slug} className="flex flex-none items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-2">
                {p.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.img} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="h-7 w-7 rounded-full bg-soft" />
                )}
                <span className="max-w-[160px] truncate text-xs">{p.name}</span>
                <button type="button" onClick={() => c.remove(p.slug)} aria-label={`${labels.remove}: ${p.name}`} className="text-muted hover:text-ink">
                  <Icon name="x" className="ico !h-3.5 !w-3.5" />
                </button>
              </li>
            ) : (
              <li key={`empty-${i}`} className="hidden h-9 w-28 flex-none rounded-full border border-dashed border-line sm:block" />
            ),
          )}
        </ul>
        <span className="hidden text-xs text-muted lg:inline">{picked.length < 2 ? labels.hint : ""}</span>
        <button type="button" onClick={c.clear} className="text-xs text-muted hover:text-ink">{labels.clear}</button>
        <Link href={`/${lang}/compare?p=${picked.map((p) => p.slug).join(",")}`} className="solid !py-2 text-sm">
          {labels.open}（{picked.length}）
        </Link>
      </div>
    </div>
  );
}
