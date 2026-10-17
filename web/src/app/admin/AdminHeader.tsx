import Link from "next/link";

import { signOut } from "./auth-actions";

export function AdminHeader({ email }: { email: string }) {
  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
      <Link href="/admin" className="font-medium">
        Landscape Database 管理画面
      </Link>
      <div className="flex items-center gap-4 text-sm text-muted">
        <Link href="/ja" className="hover:text-ink">公開サイト</Link>
        <span>{email}</span>
        <form action={signOut}>
          <button type="submit" className="hover:text-ink">ログアウト</button>
        </form>
      </div>
    </header>
  );
}

export function NotAdmin({ email }: { email: string }) {
  return (
    <div className="mt-20 text-center">
      <p>{email} には管理者の権限がありません。</p>
      <p className="mt-2 text-sm text-muted">admins テーブルへの登録が必要です（scripts/grant_admin.py）。</p>
      <form action={signOut} className="mt-6">
        <button type="submit" className="text-accent underline">ログアウト</button>
      </form>
    </div>
  );
}
