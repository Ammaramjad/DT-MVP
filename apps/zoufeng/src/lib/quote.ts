import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import type { Category, Subcategory, Vehicle } from "@/db/schema";
import { getSettings } from "./data";
import { applyPromo, estimateTrip, quoteVehicle, type Quote, type TripEstimate, type TripInput } from "./pricing";

export interface SearchParams {
  category?: string;
  sub?: string;
  pickup?: string;
  dropoff?: string;
  at?: string;
  pax?: string;
  bags?: string;
  hours?: string;
  days?: string;
  vehicle?: string;
}

export interface TripContext {
  category: Category;
  subcategories: Subcategory[];
  subcategory: Subcategory | null;
  trip: TripInput;
  estimate: TripEstimate;
  vehicles: { vehicle: Vehicle; quote: Quote; fits: boolean }[];
}

const int = (v: string | undefined, d: number, min: number, max: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

export function normalizeAt(at: string | undefined): string {
  if (at && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at)) return `${at}:00+08:00`;
  if (at && !Number.isNaN(new Date(at).getTime())) return at;
  const d = new Date(Date.now() + 86400000);
  return d.toISOString();
}

export async function buildTrip(p: SearchParams): Promise<TripContext | null> {
  const db = await getDb();
  const cats = await db.select().from(s.categories).where(eq(s.categories.active, true));
  const category = cats.find((c) => c.slug === p.category) ?? cats.sort((a, b) => a.sortOrder - b.sortOrder)[0];
  if (!category) return null;
  const subs = (await db.select().from(s.subcategories).where(eq(s.subcategories.categoryId, category.id)))
    .filter((x) => x.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const subcategory = subs.find((x) => x.slug === p.sub || String(x.id) === p.sub) ?? null;
  const settings = await getSettings();
  const routes = (await db.select().from(s.routes)).filter((r) => r.active);
  const trip: TripInput = {
    pickup: (p.pickup ?? "").slice(0, 200),
    dropoff: (p.dropoff ?? "").slice(0, 200),
    pickupAt: normalizeAt(p.at),
    passengers: int(p.pax, 1, 1, 60),
    luggage: int(p.bags, 0, 0, 60),
    hours: category.pricingMode === "hourly" ? int(p.hours, settings.pricing.minHours, settings.pricing.minHours, 24) : 0,
    days: category.pricingMode === "daily" ? int(p.days, 1, 1, 90) : 0,
  };
  const estimate = category.pricingMode === "distance" ? estimateTrip(routes, trip.pickup, trip.dropoff) : { distanceKm: 0, durationMin: trip.hours * 60, route: null };
  const all = (await db.select().from(s.vehicles)).filter((v) => v.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const vehicles = all.map((vehicle) => ({
    vehicle,
    quote: quoteVehicle({ vehicle, vehicles: all, category, subcategory, trip, estimate, pricing: settings.pricing }),
    fits: vehicle.maxPassengers >= trip.passengers && vehicle.luggage >= trip.luggage,
  }));
  return { category, subcategories: subs, subcategory, trip, estimate, vehicles };
}

export async function findPromo(code: string) {
  if (!code) return null;
  const db = await getDb();
  const p = await db.query.promotions.findFirst({ where: eq(s.promotions.code, code.trim().toUpperCase()) });
  if (!p || !p.active) return null;
  const today = new Date().toISOString().slice(0, 10);
  if ((p.startsAt && p.startsAt > today) || (p.endsAt && p.endsAt < today)) return null;
  if (p.usageLimit && p.usedCount >= p.usageLimit) return null;
  return p;
}

export { applyPromo };
