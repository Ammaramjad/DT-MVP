import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { handle, HttpError, ok, parseBody } from "@/lib/api";
import { findAccessibleBooking } from "@/lib/booking-access";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ code: string }> }) => {
  const { code } = await params;
  const body = await parseBody(req, z.object({ phone: z.string().optional().default(""), rating: z.coerce.number().int().min(1).max(5), content: z.string().trim().min(2).max(1000) }));
  const b = await findAccessibleBooking(code, body.phone);
  if (!b) throw new HttpError("Booking not found", 404);
  if (b.status !== "completed") throw new HttpError("You can review a trip after it is completed", 409);
  if (b.rating) throw new HttpError("This trip has already been reviewed", 409);
  const db = await getDb();
  await db.update(s.bookings).set({ rating: body.rating }).where(eq(s.bookings.id, b.id));
  await db.insert(s.reviews).values({ name: b.contactName, rating: body.rating, content: body.content, trip: `${b.pickup} → ${b.dropoff || b.pickup}`, approved: false });
  return ok({ ok: true }, { status: 201 });
});
