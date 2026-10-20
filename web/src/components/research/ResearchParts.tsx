import Link from "next/link";

import type { Dictionary, Locale } from "@/lib/i18n";
import type { Method, Paper } from "@/lib/research";

type T = Dictionary["research"];

// 日本語ページでは訳題（なければ原題）、英語ページでは原題
export const paperTitle = (p: Paper, lang: Locale) => (lang === "ja" ? p.title_ja ?? p.title : p.title);

export function DraftBadge({ t }: { t: T }) {
  return <span className="flex-none whitespace-nowrap rounded-sm bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900">{t.draft}</span>;
}

// 解説文: 空行で区切った段落。「- 」の行は箇条書き、箇条書きの前の1行は小見出し
export function Body({ text }: { text: string }) {
  return (
    <div className="grid gap-5">
      {text.split(/\n\s*\n/).map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const items = lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
        const head = lines[0] && !lines[0].startsWith("- ") && items.length ? lines[0] : null;
        if (!items.length) return <p key={i} className="leading-[1.9]">{lines.join(" ")}</p>;
        return (
          <section key={i}>
            {head && <h3 className="mb-2 text-sm font-medium">{head}</h3>}
            <ul className="grid list-disc gap-1.5 pl-5 leading-[1.8] marker:text-muted">
              {items.map((it, k) => <li key={k}>{it}</li>)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function PaperRow({ lang, paper, methods, t }: { lang: Locale; paper: Paper; methods: Method[]; t: T }) {
  const ms = paper.methods.map((x) => methods.find((m) => m.slug === x.method.slug)).filter((m): m is Method => !!m);
  return (
    <li className="py-4">
      <Link href={`/${lang}/research/papers/${paper.slug}`} className="group grid gap-1">
        <span className="font-medium leading-snug group-hover:underline">{paperTitle(paper, lang)}</span>
        <span className="text-xs text-muted">
          {paper.authors} · <span className="num">{paper.year}</span> · {paper.venue}
        </span>
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {ms.map((m) => (
          <Link key={m.slug} href={`/${lang}/research/methods/${m.slug}`} className="rounded-sm border border-line px-2 py-0.5 text-[11px] hover:border-ink">
            {lang === "en" ? m.name_en : m.name_ja}
          </Link>
        ))}
        <span className="text-[11px] text-muted">{t.kind[paper.kind]}</span>
        {paper.review_status === "draft" && <DraftBadge t={t} />}
      </div>
    </li>
  );
}
