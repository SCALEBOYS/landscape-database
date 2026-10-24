"use client";

import { useEffect, useState } from "react";

export type EditorTab = { key: string; label: string; note?: string; warn?: boolean };

// 事例の編集画面のタブ。中身はすべて読み込んだまま、選んだタブの欄だけを見せる（入力中の内容はタブを移っても消えない）
// 欄の側には data-tab="basic" のように、どのタブに出すかを書く（空白区切りで複数可）
export function EditorTabs({ tabs, children }: { tabs: EditorTab[]; children: React.ReactNode }) {
  const [active, setActive] = useState(tabs[0].key);

  // URL の #photos などで開くタブを選べるようにする
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (tabs.some((t) => t.key === h)) setActive(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);

  const pick = (key: string) => {
    setActive(key);
    window.history.replaceState(null, "", `#${key}`);
  };

  return (
    <div className="editor-tabs" data-active={active}>
      <div className="sticky top-16 z-20 -mx-4 mb-5 overflow-x-auto border-b border-line bg-[#f7f7f5]/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0">
        <div role="tablist" aria-label="編集する項目" className="flex min-w-max gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active === t.key}
              onClick={() => pick(t.key)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm ${active === t.key ? "border-ink font-medium text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {t.label}
              {t.note && <span className={`rounded-full px-1.5 text-[10px] ${t.warn ? "bg-amber-100 text-amber-800" : "bg-accent/10 text-accent"}`}>{t.note}</span>}
            </button>
          ))}
        </div>
      </div>
      <style>{tabs.map((t) => `.editor-tabs[data-active="${t.key}"] [data-tab]:not([data-tab~="${t.key}"]){display:none}`).join("\n")}</style>
      {children}
    </div>
  );
}
