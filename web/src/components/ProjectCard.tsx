import Link from "next/link";

export type CardData = {
  slug: string;
  name: string;
  place: string;
  year: number | null;
  useLabel: string;
  cover: string | null;
  note?: string;
};

export function ProjectCard({ lang, card }: { lang: string; card: CardData }) {
  return (
    <Link href={`/${lang}/projects/${card.slug}`} className="group block">
      <div className="aspect-[4/3] overflow-hidden rounded-md bg-placeholder">
        {card.cover ? (
          // 写真は Supabase Storage の公開 URL。サイズ最適化は本番前に next/image へ切り替える
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.cover} alt={card.name} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm tracking-widest text-accent/70">{card.useLabel}</div>
        )}
      </div>
      <div className="mt-3">
        <h3 className="font-medium leading-snug text-ink group-hover:text-accent">{card.name}</h3>
        <p className="mt-1 text-sm text-muted">
          {card.place}
          {card.year ? ` · ${card.year}` : ""} · {card.useLabel}
        </p>
        {card.note && <p className="mt-1 text-xs text-muted">{card.note}</p>}
      </div>
    </Link>
  );
}

export function CardGrid({ lang, cards }: { lang: string; cards: CardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((c) => (
        <ProjectCard key={c.slug} lang={lang} card={c} />
      ))}
    </div>
  );
}
