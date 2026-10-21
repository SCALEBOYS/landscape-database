"use client";

import { useActionState, useState } from "react";

import { sendInquiry, type InquiryState } from "./actions";

export type ContactText = {
  topic: string;
  topics: Record<string, string>;
  name: string;
  email: string;
  organization: string;
  pageUrl: string;
  message: string;
  messageHint: Record<string, string>;
  send: string;
  sending: string;
  privacy: string;
  optional: string;
};

const field = "mt-1 w-full rounded-sm border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-ink";

export function ContactForm({ lang, t, initial }: { lang: string; t: ContactText; initial: { topic: string; detail: string; page: string } }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, null);
  const [topic, setTopic] = useState(Object.keys(t.topics).includes(initial.topic) ? initial.topic : "general");
  const [openedAt] = useState(() => String(Date.now()));

  if (state?.ok && state.message) return <p className="rounded-sm border border-accent/40 bg-accent/5 p-5 leading-relaxed">{state.message}</p>;

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="t" value={openedAt} />
      {/* ボット対策の見えない欄 */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{t.topic}</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(t.topics).map(([k, label]) => (
            <label key={k} className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm ${topic === k ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}>
              <input type="radio" name="topic" value={k} checked={topic === k} onChange={() => setTopic(k)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm">
          {t.name}
          <input name="name" required maxLength={100} autoComplete="name" className={field} />
        </label>
        <label className="text-sm">
          {t.email}
          <input name="email" type="email" required maxLength={200} autoComplete="email" className={field} />
        </label>
        <label className="text-sm">
          {t.organization} <span className="text-muted">{t.optional}</span>
          <input name="organization" maxLength={200} autoComplete="organization" className={field} />
        </label>
        <label className="text-sm">
          {t.pageUrl} <span className="text-muted">{t.optional}</span>
          <input name="page_url" type="url" maxLength={500} defaultValue={initial.page} placeholder="https://landscapedatabase.com/ja/projects/…" className={field} />
        </label>
      </div>
      <label className="text-sm">
        {t.message}
        <span className="mt-0.5 block text-xs text-muted">{t.messageHint[topic]}</span>
        <textarea name="message" required maxLength={5000} rows={8} defaultValue={initial.detail} className={field} />
      </label>
      {state && !state.ok && <p className="text-sm text-red-700" role="alert">{state.message}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="solid disabled:opacity-50">{pending ? t.sending : t.send}</button>
        <span className="text-xs text-muted">{t.privacy}</span>
      </div>
    </form>
  );
}
