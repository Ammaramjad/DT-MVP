import { asc, count, desc } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { BookingsManager, type AdminBooking } from "@/components/admin/BookingsManager";
import { PageTitle } from "@/components/admin/PageTitle";
import { bookingWhere } from "@/lib/admin-bookings";

export const metadata = { title: "Bookings" };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => !!e[1]));
  const where = bookingWhere(params);
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 30;
  const db = await getDb();
  const [rows, [{ n }], cats, vehicles, drivers] = await Promise.all([
    db.select().from(s.bookings).where(where).orderBy(desc(s.bookings.pickupAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ n: count() }).from(s.bookings).where(where),
    db.select({ id: s.categories.id, name: s.categories.nameZh }).from(s.categories).orderBy(asc(s.categories.sortOrder)),
    db.select({ id: s.vehicles.id, name: s.vehicles.nameZh }).from(s.vehicles).orderBy(asc(s.vehicles.sortOrder)),
    db.select({ id: s.drivers.id, name: s.drivers.name, status: s.drivers.status }).from(s.drivers).orderBy(asc(s.drivers.name)),
  ]);
  return (
    <>
      <PageTitle title="Bookings · 訂單管理" sub="Confirm rides, assign drivers & vehicles, update payment and export." />
      <BookingsManager rows={rows as AdminBooking[]} total={n} page={page} pageSize={pageSize} categories={cats} vehicles={vehicles} drivers={drivers} />
    </>
  );
}
