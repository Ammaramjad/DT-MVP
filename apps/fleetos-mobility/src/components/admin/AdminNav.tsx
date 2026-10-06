"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Icon } from "@/lib/icons";

export interface AdminLink {
  href: string;
  label: string;
  sub: string;
  icon: string;
  badge?: number;
}

export function AdminNav({ groups }: { groups: { title: string; links: AdminLink[] }[] }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-4">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 px-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">{g.title}</div>
          <div className="flex flex-col gap-1">
            {g.links.map((l) => {
              const on = l.href === "/admin" ? path === "/admin" : path === l.href || path.startsWith(l.href + "/");
              return (
                <Link key={l.href} href={l.href} className={clsx("flex items-center gap-3 rounded-2xl px-3 py-2 text-[13px] transition", on ? "neu-inset font-bold text-brand" : "hover:bg-white/60")}>
                  <Icon name={l.icon} size={16} />
                  <span className="flex-1">
                    {l.label} <span className="text-[11px] font-normal text-muted">{l.sub}</span>
                  </span>
                  {l.badge ? <span className="rounded-full bg-hot px-1.5 text-[10.5px] font-bold text-white">{l.badge}</span> : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
