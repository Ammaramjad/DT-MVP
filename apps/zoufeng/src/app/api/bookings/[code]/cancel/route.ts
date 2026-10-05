import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { handle, HttpError, ok, parseBody } from "@/lib/api";
import { findAccessibleBooking } from "@/lib/booking-access";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ code: string }> }) => {
  const { code } = await params;
  const { phone } = await parseBody(req, z.object({ phone: z.string().optional().default("") }));
  const b = await findAccessibleBooking(code, phone);
  if (!b) throw new HttpError("Booking not found", 404);
  if (!["pending", "confirmed"].includes(b.status)) throw new HttpError("This booking can no longer be cancelled", 409);
  const db = await getDb();
  await db.update(s.bookings).set({ status: "cancelled" }).where(eq(s.bookings.id, b.id));
  return ok({ ok: true });
});
