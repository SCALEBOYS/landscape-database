import { NextResponse } from "next/server";

import { createServerSupabase } from "@/lib/supabase-server";

// 管理画面の「Google フォトから追加」の中継。
// ブラウザで受け取った Google のアクセストークン（写真を選ぶ権限だけ）を使い、Google Photos Picker API を呼ぶ。
// 選んだ写真の取得もここを通す（Google の画像 URL はトークン付きで取りに行く必要があるため）
const API = "https://photospicker.googleapis.com/v1";
const MAX_SIDE = 2400;

async function isAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") return false;
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

const tokenOf = (req: Request) => {
  const t = req.headers.get("x-google-token") ?? "";
  return /^[\w.\-~+/]+=*$/.test(t) && t.length < 4096 ? t : null;
};
const fail = (status: number, message: string) => NextResponse.json({ error: message }, { status });

// 写真を選ぶ場（セッション）を作る / 終わったら消す
export async function POST(req: Request) {
  if (!(await isAdmin())) return fail(403, "管理者としてログインしてください");
  const token = tokenOf(req);
  if (!token) return fail(400, "Google のトークンがありません");
  const r = await fetch(`${API}/sessions`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}" });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) return fail(r.status, googleError(body));
  return NextResponse.json({ id: body.id, pickerUri: body.pickerUri, pollingConfig: body.pollingConfig });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return fail(403, "管理者としてログインしてください");
  const token = tokenOf(req);
  const id = new URL(req.url).searchParams.get("session") ?? "";
  if (!token || !/^[\w-]+$/.test(id)) return fail(400, "指定が正しくありません");
  await fetch(`${API}/sessions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  return NextResponse.json({ ok: true });
}

// ?session=ID … 選び終わったか / ?items=ID … 選んだ写真の一覧 / ?image=URL … 写真の中身（長辺2400px）
export async function GET(req: Request) {
  if (!(await isAdmin())) return fail(403, "管理者としてログインしてください");
  const token = tokenOf(req);
  if (!token) return fail(400, "Google のトークンがありません");
  const auth = { Authorization: `Bearer ${token}` };
  const q = new URL(req.url).searchParams;

  const session = q.get("session");
  if (session) {
    if (!/^[\w-]+$/.test(session)) return fail(400, "指定が正しくありません");
    const r = await fetch(`${API}/sessions/${session}`, { headers: auth, cache: "no-store" });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return fail(r.status, googleError(body));
    return NextResponse.json({ mediaItemsSet: body.mediaItemsSet === true, pollingConfig: body.pollingConfig });
  }

  const items = q.get("items");
  if (items) {
    if (!/^[\w-]+$/.test(items)) return fail(400, "指定が正しくありません");
    type Item = { id: string; createTime?: string; type?: string; mediaFile?: { baseUrl: string; mimeType?: string; filename?: string } };
    const all: Item[] = [];
    let page = "";
    do {
      const r = await fetch(`${API}/mediaItems?sessionId=${items}&pageSize=100${page ? `&pageToken=${encodeURIComponent(page)}` : ""}`, { headers: auth, cache: "no-store" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) return fail(r.status, googleError(body));
      all.push(...((body.mediaItems ?? []) as Item[]));
      page = body.nextPageToken ?? "";
    } while (page && all.length < 500);
    return NextResponse.json({
      items: all
        .filter((m) => m.type !== "VIDEO" && m.mediaFile?.baseUrl)
        .map((m) => ({ id: m.id, baseUrl: m.mediaFile!.baseUrl, filename: m.mediaFile!.filename ?? `${m.id}.jpg`, createTime: m.createTime ?? null })),
    });
  }

  const image = q.get("image");
  if (image) {
    // Google の画像サーバー以外には取りに行かない
    let url: URL;
    try {
      url = new URL(image);
    } catch {
      return fail(400, "指定が正しくありません");
    }
    if (url.protocol !== "https:" || !url.hostname.endsWith(".googleusercontent.com")) return fail(400, "指定が正しくありません");
    const r = await fetch(`${image}=w${MAX_SIDE}-h${MAX_SIDE}`, { headers: auth, cache: "no-store" });
    if (!r.ok || !r.body) return fail(r.status || 502, "写真を取得できませんでした");
    return new Response(r.body, { headers: { "Content-Type": r.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "no-store" } });
  }
  return fail(400, "指定が正しくありません");
}

function googleError(body: unknown) {
  const e = (body as { error?: { message?: string; status?: string } })?.error;
  if (e?.status === "PERMISSION_DENIED" || e?.status === "UNAUTHENTICATED") return "Google フォトへのアクセスが許可されていません。もう一度やり直してください";
  return e?.message ?? "Google フォトとの通信に失敗しました";
}
