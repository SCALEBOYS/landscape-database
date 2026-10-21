import Link from "next/link";

import { Icon } from "@/components/Icon";
import { postDate, postTitle, type Post } from "@/lib/posts";

// NEWS・特集の一覧に並べるカード
export function PostCard({ post, lang, featureLabel }: { post: Post; lang: string; featureLabel: string }) {
  const summary = lang === "en" ? post.summary_en ?? post.summary_ja : post.summary_ja;
  return (
    <Link href={`/${lang}/news/${post.slug}`} className="group grid content-start gap-3">
      <div className="relative aspect-[16/9] overflow-hidden rounded-sm bg-ink">
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <div className="grid h-full place-items-center text-white/40">
            <Icon name="news" className="ico !h-10 !w-10" />
          </div>
        )}
        {post.kind === "feature" && <span className="absolute left-2 top-2 rounded-sm bg-white px-2 py-0.5 text-[11px] font-semibold tracking-[.08em] text-ink">{featureLabel}</span>}
      </div>
      <time className="num text-xs text-muted">{postDate(post.published_at, lang)}</time>
      <span className="text-[17px] font-semibold leading-snug group-hover:underline">{postTitle(post, lang)}</span>
      {summary && <span className="line-clamp-2 text-sm leading-relaxed text-muted">{summary}</span>}
    </Link>
  );
}
