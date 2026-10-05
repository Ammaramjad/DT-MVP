import { and, eq, gte, like, lte, or, type SQL } from "drizzle-orm";
import { schema as s } from "@/db";

export function bookingWhere(p: URLSearchParams) {
  const c: SQL[] = [];
  const q = p.get("q")?.trim();
  if (q) {
    const t = `%${q}%`;
    c.push(or(like(s.bookings.code, t), like(s.bookings.contactName, t), like(s.bookings.contactPhone, t), like(s.bookings.pickup, t), like(s.bookings.dropoff, t))!);
  }
  const status = p.get("status");
  if (status) c.push(eq(s.bookings.status, status));
  const cat = p.get("category");
  if (cat) c.push(eq(s.bookings.categoryId, Number(cat)));
  const from = p.get("from");
  if (from) c.push(gte(s.bookings.pickupAt, new Date(`${from}T00:00:00+08:00`).toISOString()));
  const to = p.get("to");
  if (to) c.push(lte(s.bookings.pickupAt, new Date(`${to}T23:59:59+08:00`).toISOString()));
  return c.length ? and(...c) : undefined;
}
