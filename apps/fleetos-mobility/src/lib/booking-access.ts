import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getCustomer } from "./data";

const digits = (v: string) => v.replace(/\D/g, "");

export async function findAccessibleBooking(code: string, phone?: string | null) {
  const db = await getDb();
  const b = await db.query.bookings.findFirst({ where: eq(s.bookings.code, code.toUpperCase()) });
  if (!b) return null;
  const customer = await getCustomer();
  if (customer && b.customerId === customer.id) return b;
  if (phone && digits(phone).length >= 6 && digits(phone) === digits(b.contactPhone)) return b;
  return null;
}
