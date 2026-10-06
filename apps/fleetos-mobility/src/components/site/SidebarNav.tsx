"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Icon } from "@/lib/icons";

export interface NavLink {
  id: number;
  label: string;
  href: string;
  icon: string;
  newTab: boolean;
}

export function isActive(pathname: string, href: string) {
  const h = href.split("#")[0].split("?")[0];
  if (h === "/") return pathname === "/";
  return pathname === h || pathname.startsWith(h + "/");
}

export function SidebarNav({ items, onNavigate }: { items: NavLink[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((it) => {
        const active = isActive(pathname, it.href);
        return (
          <Link
            key={it.id}
            href={it.href}
            target={it.newTab ? "_blank" : undefined}
            onClick={onNavigate}
            className={clsx(
              "group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[14px] font-medium transition-all",
              active
                ? "bg-gradient-to-r from-[#d7f6fb] to-[#e9f0ff] text-[#0b3a7a] shadow-[inset_0_1px_0_#fff,0_6px_16px_rgba(25,195,230,0.25)] ring-1 ring-white"
                : "text-[#33405f] hover:bg-white/60 hover:shadow-[4px_4px_10px_rgba(163,177,205,0.35),-4px_-4px_10px_#fff]",
            )}
          >
            <Icon name={it.icon} size={18} className={active ? "text-[#0b3a7a]" : "text-[#4b5675] group-hover:text-[#2f6bff]"} />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
