import "../globals.css";

import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";
import { LangSwitcher } from "@/components/LangSwitcher";
import { MobileMenu } from "@/components/MobileMenu";
import { SiteFooter } from "@/components/SiteFooter";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import { INDEXABLE, SITE_URL } from "@/lib/site";

const noto = Noto_Sans_JP({ variable: "--font-noto-sans-jp", weight: ["400", "500", "700"], preload: false });
// 欧文は Apple 端末ではシステムフォント（SF Pro）、それ以外では Inter。SF Pro はライセンス上ウェブで配信できないため
// 端末に入っているものを使う（globals.css の --font-sans）。日本語の文字は Noto Sans JP に落ちる
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], axes: ["opsz"] });

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: { default: `${t.siteName} — ${t.tagline}`, template: `%s | ${t.siteName}` },
    description: t.tagline,
    metadataBase: new URL(SITE_URL),
    alternates: { languages: { ja: "/ja", en: "/en" } },
    robots: INDEXABLE ? undefined : { index: false, follow: false },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);
  const menu = [
    { href: `/${lang}`, label: t.nav.projects, desc: t.menu.desc.projects, icon: "grid" },
    { href: `/${lang}/explore`, label: t.nav.explore, desc: t.menu.desc.explore, icon: "map" },
    { href: `/${lang}/species`, label: t.nav.species, desc: t.menu.desc.species, icon: "shade" },
    { href: `/${lang}/designers`, label: t.nav.designers, desc: t.menu.desc.designers, icon: "field-design" },
    { href: `/${lang}/laws`, label: t.nav.laws, desc: t.menu.desc.laws, icon: "law-law" },
    { href: `/${lang}/research`, label: t.nav.research, desc: t.menu.desc.research, icon: "field-perception" },
    { href: `/${lang}/graph`, label: t.nav.graph, desc: t.menu.desc.graph, icon: "field-spatial" },
  ];

  return (
    <html lang={lang} className={`${noto.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header id="top" className="sticky top-0 z-30 bg-ink text-white">
          <div className="mx-auto flex h-[var(--hdr)] max-w-none items-center gap-6 px-4 md:px-8">
            {/* ロゴは文字だけのシンプルな形。添え書きや装飾は付けない */}
            <Link href={`/${lang}`} className="whitespace-nowrap text-[17px] font-semibold tracking-[-0.01em]">
              {t.siteName}
            </Link>
            {/* PC・タブレットは横並び。スマホは「地図」だけ出して、ほかはメニューから */}
            <nav className="ml-auto hidden items-center gap-5 whitespace-nowrap text-sm font-medium md:flex lg:gap-6">
              {menu.map((it) => (
                <Link key={it.href} href={it.href} className="opacity-75 hover:opacity-100">{it.label}</Link>
              ))}
              <LangSwitcher current={lang} />
            </nav>
            <div className="ml-auto flex items-center gap-3 text-[13px] font-medium md:hidden">
              <Link href={`/${lang}/explore`} className="flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 hover:bg-white/10">
                <Icon name="map" className="ico !h-4 !w-4" />
                {t.nav.explore}
              </Link>
              <MobileMenu lang={lang} items={menu} labels={{ open: t.menu.open, close: t.menu.close }} />
            </div>
          </div>
        </header>
        <main className="fade-in flex-1">{children}</main>
        <SiteFooter lang={lang} />
      </body>
    </html>
  );
}
