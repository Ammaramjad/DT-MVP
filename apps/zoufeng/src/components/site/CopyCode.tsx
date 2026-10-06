"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

export function CopyCode({ code, copy, copied }: { code: string; copy: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(code);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="skeuo-btn-light flex items-center gap-1.5 px-3 py-1.5 text-[12.5px]"
    >
      <Copy size={13} /> {done ? copied : copy}
    </button>
  );
}
