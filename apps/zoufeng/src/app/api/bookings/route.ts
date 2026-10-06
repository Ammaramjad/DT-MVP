import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema as s } from "@/db";
import { getCustomer } from "@/lib/data";
import { handle, HttpError, ok, parseBody } from "@/lib/api";
import { applyPromo, buildTrip, findPromo } from "@/lib/quote";

const Body = z.object({
  category: z.string().min(1),
  sub: z.string().optional().default(""),
  vehicle: z.coerce.number().int().positive(),
  pickup: z.string().trim().min(1).max(200),
  dropoff: z.string().trim().max(200).optional().default(""),
  at: z.string().min(10),
  pax: z.coerce.number().int().min(1).max(60),
  bags: z.coerce.number().int().min(0).max(60),
  hours: z.coerce.number().int().min(0).max(24).optional().default(0),
  days: z.coerce.number().int().min(0).max(90).optional().default(0),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(120).or(z.literal("")).optional().default(""),
  flightNo: z.string().trim().max(20).optional().default(""),
  notes: z.string().trim().max(1000).optional().default(""),
  promoCode: z.string().trim().max(30).optional().default(""),
  paymentMethod: z.enum(["cash", "card", "linepay"]).default("cash"),
});

function makeCode() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32])
    .join("");
  return `ZF${ymd}${rnd}`;
}

export const POST = handle(async (req: Request) => {
  const b = await parseBody(req, Body);
  if (new Date(b.at.length === 16 ? `${b.at}:00+08:00` : b.at).getTime() < Date.now() - 5 * 60_000) throw new HttpError("Pickup time must be in the future", 422);
  const ctx = await buildTrip({ category: b.category, sub: b.sub, pickup: b.pickup, dropoff: b.dropoff, at: b.at, pax: String(b.pax), bags: String(b.bags), hours: String(b.hours), days: String(b.days) });
  if (!ctx) throw new HttpError("Unknown service category", 422);
  if (ctx.category.pricingMode === "distance" && !ctx.trip.dropoff) throw new HttpError("Destination is required", 422);
  const pick = ctx.vehicles.find((v) => v.vehicle.id === b.vehicle);
  if (!pick) throw new HttpError("Vehicle not available", 422);
  if (!pick.fits) throw new HttpError("Vehicle capacity exceeded", 422);

  const promo = b.promoCode ? await findPromo(b.promoCode) : null;
  if (b.promoCode && !promo) throw new HttpError("Invalid or expired promo code", 422);
  const subtotal = pick.quote.subtotal;
  const discount = applyPromo(subtotal, promo);
  if (promo && discount === 0) throw new HttpError(`Minimum spend for this code is ${promo.minAmount}`, 422);
  const customer = await getCustomer();
  const db = await getDb();

  let code = makeCode();
  for (let i = 0; i < 5; i++) {
    const exists = await db.query.bookings.findFirst({ where: eq(s.bookings.code, code), columns: { id: true } });
    if (!exists) break;
    code = makeCode();
  }

  await db.transaction(async (tx) => {
    if (promo) {
      const reserved = await tx
        .update(s.promotions)
        .set({ usedCount: sql`${s.promotions.usedCount} + 1` })
        .where(and(eq(s.promotions.id, promo.id), eq(s.promotions.active, true), sql`(${s.promotions.usageLimit} = 0 OR ${s.promotions.usedCount} < ${s.promotions.usageLimit})`))
        .returning({ id: s.promotions.id });
      if (!reserved.length) throw new HttpError("Invalid or expired promo code", 422);
    }
    await tx.insert(s.bookings).values({
    code,
    customerId: customer?.id ?? null,
    categoryId: ctx.category.id,
    subcategoryId: ctx.subcategory?.id ?? null,
    vehicleId: pick.vehicle.id,
    routeId: ctx.estimate.route?.id ?? null,
    pickup: ctx.trip.pickup,
    dropoff: ctx.trip.dropoff,
    pickupAt: new Date(ctx.trip.pickupAt).toISOString(),
    passengers: ctx.trip.passengers,
    luggage: ctx.trip.luggage,
    hours: ctx.trip.hours,
    days: ctx.trip.days,
    distanceKm: Math.round(ctx.estimate.distanceKm * 10) / 10,
    durationMin: ctx.estimate.durationMin,
    subtotal,
    discount,
    total: subtotal - discount,
    promoCode: promo?.code ?? "",
    contactName: b.name,
    contactPhone: b.phone,
    contactEmail: b.email || customer?.email || "",
    flightNo: b.flightNo,
    notes: b.notes,
    paymentMethod: b.paymentMethod,
    paymentStatus: "unpaid",
    status: "pending",
    });
  });
  return ok({ code, total: subtotal - discount }, { status: 201 });
});
