"use client";

import { useState } from "react";
import clsx from "clsx";
import { Icon, ICON_NAMES } from "@/lib/icons";

export function IconField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="input flex items-center gap-2 !py-2 text-left">
        <Icon name={value} size={16} /> <span className="text-[13px]">{value || "Choose icon"}</span>
      </button>
      {open && (
        <div className="neu absolute z-20 mt-2 grid max-h-60 w-full grid-cols-6 gap-1 overflow-y-auto p-2">
          {ICON_NAMES.map((n) => (
            <button
              type="button"
              key={n}
              title={n}
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
              className={clsx("grid h-9 place-items-center rounded-xl hover:bg-white", value === n && "neu-inset text-brand")}
            >
              <Icon name={n} size={16} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
