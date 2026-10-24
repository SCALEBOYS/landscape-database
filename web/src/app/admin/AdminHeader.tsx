import { AdminNav } from "./AdminNav";
import { signOut } from "./auth-actions";

// 各ページの上で呼ぶ。メニュー（PC は左、スマホは上）を出す
export function AdminHeader({ email }: { email: string }) {
  return <AdminNav email={email} signOut={signOut} />;
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
