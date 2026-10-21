"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "./Icon";
import { LangSwitcher } from "./LangSwitcher";

import type { Locale } from "@/lib/i18n";

export type MenuItem = { href: string; label: string; desc: string; icon: string };

// スマホのヘッダー右端のメニュー。ヘッダーの下に全面で開き、各ページへ移れる
export function MobileMenu({ lang, items, labels }: { lang: Locale; items: MenuItem[]; labels: { open: string; close: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // 開いている間は後ろのページをスクロールさせない。Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const current = (href: string) => (href === `/${lang}` ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? labels.close : labels.open}
        className="-mr-2 grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 md:hidden"
      >
        <Icon name={open ? "x" : "menu"} className="ico !h-6 !w-6" />
      </button>

      <div
        id="mobile-menu"
        hidden={!open}
        className="fade-in fixed inset-x-0 bottom-0 top-[var(--hdr)] z-40 overflow-y-auto bg-ink text-white md:hidden"
      >
        <nav className="grid gap-1 px-4 pb-10 pt-3">
          {items.map((it, i) => {
            const on = current(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                aria-current={on ? "page" : undefined}
                className={`menu-item group flex items-center gap-4 rounded-lg px-3 py-3.5 ${on ? "bg-white/10" : "hover:bg-white/5"}`}
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <span className={`grid h-11 w-11 flex-none place-items-center rounded-full ${on ? "bg-white text-ink" : "bg-white/10 text-white"}`}>
                  <Icon name={it.icon} className="ico !h-5 !w-5" />
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-[19px] font-semibold leading-tight tracking-[-0.01em]">{it.label}</span>
                  <span className="truncate text-[13px] text-white/55">{it.desc}</span>
                </span>
                <Icon name="arrow" className="ico ml-auto !h-4 !w-4 flex-none opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-80" />
              </Link>
            );
          })}
          <div className="mt-4 flex items-center justify-between border-t border-white/15 px-3 pt-5 text-sm">
            <span className="text-white/50">Landscape Database</span>
            <span onClick={() => setOpen(false)}>
              <LangSwitcher current={lang} />
            </span>
          </div>
        </nav>
      </div>
    </>
  );
}
