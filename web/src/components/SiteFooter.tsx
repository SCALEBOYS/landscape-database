import Link from "next/link";

import { categoryLabels, getDictionary, type Locale } from "@/lib/i18n";
import { siteNav } from "@/lib/nav";

import { Icon } from "./Icon";

// 足元に出す主な用途（地図で探す画面へ、その用途で絞った状態でつなぐ）
const FOOTER_USES = ["park", "plaza", "waterfront", "street", "office", "rooftop", "redevelopment"];

// ヘッダーと同じ黒の帯。サイトの説明・探す入口・用途の入口・方針と著作権表示
export function SiteFooter({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);
  const f = t.footer;
  const groups = siteNav(lang).filter((g) => g.key !== "home");

  return (
    <footer className="site-footer mt-24 bg-ink text-white">
      <div className="wrap grid grid-cols-2 gap-x-6 gap-y-12 pb-10 pt-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="col-span-2 grid content-start gap-4 md:col-span-1">
          <Link href={`/${lang}`} className="text-[20px] font-semibold leading-none tracking-[-0.01em]">
            {t.siteName}
          </Link>
          <p className="max-w-[34ch] text-sm leading-[1.8] text-white/65">{f.lead}</p>
        </div>
        <nav className="grid content-start gap-6" aria-label={f.browse}>
          {groups.map((g) => (
            <div key={g.key} className="grid gap-2.5">
              <h2 className="eyebrow !text-white/45">{g.label}</h2>
              {g.items.map((it) => (
                <Link key={it.href} href={it.href} className="text-sm text-white/85 hover:text-white hover:underline">
                  {it.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <nav className="grid content-start gap-3" aria-label={f.byUse}>
          <h2 className="eyebrow !text-white/45">{f.byUse}</h2>
          {FOOTER_USES.map((k) => (
            <Link key={k} href={`/${lang}/explore?uses=${k}`} className="inline-flex items-center gap-2 text-sm text-white/85 hover:text-white hover:underline">
              <Icon name={k} className="ico !h-[18px] !w-[18px] opacity-70" />
              {categoryLabels[k][lang]}
            </Link>
          ))}
        </nav>
        <div className="col-span-2 grid content-start gap-3 md:col-span-1">
          <h2 className="eyebrow !text-white/45">{f.about}</h2>
          <p className="text-[13px] leading-[1.8] text-white/65">{f.policy}</p>
          <p className="text-[13px] leading-[1.8] text-white/65">{f.photos}</p>
          <nav className="mt-1 grid gap-2 text-sm" aria-label={f.site}>
            {([["about", f.aboutLink], ["contact", f.contact], ["terms", f.terms], ["privacy", f.privacy]] as const).map(([k, label]) => (
              <Link key={k} href={`/${lang}/${k}`} className="text-white/85 hover:text-white hover:underline">{label}</Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5 text-xs text-white/50">
          <span>{f.copyright}</span>
          <span>{f.mapCredit}</span>
          <a href="#top" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white">
            {f.toTop}
            <Icon name="arrow" className="ico !h-4 !w-4 -rotate-90" />
          </a>
        </div>
      </div>
    </footer>
  );
}
