import Link from "next/link";
import { CalendarCheck, CarFront, Clock, DollarSign, MessageSquare, Star, TrendingDown, TrendingUp, Users, XCircle } from "lucide-react";
import { DashboardCharts } from "@/components/admin/Charts";
import { PageTitle } from "@/components/admin/PageTitle";
import { Badge } from "@/components/admin/ui";
import { dashboardStats } from "@/lib/admin-stats";
import { formatDateTime, money } from "@/lib/format";
import { statusLabels } from "@/lib/i18n";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const d = await dashboardStats();
  const k = d.kpi;
  const cards = [
    { label: "Total rides", sub: "總行程", value: k.total.toLocaleString(), icon: CalendarCheck, c: "#2f6bff", extra: `${k.completed} completed` },
    { label: "Revenue", sub: "營收", value: money(k.revenue), icon: DollarSign, c: "#10b981", extra: "completed rides" },
    { label: "Rides (7 days)", sub: "近 7 日", value: k.weekRides, icon: k.weekGrowth >= 0 ? TrendingUp : TrendingDown, c: "#7b4dff", extra: `${k.weekGrowth >= 0 ? "+" : ""}${k.weekGrowth.toFixed(0)}% vs prev week` },
    { label: "Today", sub: "今日行程", value: k.todayRides, icon: Clock, c: "#f59e0b", extra: `${k.upcoming} upcoming` },
    { label: "Pending", sub: "待確認", value: k.pending, icon: CalendarCheck, c: "#ef4444", extra: "need confirmation", href: "/admin/bookings?status=pending" },
    { label: "Cancelled", sub: "已取消", value: k.cancelled, icon: XCircle, c: "#64748b", extra: k.total ? `${((k.cancelled / k.total) * 100).toFixed(1)}% rate` : "" },
    { label: "Customers", sub: "會員", value: k.customers, icon: Users, c: "#1fd1e8", extra: `avg rating ${(k.avgRating ?? 0).toFixed(2)}`, href: "/admin/customers" },
    { label: "Drivers", sub: "司機", value: `${k.available}/${k.drivers}`, icon: CarFront, c: "#0ea5e9", extra: `available · ${k.vehicles} vehicles`, href: "/admin/drivers" },
  ];
  return (
    <>
      <PageTitle title="Dashboard · 儀表板" sub="Live overview of rides, revenue and operations">
        {k.unread > 0 && (
          <Link href="/admin/messages" className="skeuo-btn-light flex items-center gap-1.5 px-3 py-2 text-[12.5px]">
            <MessageSquare size={14} /> {k.unread} new messages
          </Link>
        )}
        {k.pendingReviews > 0 && (
          <Link href="/admin/reviews" className="skeuo-btn-light flex items-center gap-1.5 px-3 py-2 text-[12.5px]">
            <Star size={14} /> {k.pendingReviews} reviews to moderate
          </Link>
        )}
        <Link href="/admin/bookings" className="skeuo-btn px-4 py-2 text-[13px]">Manage bookings</Link>
      </PageTitle>
      <div className="mb-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const body = (
            <>
              <span className="skeuo-icon h-11 w-11 shrink-0" style={{ ["--c" as string]: c.c }}>
                <c.icon size={19} />
              </span>
              <div className="min-w-0">
                <div className="text-[11.5px] text-muted">
                  {c.label} · {c.sub}
                </div>
                <div className="truncate text-[19px] font-black leading-tight sm:text-[22px]">{c.value}</div>
                <div className="truncate text-[11px] text-muted">{c.extra}</div>
              </div>
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="neu neu-press flex items-center gap-3 p-4">
              {body}
            </Link>
          ) : (
            <div key={c.label} className="neu flex items-center gap-3 p-4">
              {body}
            </div>
          );
        })}
      </div>
      <DashboardCharts data={d} />
      <div className="mt-5 grid gap-5 xl:grid-cols-3 [&>*]:min-w-0">
        <section className="neu p-5 xl:col-span-2">
          <div className="mb-3 flex items-center">
            <h3 className="text-[15px] font-black">Recent bookings · 最新訂單</h3>
            <Link href="/admin/bookings" className="ml-auto text-[12.5px] font-semibold text-brand">View all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[12.5px]">
              <tbody>
                {d.recent.map((b) => (
                  <tr key={b.id} className="border-t border-white/70">
                    <td className="py-2 font-mono font-bold">
                      <Link href={`/admin/bookings?q=${b.code}`} className="text-brand">{b.code}</Link>
                    </td>
                    <td>{b.contactName}</td>
                    <td className="max-w-[220px] truncate text-muted">{b.pickup}{b.dropoff && ` → ${b.dropoff}`}</td>
                    <td className="whitespace-nowrap">{formatDateTime(b.pickupAt, "en")}</td>
                    <td className="font-bold">{money(b.total)}</td>
                    <td><Badge color={statusLabels[b.status]?.color ?? "#999"}>{statusLabels[b.status]?.en ?? b.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="neu p-5">
          <h3 className="mb-3 text-[15px] font-black">Top routes · 熱門路線</h3>
          <ol className="flex flex-col gap-2.5">
            {d.topRoutes.map((r, i) => {
              const max = d.topRoutes[0]?.rides || 1;
              return (
                <li key={r.route} className="text-[12.5px]">
                  <div className="flex justify-between gap-2">
                    <span className="truncate font-semibold">{i + 1}. {r.route}</span>
                    <span className="shrink-0 font-bold">{r.rides}</span>
                  </div>
                  <div className="neu-inset mt-1 h-2 overflow-hidden !rounded-full">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan to-brand" style={{ width: `${(r.rides / max) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </>
  );
}
