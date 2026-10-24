"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/Icon";

type Item = { href: string; label: string; icon: string; exact?: boolean };
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "事例",
    items: [
      { href: "/admin", label: "事例の一覧", icon: "grid", exact: true },
      { href: "/admin/projects/new", label: "新しく登録", icon: "park" },
      { href: "/admin/import", label: "一括取り込み・書き出し", icon: "redevelopment" },
      { href: "/admin/bulk-photos", label: "写真のまとめ取り込み", icon: "camera" },
    ],
  },
  {
    label: "AI",
    items: [
      { href: "/admin/ai", label: "AI アシスタント", icon: "spark", exact: true },
      { href: "/admin/ai/bulk", label: "AI でまとめて下書き", icon: "compare" },
    ],
  },
  {
    label: "記事・研究",
    items: [
      { href: "/admin/news", label: "NEWS・特集", icon: "news" },
      { href: "/admin/research", label: "研究（論文・手法）", icon: "field-perception" },
    ],
  },
  {
    label: "マスタ",
    items: [
      { href: "/admin/designers", label: "設計の名前", icon: "field-design" },
      { href: "/admin/materials", label: "素材の分類", icon: "stone" },
      { href: "/admin/species", label: "樹種の写真", icon: "shade" },
    ],
  },
  {
    label: "受信",
    items: [{ href: "/admin/inquiries", label: "お問い合わせ", icon: "contact" }],
  },
];

// 管理画面のメニュー。PC は左に固定、スマホ・タブレットは上のボタンで開く
export function AdminNav({ email, signOut }: { email: string; signOut: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prev, setPrev] = useState(pathname);
  if (prev !== pathname) {
    setPrev(pathname);
    setOpen(false);
  }
  const active = (it: Item) =>
    it.exact ? pathname === it.href || (it.href === "/admin" && pathname.startsWith("/admin/projects/") && pathname !== "/admin/projects/new") : pathname === it.href || pathname.startsWith(`${it.href}/`);

  const menu = (
    <nav className="grid gap-5 text-sm" aria-label="管理メニュー">
      {GROUPS.map((g) => (
        <div key={g.label} className="grid gap-0.5">
          <p className="px-3 pb-1 text-[11px] font-medium tracking-[.12em] text-white/40">{g.label}</p>
          {g.items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active(it) ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 ${active(it) ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon name={it.icon} className="ico !h-[18px] !w-[18px] flex-none" />
              {it.label}
            </Link>
          ))}
        </div>
      ))}
      <div className="grid gap-1 border-t border-white/10 pt-4 text-xs text-white/55">
        <Link href="/ja" target="_blank" className="flex items-center gap-2 rounded-md px-3 py-1.5 hover:text-white">
          公開サイトを開く <Icon name="arrow" className="ico !h-3.5 !w-3.5 -rotate-45" />
        </Link>
        <span className="truncate px-3" title={email}>{email}</span>
        <form action={signOut}>
          <button type="submit" className="px-3 py-1.5 hover:text-white">ログアウト</button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      {/* PC: 左に固定 */}
      <aside className="admin-nav fixed inset-y-0 left-0 z-30 hidden w-60 overflow-y-auto bg-ink px-3 py-5 text-white lg:block">
        <Link href="/admin" className="mb-6 block px-3 text-[15px] font-semibold leading-tight">
          Landscape Database
          <span className="block text-[11px] font-normal text-white/50">管理画面</span>
        </Link>
        {menu}
      </aside>
      {/* スマホ・タブレット: 上の帯とメニューボタン */}
      <div className="admin-nav sticky top-0 z-30 -mx-4 mb-6 flex items-center justify-between bg-ink px-4 py-3 text-white sm:-mx-6 sm:px-6 lg:hidden">
        <Link href="/admin" className="text-[15px] font-semibold">管理画面</Link>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "メニューを閉じる" : "メニューを開く"} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      {open && <div className="fixed inset-x-0 bottom-0 top-[64px] z-30 overflow-y-auto bg-ink px-3 py-5 text-white lg:hidden">{menu}</div>}
    </>
  );
}
