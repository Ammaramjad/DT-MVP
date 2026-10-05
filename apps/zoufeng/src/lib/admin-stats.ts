import { sql } from "drizzle-orm";
import { getDb } from "@/db";

const LOCAL_DAY = sql.raw("substr(datetime(b.pickup_at, '+8 hours'), 1, 10)");

export async function dashboardStats(days = 30) {
  const db = await getDb();
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const from = new Date(Date.now() + 8 * 3600000 - (days - 1) * 86400000).toISOString().slice(0, 10);
  const all = <T,>(q: ReturnType<typeof sql>) => db.all<T>(q);

  const [kpi] = await all<{ total: number; completed: number; cancelled: number; pending: number; revenue: number; todayRides: number; upcoming: number; avgRating: number | null }>(sql`
    SELECT count(*) total,
      sum(status = 'completed') completed,
      sum(status = 'cancelled') cancelled,
      sum(status = 'pending') pending,
      coalesce(sum(CASE WHEN status = 'completed' THEN total END), 0) revenue,
      sum(${LOCAL_DAY} = ${today} AND status != 'cancelled') todayRides,
      sum(b.pickup_at >= ${new Date().toISOString()} AND status IN ('pending','confirmed','assigned')) upcoming,
      avg(rating) avgRating
    FROM bookings b`);
  const [counts] = await all<{ customers: number; drivers: number; available: number; vehicles: number; unread: number; pendingReviews: number }>(sql`
    SELECT (SELECT count(*) FROM customers) customers,
      (SELECT count(*) FROM drivers WHERE active = 1) drivers,
      (SELECT count(*) FROM drivers WHERE active = 1 AND status = 'available') available,
      (SELECT count(*) FROM vehicles WHERE active = 1) vehicles,
      (SELECT count(*) FROM messages WHERE status = 'new') unread,
      (SELECT count(*) FROM reviews WHERE approved = 0) pendingReviews`);

  const dailyRows = await all<{ day: string; rides: number; completed: number; revenue: number }>(sql`
    SELECT ${LOCAL_DAY} day, count(*) rides, sum(status = 'completed') completed,
      coalesce(sum(CASE WHEN status = 'completed' THEN total END), 0) revenue
    FROM bookings b WHERE ${LOCAL_DAY} BETWEEN ${from} AND ${today} AND status != 'cancelled'
    GROUP BY day ORDER BY day`);
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.parse(from) + i * 86400000).toISOString().slice(0, 10);
    const r = dailyRows.find((x) => x.day === d);
    return { day: d.slice(5), rides: r?.rides ?? 0, completed: r?.completed ?? 0, revenue: r?.revenue ?? 0 };
  });

  const monthly = await all<{ month: string; revenue: number; rides: number }>(sql`
    SELECT substr(${LOCAL_DAY}, 1, 7) month, coalesce(sum(CASE WHEN status = 'completed' THEN total END), 0) revenue, sum(status != 'cancelled') rides
    FROM bookings b WHERE ${LOCAL_DAY} >= ${new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 7)} AND ${LOCAL_DAY} <= ${today}
    GROUP BY month ORDER BY month`);
  const byCategory = await all<{ name: string; color: string; rides: number; revenue: number }>(sql`
    SELECT coalesce(c.name_zh, '—') name, coalesce(c.color, '#94a3b8') color, count(*) rides,
      coalesce(sum(CASE WHEN b.status = 'completed' THEN b.total END), 0) revenue
    FROM bookings b LEFT JOIN categories c ON c.id = b.category_id WHERE b.status != 'cancelled'
    GROUP BY b.category_id ORDER BY rides DESC`);
  const byStatus = await all<{ status: string; n: number }>(sql`SELECT status, count(*) n FROM bookings GROUP BY status`);
  const topRoutes = await all<{ route: string; rides: number; revenue: number }>(sql`
    SELECT b.pickup || ' → ' || b.dropoff route, count(*) rides, coalesce(sum(CASE WHEN status = 'completed' THEN total END), 0) revenue
    FROM bookings b WHERE b.dropoff != '' AND b.status != 'cancelled'
    GROUP BY b.pickup, b.dropoff ORDER BY rides DESC LIMIT 6`);
  const byVehicle = await all<{ name: string; rides: number }>(sql`
    SELECT coalesce(v.name_zh, '—') name, count(*) rides FROM bookings b LEFT JOIN vehicles v ON v.id = b.vehicle_id
    WHERE b.status != 'cancelled' GROUP BY b.vehicle_id ORDER BY rides DESC`);
  const hourly = await all<{ hour: number; rides: number }>(sql`
    SELECT cast(substr(datetime(b.pickup_at, '+8 hours'), 12, 2) AS integer) hour, count(*) rides FROM bookings b WHERE status != 'cancelled' GROUP BY hour ORDER BY hour`);
  const recent = await all<{ id: number; code: string; contactName: string; pickup: string; dropoff: string; pickupAt: string; total: number; status: string; category: string | null }>(sql`
    SELECT b.id, b.code, b.contact_name contactName, b.pickup, b.dropoff, b.pickup_at pickupAt, b.total, b.status, c.name_zh category
    FROM bookings b LEFT JOIN categories c ON c.id = b.category_id ORDER BY b.created_at DESC, b.id DESC LIMIT 8`);

  const lastWeek = daily.slice(-7).reduce((a, d) => a + d.rides, 0);
  const prevWeek = daily.slice(-14, -7).reduce((a, d) => a + d.rides, 0);
  return {
    kpi: { ...kpi, ...counts, weekRides: lastWeek, weekGrowth: prevWeek ? ((lastWeek - prevWeek) / prevWeek) * 100 : 0 },
    daily,
    monthly,
    byCategory,
    byStatus,
    topRoutes,
    byVehicle,
    hourly: Array.from({ length: 24 }, (_, h) => ({ hour: `${h}`.padStart(2, "0"), rides: hourly.find((x) => x.hour === h)?.rides ?? 0 })),
    recent,
  };
}
export type DashboardStats = Awaited<ReturnType<typeof dashboardStats>>;
