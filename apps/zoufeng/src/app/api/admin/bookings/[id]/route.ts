import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { handle, HttpError, ok, parseBody } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { BOOKING_STATUSES } from "@/lib/i18n";

const Body = z
  .object({
    status: z.enum(BOOKING_STATUSES as [string, ...string[]]),
    paymentStatus: z.enum(["unpaid", "paid", "refunded"]),
    driverId: z.number().int().positive().nullable(),
    vehicleId: z.number().int().positive().nullable(),
    total: z.number().int().min(0),
    notes: z.string().max(2000),
    pickupAt: z.string().min(10),
  })
  .partial();

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await params;
  const body = await parseBody(req, Body);
  if (!Object.keys(body).length) throw new HttpError("Nothing to update", 422);
  const db = await getDb();
  const patch: Record<string, unknown> = { ...body };
  if (body.driverId && body.status === undefined) {
    const cur = await db.query.bookings.findFirst({ where: eq(s.bookings.id, Number(id)), columns: { status: true } });
    if (cur && ["pending", "confirmed"].includes(cur.status)) patch.status = "assigned";
  }
  if (body.pickupAt) patch.pickupAt = new Date(body.pickupAt.length === 16 ? `${body.pickupAt}:00+08:00` : body.pickupAt).toISOString();
  const [row] = await db.update(s.bookings).set(patch).where(eq(s.bookings.id, Number(id))).returning();
  if (!row) throw new HttpError("Not found", 404);
  return ok(row);
});

export const DELETE = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const res = await db.delete(s.bookings).where(eq(s.bookings.id, Number(id))).returning({ id: s.bookings.id });
  if (!res.length) throw new HttpError("Not found", 404);
  return ok({ ok: true });
});
