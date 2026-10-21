"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setInquiryStatus } from "./actions";

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => start(async () => { await setInquiryStatus(id, e.target.value as "new" | "in_progress" | "done"); router.refresh(); })}
      className="rounded border border-line px-2 py-1 text-xs"
    >
      <option value="new">未対応</option>
      <option value="in_progress">対応中</option>
      <option value="done">対応済み</option>
    </select>
  );
}
