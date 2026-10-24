import "../globals.css";

import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";

const noto = Noto_Sans_JP({ variable: "--font-noto-sans-jp", weight: ["300", "400", "500"], preload: false });

export const metadata: Metadata = {
  title: { default: "管理画面", template: "%s | 管理画面 | Landscape Database" },
  robots: { index: false, follow: false },
};

// 管理画面は公開サイト（/[lang]）とは別のルートレイアウト。日本語のみ
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="ja" className={`${noto.variable} h-full antialiased`}>
      <body className="min-h-full bg-placeholder/40">
        {/* メニューがあるページ（ログイン後）は、PC で左のメニューの分だけ右に寄せる */}
        <div className="admin-main mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:pt-8">{children}</div>
      </body>
    </html>
  );
}
