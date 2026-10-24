"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { NavGroup } from "@/lib/nav";

import { Icon } from "./Icon";

// PC・タブレットのヘッダー。大分類にマウスを乗せる（またはキーボードで移る）と、中のページが開く
// タブレットなどマウスのない端末では、1回目のタップで開き、もう一度タップすると大分類のページへ移る
export function SiteNav({ groups, lang }: { groups: NavGroup[]; lang: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLUListElement>(null);

  // ページを移ったら閉じる。外側をタップしても閉じる
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(null);
  }
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const inGroup = (g: NavGroup) =>
    g.key === "home" ? pathname === `/${lang}` || pathname.startsWith(`/${lang}/news`) : g.items.some((it) => { const path = it.href.split("#")[0]; return path !== `/${lang}` && (pathname === path || pathname.startsWith(`${path}/`)); });

  return (
    <ul ref={root} className="flex items-center gap-1 text-[13px] font-semibold tracking-[.08em] lg:gap-2">
      {groups.map((g, i) => (
        <li key={g.key} className="group relative">
          <Link
            href={g.href}
            aria-haspopup="true"
            aria-expanded={open === g.key}
            onClick={(e) => {
              if (window.matchMedia("(hover: hover)").matches || open === g.key) return;
              e.preventDefault();
              setOpen(g.key);
            }}
            className={`flex h-[var(--hdr)] items-center gap-1 px-2.5 transition ${inGroup(g) ? "opacity-100" : "opacity-70 hover:opacity-100"}`}>
            {g.label}
            <span className={`absolute inset-x-2.5 bottom-3 h-px bg-white transition-opacity ${inGroup(g) ? "opacity-100" : "opacity-0"}`} />
          </Link>
          {/* 右寄りの大分類（RESEARCH・DATA）は、メニューを右端にそろえる。中央寄せだと画面の右からはみ出し、ページ全体が横にずれる */}
          <div className={`invisible absolute top-full z-40 pt-1 ${i >= groups.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2"} opacity-0 transition-[opacity,visibility] duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 ${open === g.key ? "!visible !opacity-100" : ""}`}>
            <ul className="grid w-[300px] gap-0.5 rounded-lg border border-white/10 bg-[#141414] p-2 tracking-normal shadow-[0_18px_40px_rgba(0,0,0,.45)]">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} className="flex items-center gap-3 rounded-md px-2.5 py-2 hover:bg-white/10">
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-white/10">
                      <Icon name={it.icon} className="ico !h-4 !w-4" />
                    </span>
                    <span className="grid min-w-0">
                      <span className="text-[14px] font-medium">{it.label}</span>
                      <span className="truncate text-[11px] font-normal text-white/50">{it.desc}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}
