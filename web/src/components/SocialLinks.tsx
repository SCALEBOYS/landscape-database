import { socialLinks } from "@/lib/site";

// 各サービスの形を単純にした塗りのアイコン（24x24）
const GLYPHS: Record<string, React.ReactNode> = {
  instagram: (
    <path fillRule="evenodd" d="M7.5 2.5h9a5 5 0 0 1 5 5v9a5 5 0 0 1-5 5h-9a5 5 0 0 1-5-5v-9a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3zM12 7.3a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4zm0 2a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4zM17.3 5.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z" />
  ),
  x: <path d="M3 3h5.2l4.2 5.8L17.4 3h2.9l-6.6 7.6L21 21h-5.2l-4.6-6.3L5.7 21H2.8l7.1-8.2z" />,
  youtube: <path fillRule="evenodd" d="M2.6 7.2c.2-1.5 1.3-2.5 2.8-2.6C7.5 4.4 9.7 4.3 12 4.3s4.5.1 6.6.3c1.5.1 2.6 1.1 2.8 2.6.2 1.6.3 3.2.3 4.8s-.1 3.2-.3 4.8c-.2 1.5-1.3 2.5-2.8 2.6-2.1.2-4.3.3-6.6.3s-4.5-.1-6.6-.3c-1.5-.1-2.6-1.1-2.8-2.6C2.4 15.2 2.3 13.6 2.3 12s.1-3.2.3-4.8zM10 8.8v6.4l5.5-3.2z" />,
  note: <path d="M4 20V5.5c0-.6.4-1 1-1h9.5A5.5 5.5 0 0 1 20 10v10h-3.6v-9.6a2.3 2.3 0 0 0-2.3-2.3H7.6V20z" />,
  pinterest: <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.8 0-2.5-1.8-4.3-4.4-4.3-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4l.1.4-.3 1.2c0 .2-.2.3-.4.2-1.3-.6-2.2-2.6-2.2-4.2 0-3.4 2.5-6.6 7.2-6.6 3.8 0 6.7 2.7 6.7 6.3 0 3.8-2.4 6.8-5.7 6.8-1.1 0-2.2-.6-2.5-1.3l-.7 2.6c-.2 1-.9 2.2-1.4 2.9A10 10 0 1 0 12 2z" />,
};

// フッターのアカウントへのリンク。URL が入っているものだけ並べる
export function SocialLinks({ label }: { label: string }) {
  const links = socialLinks();
  if (!links.length) return null;
  return (
    <ul className="flex flex-wrap items-center gap-1" aria-label={label}>
      {links.map((s) => (
        <li key={s.key}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">{GLYPHS[s.key]}</svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
