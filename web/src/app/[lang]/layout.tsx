import "../globals.css";

import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Analytics } from "@vercel/analytics/next";

import { Icon } from "@/components/Icon";
import { LangSwitcher } from "@/components/LangSwitcher";
import { CompareTray } from "@/components/compare/CompareTray";
import { PageViewTracker } from "@/components/PageViewTracker";
import { MobileMenu } from "@/components/MobileMenu";
import { cardImage } from "@/components/ProjectCard";
import { getBrowseItems } from "@/lib/browse-data";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";
import { siteNav } from "@/lib/nav";
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
  const groups = siteNav(lang);
  // 画面下の「比較」欄に出すための、事例の名前と小さな画像
  const trayProjects = (await getBrowseItems(lang)).map((it) => ({ slug: it.slug, name: it.name, img: cardImage({ cover: it.photo, lat: it.lat, lng: it.lng }) }));

  return (
    <html lang={lang} className={`${noto.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* キーボードで操作する人が、ヘッダーを飛ばして本文へ移れるように */}
        <a href="#main" className="skip-link">{lang === "en" ? "Skip to content" : "本文へ移動"}</a>
        <header id="top" className="sticky top-0 z-30 bg-ink text-white">
          <div className="mx-auto flex h-[var(--hdr)] max-w-none items-center gap-6 px-4 md:px-8">
            {/* ロゴは文字だけのシンプルな形。添え書きや装飾は付けない */}
            <Link href={`/${lang}`} className="whitespace-nowrap text-[17px] font-semibold tracking-[-0.01em]">
              {t.siteName}
            </Link>
            {/* PC・タブレットは横並び。スマホは「地図」だけ出して、ほかはメニューから */}
            <nav className="ml-auto hidden items-center gap-4 whitespace-nowrap md:flex" aria-label="main">
              <SiteNav groups={groups} lang={lang} />
              <span className="text-sm"><LangSwitcher current={lang} /></span>
            </nav>
            <div className="ml-auto flex items-center gap-3 text-[13px] font-medium md:hidden">
              <Link href={`/${lang}/explore`} className="flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 hover:bg-white/10">
                <Icon name="map" className="ico !h-4 !w-4" />
                {t.nav.explore}
              </Link>
              <MobileMenu lang={lang} groups={groups} labels={{ open: t.menu.open, close: t.menu.close }} />
            </div>
          </div>
        </header>
        <main id="main" className="fade-in flex-1">{children}</main>
        <SiteFooter lang={lang} />
        <CompareTray lang={lang} projects={trayProjects} labels={t.compare} />
        {/* アクセス計測（Cookie を使わない Vercel Web Analytics） */}
        <Analytics />
        {/* 管理画面のアクセス解析用（Cookie なし・IP は保存しない） */}
        <PageViewTracker />
      </body>
    </html>
  );
}
