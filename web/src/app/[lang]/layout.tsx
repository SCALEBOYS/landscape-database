import "../globals.css";

import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LangSwitcher } from "@/components/LangSwitcher";
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

  return (
    <html lang={lang} className={`${noto.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header id="top" className="sticky top-0 z-30 bg-ink text-white">
          <div className="mx-auto flex h-[var(--hdr)] max-w-none items-center gap-6 px-4 md:px-8">
            {/* ロゴは文字だけのシンプルな形。添え書きや装飾は付けない */}
            <Link href={`/${lang}`} className="whitespace-nowrap text-[17px] font-semibold tracking-[-0.01em]">
              {t.siteName}
            </Link>
            <nav className="ml-auto flex items-center gap-4 whitespace-nowrap text-[13px] font-medium md:gap-6 md:text-sm">
              <Link href={`/${lang}`} className="hidden opacity-75 hover:opacity-100 sm:inline">{t.nav.projects}</Link>
              <Link href={`/${lang}/explore`} className="opacity-75 hover:opacity-100">{t.nav.explore}</Link>
              <Link href={`/${lang}/species`} className="hidden opacity-75 hover:opacity-100 sm:inline">{t.nav.species}</Link>
              <Link href={`/${lang}/designers`} className="hidden opacity-75 hover:opacity-100 sm:inline">{t.nav.designers}</Link>
              <Link href={`/${lang}/laws`} className="hidden opacity-75 hover:opacity-100 sm:inline">{t.nav.laws}</Link>
              <Link href={`/${lang}/research`} className="hidden opacity-75 hover:opacity-100 sm:inline">{t.nav.research}</Link>
              <Link href={`/${lang}/graph`} className="opacity-75 hover:opacity-100">{t.nav.graph}</Link>
              <LangSwitcher current={lang} />
            </nav>
          </div>
        </header>
        <main className="fade-in flex-1">{children}</main>
        <SiteFooter lang={lang} />
      </body>
    </html>
  );
}
