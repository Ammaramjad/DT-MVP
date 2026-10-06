"use client";

import { Globe, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Lang } from "@/lib/i18n";

export function LangSwitch({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const set = (l: Lang) => {
    document.cookie = `fo_lang=${l}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    start(() => router.refresh());
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="glass flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium" aria-haspopup="listbox" aria-expanded={open}>
        <Globe size={16} />
        <span className={pending ? "opacity-50" : ""}>{lang === "zh" ? "繁體中文" : "English"}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="glass-strong absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-2xl p-1" role="listbox">
          {(["zh", "en"] as Lang[]).map((l) => (
            <button key={l} onClick={() => set(l)} className={`block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/80 ${l === lang ? "font-bold text-brand" : ""}`}>
              {l === "zh" ? "繁體中文" : "English"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
