"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setReviewed } from "./actions";

export function ReviewToggle({ table, id, reviewed }: { table: "papers" | "methods"; id: string; reviewed: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="flex items-center gap-2">
      <span className={`rounded px-1.5 py-0.5 text-xs ${reviewed ? "bg-accent text-white" : "bg-amber-100 text-amber-900"}`}>{reviewed ? "確認済み" : "下書き"}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setReviewed(table, id, !reviewed);
            if (!r.ok) setError(r.message);
            else router.refresh();
          })
        }
        className="text-xs text-accent hover:underline disabled:opacity-50"
      >
        {reviewed ? "下書きに戻す" : "確認済みにする"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
