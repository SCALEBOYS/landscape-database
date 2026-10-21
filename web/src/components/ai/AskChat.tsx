"use client";

import { useRef, useState } from "react";

import { Icon } from "@/components/Icon";

import { AnswerText } from "./AnswerText";

type Msg = { role: "user" | "assistant"; content: string };
type Text = { placeholder: string; send: string; thinking: string; examples: string[]; note: string; reset: string };

// 質問窓口の会話。答えは届いた分から順に表示する
export function AskChat({ lang, t }: { lang: string; t: Text }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const q = text.trim().slice(0, 2000);
    if (!q || busy) return;
    // 長い会話は直近だけを送る
    const history: Msg[] = [...messages, { role: "user" as const, content: q }].slice(-10);
    setMessages([...messages, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const write = (content: string) => setMessages((m) => [...m.slice(0, -1), { role: "assistant", content }]);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, messages: history }) });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        write(body?.error ?? "Error");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        write(acc);
        end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
      }
    } catch {
      write("Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6">
      {messages.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {t.examples.map((ex) => (
            <button key={ex} type="button" onClick={() => send(ex)} className="rounded-full border border-line bg-white px-3.5 py-2 text-left text-[13px] hover:border-ink">
              {ex}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-5">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <p key={i} className="justify-self-end whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-[15px] text-white">{m.content}</p>
            ) : (
              <div key={i} className="max-w-[72ch] text-[15px]">
                {m.content ? <AnswerText text={m.content} /> : <p className="animate-pulse text-muted">{t.thinking}</p>}
              </div>
            ),
          )}
          <div ref={end} />
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="sticky bottom-4 z-10 flex items-end gap-2 rounded-sm border-2 border-ink bg-white p-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] outline-none"
        />
        <button type="submit" disabled={busy || !input.trim()} className="grid h-11 w-11 place-items-center rounded-sm bg-ink text-white disabled:opacity-40" aria-label={t.send}>
          <Icon name="arrow" />
        </button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{t.note}</span>
        {messages.length > 0 && !busy && (
          <button type="button" onClick={() => setMessages([])} className="underline hover:text-ink">{t.reset}</button>
        )}
      </div>
    </div>
  );
}
