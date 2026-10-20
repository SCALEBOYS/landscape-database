"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { createBrowserSupabase } from "@/lib/supabase-browser";

import { signOut } from "../auth-actions";

type Step =
  | { kind: "loading" }
  | { kind: "verify"; factorId: string }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "error"; message: string };

// 認証アプリ（Google Authenticator、1Password、iPhone のパスワードなど）のワンタイムコードで2段階認証する
// 初回は QR コードを読み取って登録し、2回目以降はコードを入れるだけ
export function MfaGate({ email }: { email: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (error) return setStep({ kind: "error", message: error.message });
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) return setStep({ kind: "verify", factorId: verified.id });
      // 登録の途中でやめた（未確認の）ものは消してから、新しく登録する
      for (const f of data.all.filter((f) => f.factor_type === "totp" && f.status !== "verified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
      const res = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Landscape Database ${new Date().toISOString().slice(0, 10)}` });
      if (cancelled) return;
      if (res.error) return setStep({ kind: "error", message: `2段階認証を登録できませんでした: ${res.error.message}` });
      setStep({ kind: "enroll", factorId: res.data.id, qr: res.data.totp.qr_code, secret: res.data.totp.secret });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = () =>
    start(async () => {
      if (step.kind !== "verify" && step.kind !== "enroll") return;
      setError("");
      const { error } = await createBrowserSupabase().auth.mfa.challengeAndVerify({ factorId: step.factorId, code: code.trim() });
      if (error) {
        setError("コードが違うか、期限が切れています。アプリに表示されている最新の6桁を入れてください");
        return;
      }
      router.replace("/admin");
      router.refresh();
    });

  return (
    <div className="mx-auto mt-16 max-w-md rounded-md border border-line bg-white p-6">
      <h1 className="mb-1 text-lg font-medium">2段階認証</h1>
      <p className="mb-6 text-xs text-muted">{email}</p>

      {step.kind === "loading" && <p className="text-sm text-muted">準備しています…</p>}
      {step.kind === "error" && <p className="text-sm text-red-700">{step.message}</p>}

      {step.kind === "enroll" && (
        <div className="mb-5 grid gap-3 text-sm">
          <p>
            管理画面には、パスワードに加えて認証アプリのコードが必要です。スマートフォンの認証アプリ（Google Authenticator、Microsoft Authenticator、1Password、iPhone の「パスワード」など）で、この QR コードを読み取ってください。
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.qr} alt="2段階認証の登録用 QR コード" className="mx-auto h-48 w-48" />
          <details className="text-xs text-muted">
            <summary className="cursor-pointer">QR コードを読み取れないとき（手で入れる鍵）</summary>
            <code className="mt-2 block break-all rounded bg-placeholder p-2 text-ink">{step.secret}</code>
            <p className="mt-2">この鍵は、スマートフォンを無くしたときの再登録にも使えます。人に見られない場所に控えておいてください。</p>
          </details>
        </div>
      )}

      {(step.kind === "verify" || step.kind === "enroll") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="grid gap-3"
        >
          <label className="text-sm">
            認証アプリの6桁のコード
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="123456"
              className="num mt-1 w-full rounded-md border border-line px-3 py-2 text-center text-xl tracking-[.4em]"
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={code.length !== 6 || pending} className="rounded-md bg-accent py-2 text-white disabled:opacity-50">
            {pending ? "確認中…" : step.kind === "enroll" ? "登録して管理画面へ" : "管理画面へ"}
          </button>
        </form>
      )}

      <form action={signOut} className="mt-6 text-center">
        <button type="submit" className="text-xs text-muted hover:text-ink">ログアウト</button>
      </form>
    </div>
  );
}
