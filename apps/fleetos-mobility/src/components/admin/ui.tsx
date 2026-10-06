"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import clsx from "clsx";

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0b1736]/40 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className={clsx("glass-strong my-6 w-full rounded-[28px] p-6", wide ? "max-w-4xl" : "max-w-2xl")}>
        <div className="mb-4 flex items-center">
          <h2 className="text-[19px] font-black">{title}</h2>
          <button onClick={onClose} className="skeuo-icon-soft ml-auto h-9 w-9" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: color }}>
      {children}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} data-on={checked} className="skeuo-switch" />
  );
}
