import Link from "next/link";

import { getDictionary, type Locale } from "@/lib/i18n";
import { siteNav } from "@/lib/nav";

import { Icon } from "./Icon";
import { SocialLinks } from "./SocialLinks";

// ヘッダーと同じ黒の帯。サイト名・ソーシャルメディア・大分類ごとの入口、下の行に方針のページと著作権表示
export function SiteFooter({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);
  const f = t.footer;
  const groups = siteNav(lang).filter((g) => g.key !== "home");

  return (
    <footer className="site-footer mt-24 bg-ink text-white">
      <div className="wrap grid gap-x-10 gap-y-8 pb-8 pt-10 md:grid-cols-[1fr_auto]">
        <div className="grid content-start gap-3">
          <Link href={`/${lang}`} className="text-[20px] font-semibold leading-none tracking-[-0.01em]">
            {t.siteName}
          </Link>
          <p className="max-w-[40ch] text-[13px] leading-[1.75] text-white/60">{f.lead}</p>
          <div className="-ml-2">
            <SocialLinks label={f.follow} />
          </div>
        </div>
        <nav className="grid grid-cols-3 gap-x-6 gap-y-6 sm:gap-x-12" aria-label={f.browse}>
          {groups.map((g) => (
            <div key={g.key} className="grid content-start gap-2">
              <h2 className="eyebrow !text-white/45">{g.label}</h2>
              {g.items.map((it) => (
                <Link key={it.href} href={it.href} className="text-[13px] text-white/80 hover:text-white hover:underline">
                  {it.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-white/15">
        <div className="wrap flex flex-wrap items-center gap-x-5 gap-y-2 py-4 text-xs text-white/50">
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label={f.site}>
            {([["about", f.aboutLink], ["contact", f.contact], ["terms", f.terms], ["privacy", f.privacy]] as const).map(([k, label]) => (
              <Link key={k} href={`/${lang}/${k}`} className="text-white/70 hover:text-white hover:underline">{label}</Link>
            ))}
          </nav>
          <span>{f.copyright}</span>
          <span>{f.mapCredit}</span>
          <a href="#top" className="ml-auto inline-flex items-center gap-1.5 text-white/70 hover:text-white">
            {f.toTop}
            <Icon name="arrow" className="ico !h-4 !w-4 -rotate-90" />
          </a>
        </div>
      </div>
    </footer>
  );
}
