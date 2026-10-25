import Link from "next/link";
import { Suspense } from "react";

import { requireUser } from "@/lib/supabase-server";

import { AdminHeader, NotAdmin } from "../AdminHeader";

type Summary = {
  since: string;
  views: number;
  visitors: number;
  daily: { day: string; views: number; visitors: number }[];
  pages: { path: string; views: number; visitors: number }[];
  referrers: { host: string; views: number }[];
  countries: { country: string; views: number }[];
  devices: { device: string; views: number }[];
  langs: { lang: string; views: number }[];
};

const PERIODS = [7, 30, 90] as const;
const DEVICE: Record<string, string> = { desktop: "PC", mobile: "スマホ", tablet: "タブレット" };
// 固定のページの名前（事例・樹種などは名前を引く）
const FIXED: Record<string, string> = {
  "": "HOME", "/projects": "事例から探す", "/explore": "地図から探す", "/materials": "素材から探す", "/species": "樹種から探す", "/designers": "設計から探す",
  "/compare": "事例を比較する", "/research": "研究を探す", "/laws": "法令", "/graph": "つながり", "/ask": "AIに聞く", "/data": "DATA", "/data/photos": "写真",
  "/data/models": "3D モデル", "/news": "NEWS", "/about": "このサイトについて", "/contact": "お問い合わせ", "/terms": "利用規約", "/privacy": "プライバシーポリシー",
};

export default function AnalyticsPage(props: PageProps<"/admin/analytics">) {
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <Analytics {...props} />
    </Suspense>
  );
}

async function Analytics({ searchParams }: PageProps<"/admin/analytics">) {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) return <NotAdmin email={user.email ?? ""} />;
  const raw = Number((await searchParams).days);
  const days = (PERIODS as readonly number[]).includes(raw) ? raw : 30;

  const [{ data, error }, { data: projects }, { data: species }] = await Promise.all([
    supabase.rpc("analytics_summary", { p_days: days }),
    supabase.from("projects").select("slug, name_ja"),
    supabase.from("species").select("slug, name_ja"),
  ]);
  if (error) throw error;
  const s = data as Summary;
  const names = new Map<string, string>([...(projects ?? []).map((p) => [`/projects/${p.slug}`, p.name_ja] as const), ...(species ?? []).map((x) => [`/species/${x.slug}`, `樹種: ${x.name_ja}`] as const)]);
  const pageName = (path: string) => {
    const rest = path.replace(/^\/(ja|en)/, "");
    return FIXED[rest] ?? names.get(rest) ?? rest;
  };
  const region = new Intl.DisplayNames(["ja"], { type: "region" });
  const max = Math.max(1, ...s.daily.map((d) => d.views));
  const fmtDay = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">アクセス解析</h1>
          <p className="mt-1 text-xs text-muted">公開サイトの表示を、Cookie を使わずに数えています（IP アドレスは保存しません）。検索エンジンなどの自動の巡回は除いています。訪問者数は日ごとの数の合計です。</p>
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <Link key={p} href={`/admin/analytics?days=${p}`} className={`rounded-full border px-3 py-1 text-xs ${p === days ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}>
              {p}日間
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["表示されたページ", s.views],
          ["訪問者（日ごと）", s.daily.reduce((n, d) => n + d.visitors, 0)],
          ["1日あたりの表示", Math.round(s.views / Math.max(1, s.daily.length))],
        ].map(([label, n]) => (
          <div key={label} className="rounded-md border border-line bg-white p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="num mt-1 text-3xl font-semibold">{Number(n).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-md border border-line bg-white p-4">
        <div className="mb-3 flex items-center gap-4 text-xs text-muted">
          <h2 className="mr-auto text-sm font-medium text-ink">日ごとの推移</h2>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink" />表示</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent" />訪問者</span>
        </div>
        <div className="flex h-40 items-end gap-[2px]">
          {s.daily.map((d) => (
            <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${fmtDay(d.day)} 表示 ${d.views}・訪問者 ${d.visitors}`}>
              <div className="relative w-full rounded-t-sm bg-ink/85" style={{ height: `${(d.views / max) * 100}%` }}>
                <div className="absolute inset-x-0 bottom-0 rounded-t-sm bg-accent" style={{ height: d.views ? `${(d.visitors / d.views) * 100}%` : 0 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted">
          <span>{s.daily[0] && fmtDay(s.daily[0].day)}</span>
          <span>{s.daily.at(-1) && fmtDay(s.daily.at(-1)!.day)}</span>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Table
          title="よく見られたページ"
          head={["ページ", "表示", "訪問者"]}
          rows={s.pages.map((p) => [
            <a key="p" href={p.path} target="_blank" className="hover:text-accent hover:underline">
              {pageName(p.path)}
              <span className="ml-1.5 text-[11px] text-muted">{p.path.slice(1, 3)}</span>
            </a>,
            p.views,
            p.visitors,
          ])}
        />
        <div className="grid gap-6">
          <Table title="どこから来たか" head={["参照元", "表示"]} rows={s.referrers.map((r) => [r.host || "直接・不明", r.views])} />
          <Table title="国・地域" head={["国・地域", "表示"]} rows={s.countries.map((c) => [c.country ? region.of(c.country) ?? c.country : "不明", c.views])} />
          <Table
            title="端末・言語"
            head={["種類", "表示"]}
            rows={[...s.devices.map((d) => [DEVICE[d.device] ?? d.device, d.views]), ...s.langs.map((l) => [l.lang === "en" ? "英語ページ" : l.lang === "ja" ? "日本語ページ" : "不明", l.views])]}
          />
        </div>
      </div>
    </>
  );
}

function Table({ title, head, rows }: { title: string; head: string[]; rows: React.ReactNode[][] }) {
  return (
    <section className="rounded-md border border-line bg-white p-4">
      <h2 className="mb-2 text-sm font-medium">{title}</h2>
      {rows.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              {head.map((h, i) => <th key={h} className={`py-1.5 font-normal ${i ? "w-16 text-right" : ""}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line/60 last:border-0">
                {r.map((c, j) => <td key={j} className={`py-1.5 ${j ? "num text-right" : "pr-2"}`}>{typeof c === "number" ? c.toLocaleString() : c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted">まだ記録はありません</p>
      )}
    </section>
  );
}
