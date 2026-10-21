import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/news/PostCard";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { getPosts } from "@/lib/posts";
import { alternates } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/news">): Promise<Metadata> {
  const { lang } = await params;
  return hasLocale(lang) ? { title: "NEWS", alternates: alternates(lang, "/news") } : {};
}

export default async function NewsPage({ params }: PageProps<"/[lang]/news">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang).news;
  const posts = await getPosts();
  return (
    <div className="wrap pt-10">
      <span className="eyebrow">HOME</span>
      <h1 className="mt-1 text-[clamp(30px,4vw,44px)] font-extrabold tracking-[-0.02em]">NEWS</h1>
      <p className="mt-3 max-w-[60ch] text-sm leading-[1.8] text-muted">{t.lead}</p>
      {posts.length ? (
        <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.slug}><PostCard post={p} lang={lang} featureLabel={t.feature} /></li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-muted">{t.none}</p>
      )}
    </div>
  );
}
