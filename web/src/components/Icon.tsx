// ランドスケープ用の線画アイコン（24x24、線のみ）。用途・要素のカテゴリと地図のピンで使う
const PATHS: Record<string, React.ReactNode> = {
  park: <><circle cx="12" cy="9" r="5.5" /><path d="M12 14.5V21M8.5 21h7M12 17.5l2.5-2.5" /></>,
  plaza: <path d="M3 18l4-9h10l4 9zM5 13.5h14M12 9v9" />,
  greenway: <><path d="M10 21c0-4 5-5 5-9s-3-5-3-9" /><circle cx="5.5" cy="9" r="2.5" /><path d="M5.5 11.5V15" /><circle cx="19" cy="14" r="2.5" /><path d="M19 16.5V20" /></>,
  street: <path d="M7 3L4 21M17 3l3 18M12 4v3M12 10v3M12 16v4" />,
  waterfront: <path d="M3 7h18M3 13c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2M3 18c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2" />,
  commercial: <path d="M4 9h16l-1.5-5h-13zM5 9v12h14V9M10 21v-6h4v6" />,
  office: <><path d="M7 21V3h8v18M10 7h2M10 11h2M10 15h2" /><circle cx="18.5" cy="14" r="2.5" /><path d="M18.5 16.5V21M3 21h18" /></>,
  housing: <path d="M4 21V6l8-3 8 3v15zM8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2" />,
  public_facility: <path d="M3 9l9-5 9 5zM5.5 9v9M9.5 9v9M14.5 9v9M18.5 9v9M3 21h18M4 18h16" />,
  education: <path d="M2 9l10-5 10 5-10 5zM6 11v5c2 2 10 2 12 0v-5M22 9v6" />,
  healthcare: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></>,
  rooftop: <path d="M5 21V11h14v10M9 15h2M13 15h2M9 18h2M13 18h2M4 11c1-2 2-2 3 0 1-2.5 2.5-2.5 3.5 0 1-2 2-2 3 0 1-2.5 2.5-2.5 3.5 0 1-2 2-2 3 0" />,
  wall_greening: <><path d="M5 3v18h15M5 6c3 0 4 2 4 4M5 11c3 0 5 1 5 4M5 16c2 0 4 1 4 3" /><circle cx="9" cy="10.5" r="1" /><circle cx="10" cy="15.5" r="1" /></>,
  redevelopment: <><rect x="3" y="3" width="8" height="8" /><rect x="13" y="3" width="8" height="5" /><rect x="13" y="10" width="8" height="11" /><rect x="3" y="13" width="8" height="8" /></>,
  other: <><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></>,
  water: <path d="M12 16V7M12 7c-2-3-6-3-7 1M12 7c2-3 6-3 7 1M12 10c-1.5-1.5-3.5-1.5-4 .5M12 10c1.5-1.5 3.5-1.5 4 .5M4 16h16l-1.5 4h-13z" />,
  lawn: <path d="M3 20h18M6 20c0-3-1-5-2.5-6M6 20c0-3 1-6 3-8M12 20c0-4-1-7-3-9M12 20c0-4 1-7 3-9M18 20c0-3 1-5 2.5-6M18 20c0-3-1-5-3-7" />,
  shade: <><circle cx="12" cy="8" r="5" /><path d="M12 13v6" /><ellipse cx="12" cy="20" rx="8" ry="1.5" /></>,
  stone: <path d="M3 4h7l-1 6H3zM12 4h9v5h-8zM3 12h5l1 8H3zM11 12h10v3l-2 5h-8z" />,
  deck: <path d="M3 6h18M3 10h18M3 14h18M3 18h18M8 6v4M15 10v4M6 14v4M17 6v4M12 14v4" />,
  play: <path d="M5 21V5M9 21V5M5 9h4M5 13h4M9 8c6 0 6 13 12 13" />,
  bench: <path d="M4 8h16M3 12h18M5 12v8M19 12v8M6 8v4M18 8v4" />,
  light: <path d="M12 21V8M8 21h8M8 8h8l-1.5-4h-5zM10 11l-1 2M14 11l1 2" />,
  mist: <><path d="M12 21v-7M8.5 14h7" /><circle cx="12" cy="10" r=".9" /><circle cx="8.5" cy="8.5" r=".9" /><circle cx="15.5" cy="8.5" r=".9" /><circle cx="12" cy="5.5" r=".9" /><circle cx="6" cy="5" r=".9" /><circle cx="18" cy="5" r=".9" /><circle cx="9" cy="3" r=".9" /><circle cx="15" cy="3" r=".9" /></>,
  rain: <path d="M8 2.5v3M12 2v3M16 2.5v3M3 15c3 0 3 2 9 2s6-2 9-2M12 17v-6M12 11c-2 0-3-1.5-3-3 2 0 3 1.5 3 3zM12 13.5c2 0 3-1.5 3-3-2 0-3 1.5-3 3zM5 21h14" />,
  "law-law": <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10M9 8h5" />,
  "law-system": <path d="M6 3h9l4 4v14H6zM15 3v4h4M9 13l2 2 4-4" />,
  "law-ordinance": <path d="M4 21h16M6 21V10h12v11M3 10l9-6 9 6M10 21v-5h4v5" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
};

export function Icon({ name, className = "ico" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {PATHS[name] ?? PATHS.other}
    </svg>
  );
}
