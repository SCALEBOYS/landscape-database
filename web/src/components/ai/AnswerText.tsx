import Link from "next/link";
import { Fragment } from "react";

// AI の答え（簡単な Markdown）を表示する。使うのは段落・箇条書き・太字・リンクだけ。HTML はそのまま出さない
export function AnswerText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="grid gap-3 leading-[1.85]">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-*・]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i} className="grid list-disc gap-1 pl-5">
              {lines.map((l, k) => <li key={k}>{inline(l.replace(/^\s*([-*・]|\d+\.)\s+/, ""))}</li>)}
            </ul>
          );
        }
        return <p key={i}>{lines.map((l, k) => <Fragment key={k}>{k > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </div>
  );
}

// [文字](URL) と **太字** だけを形にする。サイト内（/ で始まる）と https のリンクだけを通す
function inline(s: string) {
  const out: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[3]) out.push(<b key={m.index} className="font-semibold">{m[3]}</b>);
    else if (m[2].startsWith("/") && !m[2].startsWith("//")) out.push(<Link key={m.index} href={m[2]} className="font-medium text-accent underline underline-offset-2">{m[1]}</Link>);
    else if (m[2].startsWith("https://")) out.push(<a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">{m[1]}</a>);
    else out.push(m[1]);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
