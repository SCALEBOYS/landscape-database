"use client";

import { useActionState } from "react";

import { signIn } from "../auth-actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <div className="mx-auto mt-20 max-w-sm rounded-md border border-line bg-white p-6">
      <h1 className="mb-6 text-lg font-medium">Landscape Database 管理画面</h1>
      <form action={action} className="space-y-4">
        <label className="block text-sm">
          メールアドレス
          <input name="email" type="email" required autoComplete="username" className="mt-1 w-full rounded-md border border-line px-3 py-2" />
        </label>
        <label className="block text-sm">
          パスワード
          <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-md border border-line px-3 py-2" />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={pending} className="w-full rounded-md bg-accent py-2 text-white disabled:opacity-50">
          {pending ? "ログイン中…" : "ログイン"}
        </button>
      </form>
    </div>
  );
}
