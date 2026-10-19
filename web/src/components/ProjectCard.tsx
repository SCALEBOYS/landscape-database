import Link from "next/link";

import { satelliteImage } from "@/lib/mapbox";

import { Icon } from "./Icon";

export type CardData = {
  slug: string;
  name: string;
  place: string;
  year: number | null;
  use: string;
  useLabel: string;
  cover: string | null;
  lat?: number | null;
  lng?: number | null;
  designers?: string;
  note?: string;
};

// 自分の写真がない事例は、航空写真の静止画で代用する
export const cardImage = (c: Pick<CardData, "cover" | "lat" | "lng">) =>
  c.cover ?? (c.lat != null && c.lng != null ? satelliteImage(c.lat, c.lng) : null);

export function ProjectCard({
  lang,
  card,
  index = 0,
  highlighted,
  onHover,
}: {
  lang: string;
  card: CardData;
  index?: number;
  highlighted?: boolean;
  onHover?: (slug: string | null) => void;
}) {
  const img = cardImage(card);
  return (
    <Link
      href={`/${lang}/projects/${card.slug}`}
      className={`card rise group grid gap-3 ${highlighted ? "hl" : ""}`}
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
      onMouseEnter={onHover && (() => onHover(card.slug))}
      onMouseLeave={onHover && (() => onHover(null))}
    >
      <div className="card-img">
        {img ? (
          // 写真は Supabase Storage、代用の航空写真は Mapbox。サイズ最適化は本番前に next/image へ切り替える
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={card.cover ? card.name : ""} loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <Icon name={card.use} className="ico !h-10 !w-10" />
          </div>
        )}
        <span className="card-tag">
          <Icon name={card.use} />
          {card.useLabel}
        </span>
      </div>
      <div className="grid gap-1">
        <h3 className="text-[19px] font-semibold leading-snug tracking-[-0.01em]">{card.name}</h3>
        <p className="flex flex-wrap gap-x-2 text-[13px] text-muted">
          <span>{card.place}</span>
          {card.year ? <span className="num text-ink">{card.year}</span> : null}
        </p>
        {card.designers !== undefined && <p className="truncate text-xs text-muted">{card.designers}</p>}
        {card.note && <p className="text-xs text-muted">{card.note}</p>}
      </div>
    </Link>
  );
}

export function CardGrid({ lang, cards }: { lang: string; cards: CardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((c, i) => (
        <ProjectCard key={c.slug} lang={lang} card={c} index={i} />
      ))}
    </div>
  );
}
