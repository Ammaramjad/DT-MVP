"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpenText,
  FileSearch2,
  FlaskConical,
  Home,
  MessageSquareText,
  Settings
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/library", label: "PDF Library", icon: BookOpenText },
  { href: "/gap-finder", label: "Gap Finder", icon: FileSearch2 },
  { href: "/experiments", label: "Experiment Planner", icon: FlaskConical },
  { href: "/chat", label: "AI Chat", icon: MessageSquareText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 p-4 lg:grid-cols-[260px_1fr] lg:p-6">
        <aside className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-6 px-2">
            <p className="text-xs uppercase text-muted-foreground">Research Copilot</p>
            <h1 className="text-xl font-semibold">Workspace</h1>
          </div>
          <nav className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "text-primary" : "text-foreground/80 hover:bg-muted"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="active-nav"
                      className="absolute inset-0 rounded-lg bg-primary/10"
                      transition={{ type: "spring", stiffness: 380, damping: 35 }}
                    />
                  )}
                  <Icon className="z-10 h-4 w-4" />
                  <span className="z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
