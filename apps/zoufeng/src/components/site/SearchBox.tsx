"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBox({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="glass flex h-11 w-full max-w-[290px] items-center gap-2 rounded-full px-4"
      role="search"
    >
      <Search size={16} className="text-muted" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="field-input text-[13px]" aria-label="Search" />
    </form>
  );
}
