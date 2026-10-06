import Link from "next/link";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { getDb, schema as s } from "@/db";
import { AdminNav, type AdminLink } from "@/components/admin/AdminNav";
import { LogoutButton } from "@/components/site/LogoutButton";
import { LogoMark } from "@/components/ui/Logo";
import { getAdmin } from "@/lib/admin-auth";
import { RESOURCES, type ResourceKey } from "@/lib/admin-resources";

export const metadata = { title: { default: "Admin", template: "%s · FleetOS Admin" } };

const r = (k: ResourceKey, badge?: number): AdminLink => ({ href: `/admin/${k}`, label: RESOURCES[k].title, sub: RESOURCES[k].titleZh, icon: RESOURCES[k].icon, badge });

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getAdmin();
  if (!me) redirect("/admin/login");
  const db = await getDb();
  const [[p], [m], [rv]] = await Promise.all([
    db.select({ n: count() }).from(s.bookings).where(eq(s.bookings.status, "pending")),
    db.select({ n: count() }).from(s.messages).where(eq(s.messages.status, "new")),
    db.select({ n: count() }).from(s.reviews).where(eq(s.reviews.approved, false)),
  ]);
  const groups = [
    { title: "Overview", links: [{ href: "/admin", label: "Dashboard", sub: "儀表板", icon: "LayoutDashboard" }, { href: "/admin/bookings", label: "Bookings", sub: "訂單 / 行程", icon: "CalendarCheck", badge: p.n }] },
    { title: "Content", links: [r("navigation"), r("categories"), r("subcategories"), r("routes"), r("promotions"), r("faqs"), { href: "/admin/media", label: "Media", sub: "圖片庫", icon: "Images" }, { href: "/admin/settings", label: "Site settings", sub: "網站設定", icon: "Settings" }] },
    { title: "Fleet", links: [r("vehicle-types"), r("vehicles"), r("drivers")] },
    { title: "People", links: [r("customers"), r("reviews", rv.n), r("messages", m.n), r("admins")] },
  ];
  return (
    <div className="min-h-dvh lg:pl-[272px]">
      <aside className="neu fixed inset-y-3 left-3 z-30 hidden w-[256px] flex-col overflow-y-auto p-4 lg:flex">
        <Link href="/admin" className="mb-5 flex items-center gap-2.5 px-2">
          <LogoMark size={36} />
          <span>
            <span className="block text-[17px] font-black leading-none tracking-wide">FleetOS</span>
            <span className="text-[11px] text-muted">Admin · 管理後台</span>
          </span>
        </Link>
        <AdminNav groups={groups} />
      </aside>
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 lg:px-6">
        <details className="relative lg:hidden">
          <summary className="skeuo-icon-soft h-10 w-10 cursor-pointer list-none">☰</summary>
          <div className="neu absolute left-0 top-12 z-40 max-h-[80vh] w-[260px] overflow-y-auto p-3">
            <AdminNav groups={groups} />
          </div>
        </details>
        <div className="glass ml-auto flex items-center gap-3 rounded-2xl px-3 py-1.5">
          <Link href="/" target="_blank" className="flex items-center gap-1 text-[12.5px] font-semibold text-brand">
            View site <ExternalLink size={13} />
          </Link>
          <span className="hidden text-[12.5px] sm:inline">
            <b>{me.name}</b> <span className="text-muted">{me.email}</span>
          </span>
          <LogoutButton label="Logout" endpoint="/api/admin/logout" to="/admin/login" />
        </div>
      </header>
      <main className="min-w-0 px-4 pb-10 lg:px-6">{children}</main>
    </div>
  );
}
