import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/Icon";
import { Body } from "@/components/research/ResearchParts";
import { getDictionary, hasLocale, localName, locales } from "@/lib/i18n";
import { getPosts, postDate, postTitle } from "@/lib/posts";
import { alternates } from "@/lib/site";

export async function generateStaticParams() {
  const posts = await getPosts();
  return locales.flatMap((lang) => posts.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/news/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = (await getPosts()).find((x) => x.slug === slug);
  if (!p || !hasLocale(lang)) return {};
  const description = (lang === "en" ? p.summary_en ?? p.summary_ja : p.summary_ja) ?? undefined;
  return { title: postTitle(p, lang), description, alternates: alternates(lang, `/news/${slug}`), openGraph: { type: "article", ...(p.cover ? { images: [{ url: p.cover }] } : {}) } };
}

export default async function PostPage({ params }: PageProps<"/[lang]/news/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const p = (await getPosts()).find((x) => x.slug === slug);
  if (!p) notFound();
  const t = getDictionary(lang).news;
  const body = lang === "en" ? p.body_en ?? p.body_ja : p.body_ja;
  const summary = lang === "en" ? p.summary_en ?? p.summary_ja : p.summary_ja;
  return (
    <article className="wrap max-w-[760px] pt-10">
      <nav className="flex gap-2 text-xs text-muted">
        <Link href={`/${lang}/news`} className="hover:text-ink hover:underline">NEWS</Link>
        {p.kind === "feature" && <><span>/</span><span>{t.feature}</span></>}
      </nav>
      <time className="num mt-4 block text-sm text-muted">{postDate(p.published_at, lang)}</time>
      <h1 className="mt-2 text-[clamp(26px,3.6vw,38px)] font-extrabold leading-snug tracking-[-0.02em]">{postTitle(p, lang)}</h1>
      {summary && <p className="mt-4 text-lg leading-[1.8] text-muted">{summary}</p>}
      {p.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.cover} alt="" className="mt-8 aspect-[16/9] w-full rounded-sm object-cover" />
      )}
      {body && <div className="mt-8 text-[16px]"><Body text={body} /></div>}
      <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-5 text-sm">
        {p.project && (
          <Link href={`/${lang}/projects/${p.project.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 hover:border-ink">
            {t.project}: {localName(lang, p.project.name_ja, p.project.name_en)} <Icon name="arrow" className="ico !h-4 !w-4" />
          </Link>
        )}
        {p.link_url && (
          <a href={p.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 hover:border-ink">
            {t.link} <Icon name="arrow" className="ico !h-4 !w-4" />
          </a>
        )}
      </div>
    </article>
  );
}
