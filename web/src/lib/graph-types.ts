// つながりページの丸と線の型（サーバーとブラウザの両方で使う）
export const NODE_TYPES = ["project", "designer", "species", "law", "paper", "method", "use", "element", "award", "tag", "pref", "decade"] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export type GraphNode = {
  id: string;
  type: NodeType;
  label: string;
  sub?: string;
  href?: string;
  img?: string | null;
  summary?: string | null;
  degree: number;
};

// has: 事例と分類をつなぐ線。similar: 共通項目の多い事例どうしの線（weight は 0〜1）
export type GraphLink = { source: string; target: string; kind: "has" | "similar"; weight: number };

export type GraphData = { nodes: GraphNode[]; links: GraphLink[] };
