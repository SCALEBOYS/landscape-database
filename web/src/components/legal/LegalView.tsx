import Link from "next/link";

import type { LegalPage } from "@/lib/legal";

// このサイトについて・利用規約・プライバシーの共通の見た目
export function LegalView({ page, lang, updatedLabel, contactLabel }: { page: LegalPage; lang: string; updatedLabel: string; contactLabel: string }) {
  return (
    <article className="wrap max-w-[760px] pt-12">
      <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-[-0.02em]">{page.title}</h1>
      <p className="mt-4 leading-[1.9] text-muted">{page.lead}</p>
      <div className="mt-10 grid gap-9">
        {page.blocks.map((b, i) => (
          <section key={i} className="grid gap-2.5">
            {b.h && <h2 className="border-b border-ink pb-2 text-lg font-semibold">{b.h}</h2>}
            {b.p && <p className="leading-[1.9]">{b.p}</p>}
            {b.list && (
              <ul className="grid list-disc gap-2 pl-5 leading-[1.85] marker:text-muted">
                {b.list.map((x, k) => <li key={k}>{x}</li>)}
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
        <span>{updatedLabel}: {page.updated}</span>
        <Link href={`/${lang}/contact`} className="text-accent hover:underline">{contactLabel}</Link>
      </p>
    </article>
  );
}
