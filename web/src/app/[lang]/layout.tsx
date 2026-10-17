import "../globals.css";

import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LangSwitcher } from "@/components/LangSwitcher";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";

const noto = Noto_Sans_JP({ variable: "--font-noto-sans-jp", weight: ["300", "400", "500"], preload: false });

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
    alternates: { languages: { ja: "/ja", en: "/en" } },
    // 本公開（12週目）までは検索エンジンに載せない。Vercel で NEXT_PUBLIC_SITE_INDEXABLE=true にすると解除
    robots: process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true" ? undefined : { index: false, follow: false },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <html lang={lang} className={`${noto.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <Link href={`/${lang}`} className="text-lg font-light tracking-wide text-ink">
              {t.siteName}
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href={`/${lang}`} className="text-muted hover:text-ink">{t.nav.projects}</Link>
              <Link href={`/${lang}/species`} className="text-muted hover:text-ink">{t.nav.species}</Link>
              <Link href={`/${lang}/designers`} className="text-muted hover:text-ink">{t.nav.designers}</Link>
              <LangSwitcher current={lang} />
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-7xl px-4 py-8 text-xs leading-relaxed text-muted sm:px-6">
            <p>{t.footer.copyright}</p>
            <p className="mt-1">{t.footer.policy}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
