"use client";

import { useEffect, useState } from "react";

// 管理画面の「Google フォトから追加」。Google フォトの画面で写真を選ぶと、ファイルとして受け取る。
// 受け取ったあとは、手元のファイルを選んだときと同じ処理（EXIF の削除・アップロード）に進む。
// Google の仕様で、Google フォトから取り出した写真には撮影地点（GPS）が付かない
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const ROUTE = "/api/admin/google-photos";

type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void };
type Gis = { accounts: { oauth2: { initTokenClient: (c: { client_id: string; scope: string; callback: (r: { access_token?: string; error?: string }) => void; error_callback?: (e: { type?: string }) => void }) => TokenClient } } };

let gisLoading: Promise<Gis> | null = null;
function loadGis(): Promise<Gis> {
  const w = window as unknown as { google?: Gis };
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google);
  gisLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => (w.google ? resolve(w.google) : reject(new Error("Google の読み込みに失敗しました")));
    s.onerror = () => {
      gisLoading = null;
      reject(new Error("Google の読み込みに失敗しました"));
    };
    document.head.appendChild(s);
  });
  return gisLoading;
}

// アクセストークンは画面を開いている間だけ覚えておく（保存しない）
let cached: { token: string; until: number } | null = null;
async function getToken(): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.token;
  const gis = await loadGis();
  return new Promise((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (!r.access_token) return reject(new Error(r.error === "access_denied" ? "Google フォトへのアクセスが許可されませんでした" : "Google のログインに失敗しました"));
        cached = { token: r.access_token, until: Date.now() + 50 * 60 * 1000 };
        resolve(r.access_token);
      },
      error_callback: (e) => reject(new Error(e.type === "popup_closed" ? "Google のログイン画面が閉じられました" : "Google のログインに失敗しました")),
    });
    client.requestAccessToken();
  });
}

async function call<T>(token: string, init: RequestInit & { query?: string } = {}): Promise<T> {
  const r = await fetch(`${ROUTE}${init.query ? `?${init.query}` : ""}`, { ...init, headers: { "x-google-token": token } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) cached = null;
    throw new Error(body.error ?? "Google フォトとの通信に失敗しました");
  }
  return body as T;
}

const seconds = (d?: string) => (d ? parseFloat(d) * 1000 : NaN);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function GooglePhotosButton({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickerUrl, setPickerUrl] = useState("");
  // Google のログイン窓を押した直後に開けるよう、先に読み込んでおく
  useEffect(() => {
    if (CLIENT_ID) loadGis().catch(() => {});
  }, []);

  if (!CLIENT_ID) {
    return <span className="text-xs text-muted">Google フォトから追加: 準備中（NEXT_PUBLIC_GOOGLE_CLIENT_ID が未設定）</span>;
  }

  const pick = async () => {
    setBusy(true);
    let token = "";
    let sessionId = "";
    try {
      setStatus("Google にログインしています…");
      token = await getToken();
      const session = await call<{ id: string; pickerUri: string; pollingConfig?: { pollInterval?: string; timeoutIn?: string } }>(token, { method: "POST" });
      sessionId = session.id;
      const url = `${session.pickerUri}/autoclose`;
      // ブラウザが新しい窓を止めたときのために、開くためのボタンも出す
      setPickerUrl(url);
      window.open(url, "google-photos", "width=1100,height=800");
      setStatus("Google フォトの画面で写真を選び、「完了」を押してください…");

      // 選び終わるまで待つ（Google が勧める間隔で確かめる）
      const until = Date.now() + (seconds(session.pollingConfig?.timeoutIn) || 20 * 60 * 1000);
      let interval = seconds(session.pollingConfig?.pollInterval) || 3000;
      for (;;) {
        await sleep(Math.max(1000, interval));
        if (Date.now() > until) throw new Error("時間切れです。もう一度やり直してください");
        const s = await call<{ mediaItemsSet: boolean; pollingConfig?: { pollInterval?: string } }>(token, { query: `session=${sessionId}` });
        if (s.mediaItemsSet) break;
        interval = seconds(s.pollingConfig?.pollInterval) || interval;
      }

      setPickerUrl("");
      const { items } = await call<{ items: { id: string; baseUrl: string; filename: string; createTime: string | null }[] }>(token, { query: `items=${sessionId}` });
      if (!items.length) throw new Error("写真が選ばれていません（動画は追加できません）");
      const files: File[] = [];
      for (const [i, it] of items.entries()) {
        setStatus(`Google フォトから受け取っています（${i + 1}/${items.length}）…`);
        const r = await fetch(`${ROUTE}?image=${encodeURIComponent(it.baseUrl)}`, { headers: { "x-google-token": token } });
        if (!r.ok) throw new Error(`${it.filename} を受け取れませんでした`);
        const blob = await r.blob();
        // 撮影日は Google フォトの撮影日時を、ファイルの更新日時として渡す
        const lastModified = it.createTime ? Date.parse(it.createTime) : Date.now();
        const file = new File([blob], it.filename.replace(/\.\w+$/, "") + ".jpg", { type: blob.type || "image/jpeg", lastModified });
        fromGoogle.add(file);
        files.push(file);
      }
      setStatus(`Google フォトから ${files.length} 枚を受け取りました`);
      onFiles(files);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      if (token && sessionId) void call(token, { method: "DELETE", query: `session=${sessionId}` }).catch(() => {});
      setBusy(false);
      setPickerUrl("");
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void pick()} disabled={busy || disabled} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm hover:border-ink disabled:opacity-50">
        <PhotosMark /> {busy ? "Google フォトで選んでいます…" : "Google フォトから追加"}
      </button>
      {pickerUrl && (
        <a href={pickerUrl} target="google-photos" rel="noopener" className="rounded-md bg-ink px-3 py-2 text-sm text-white">
          Google フォトを開く
        </a>
      )}
      {status && <span className="text-xs text-muted">{status}</span>}
    </span>
  );
}

// Google フォトから受け取ったファイルの撮影日（YYYY-MM-DD、日本時間）。それ以外のファイルは null
const fromGoogle = new WeakSet<File>();
export function googleTakenOn(file: File) {
  return fromGoogle.has(file) ? new Date(file.lastModified + 9 * 3600 * 1000).toISOString().slice(0, 10) : null;
}

function PhotosMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#FBBC04" d="M12 2a5 5 0 0 1 5 5v5H7V7a5 5 0 0 1 5-5z" transform="rotate(0 12 12)" opacity=".95" />
      <path fill="#EA4335" d="M22 12a5 5 0 0 1-5 5h-5V7h5a5 5 0 0 1 5 5z" opacity=".9" />
      <path fill="#34A853" d="M12 22a5 5 0 0 1-5-5v-5h10v5a5 5 0 0 1-5 5z" opacity=".9" />
      <path fill="#4285F4" d="M2 12a5 5 0 0 1 5-5h5v10H7a5 5 0 0 1-5-5z" opacity=".9" />
    </svg>
  );
}
