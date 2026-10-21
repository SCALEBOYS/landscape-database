import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../AdminHeader";
import { StatusSelect } from "./StatusSelect";

const TOPICS: Record<string, string> = { general: "一般", correction: "訂正の依頼", removal: "削除の依頼", rights: "写真・権利", request: "調査の依頼" };

export default function InquiriesPage() {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Inquiries />
    </Suspense>
  );
}

async function Inquiries() {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  const { data } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(200);
  const open = (data ?? []).filter((x) => x.status !== "done").length;
  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <h1 className="mb-1 text-xl">お問い合わせ</h1>
      <p className="mb-6 text-sm text-muted">公開サイトのフォームから届いたものです。未対応 {open} 件。訂正・削除の依頼は、内容を確かめて事例を直したら「対応済み」にしてください。</p>
      {data?.length ? (
        <ul className="grid gap-3">
          {data.map((x) => (
            <li key={x.id} className={`rounded-md border bg-white p-4 text-sm ${x.status === "done" ? "border-line opacity-60" : "border-accent/40"}`}>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <span className="rounded bg-ink px-2 py-0.5 text-xs text-white">{TOPICS[x.topic] ?? x.topic}</span>
                <span className="font-medium">{x.name}</span>
                <a href={`mailto:${x.email}`} className="text-accent hover:underline">{x.email}</a>
                {x.organization && <span className="text-muted">{x.organization}</span>}
                <span className="ml-auto text-xs text-muted">{new Date(x.created_at).toLocaleString("ja-JP")}</span>
                <StatusSelect id={x.id} status={x.status} />
              </div>
              {x.page_url && <a href={x.page_url} target="_blank" rel="noopener noreferrer" className="mb-2 block break-all text-xs text-accent hover:underline">{x.page_url}</a>}
              <p className="whitespace-pre-wrap leading-relaxed">{x.message}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">まだ届いていません</p>
      )}
    </>
  );
}
