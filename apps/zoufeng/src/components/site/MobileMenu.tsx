"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { SidebarNav, type NavLink } from "./SidebarNav";

export function MobileMenu({ items, footer, header }: { items: NavLink[]; footer: NavLink[]; header: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Menu" className="glass grid h-10 w-10 place-items-center rounded-full">
        <Menu size={18} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-[#0d1a3a]/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="glass-strong absolute right-0 top-0 flex h-full w-[290px] flex-col gap-5 overflow-y-auto rounded-l-3xl p-5 fade-up">
            <div className="flex items-center justify-between">
              {header}
              <button onClick={() => setOpen(false)} aria-label="Close" className="neu-sm grid h-9 w-9 place-items-center">
                <X size={16} />
              </button>
            </div>
            <SidebarNav items={items} onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t border-white/70 pt-4">
              <SidebarNav items={footer} onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
