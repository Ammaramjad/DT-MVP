import { desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { handle } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { bookingWhere } from "@/lib/admin-bookings";

const esc = (v: unknown) => {
  const str = v === null || v === undefined ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const db = await getDb();
  const u = new URL(req.url);
  const rows = await db
    .select({
      code: s.bookings.code,
      status: s.bookings.status,
      category: s.categories.nameEn,
      vehicle: s.vehicles.nameEn,
      driver: s.drivers.name,
      pickup: s.bookings.pickup,
      dropoff: s.bookings.dropoff,
      pickupAt: s.bookings.pickupAt,
      passengers: s.bookings.passengers,
      luggage: s.bookings.luggage,
      contactName: s.bookings.contactName,
      contactPhone: s.bookings.contactPhone,
      contactEmail: s.bookings.contactEmail,
      subtotal: s.bookings.subtotal,
      discount: s.bookings.discount,
      total: s.bookings.total,
      promoCode: s.bookings.promoCode,
      paymentMethod: s.bookings.paymentMethod,
      paymentStatus: s.bookings.paymentStatus,
      createdAt: s.bookings.createdAt,
    })
    .from(s.bookings)
    .leftJoin(s.categories, eq(s.categories.id, s.bookings.categoryId))
    .leftJoin(s.vehicles, eq(s.vehicles.id, s.bookings.vehicleId))
    .leftJoin(s.drivers, eq(s.drivers.id, s.bookings.driverId))
    .where(bookingWhere(u.searchParams))
    .orderBy(desc(s.bookings.pickupAt));
  const head = Object.keys(rows[0] ?? { code: "" });
  const csv = "\ufeff" + [head.join(","), ...rows.map((r) => head.map((h) => esc((r as Record<string, unknown>)[h])).join(","))].join("\n");
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="zoufeng-bookings-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
});
