import type { Category, Route, Subcategory, Vehicle } from "@/db/schema";
import { findPlace, roadDistanceKm } from "./places";
import type { SiteSettings } from "./settings-shape";

export interface TripInput {
  pickup: string;
  dropoff: string;
  pickupAt: string;
  passengers: number;
  luggage: number;
  hours: number;
  days: number;
}

export interface TripEstimate {
  distanceKm: number;
  durationMin: number;
  route: Route | null;
}

export interface Quote {
  vehicleId: number;
  base: number;
  surcharge: number;
  subtotal: number;
  multiplier: number;
  breakdown: string;
}

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, "");
}

export function matchRoute(routes: Route[], pickup: string, dropoff: string): Route | null {
  const p = norm(pickup);
  const d = norm(dropoff);
  if (!p || !d) return null;
  return (
    routes.find((r) => {
      const from = [r.fromZh, r.fromEn].map(norm).filter(Boolean);
      const to = [r.toZh, r.toEn].map(norm).filter(Boolean);
      const fromHit = from.some((f) => p.includes(f) || f.includes(p));
      const toHit = to.some((t) => d.includes(t) || t.includes(d) || t.replace(/\(.*\)/, "").includes(d));
      return fromHit && toHit;
    }) ?? null
  );
}

export function estimateTrip(routes: Route[], pickup: string, dropoff: string): TripEstimate {
  const route = matchRoute(routes, pickup, dropoff);
  if (route) return { distanceKm: route.distanceKm, durationMin: route.durationMin, route };
  const a = findPlace(pickup);
  const b = findPlace(dropoff);
  if (a && b && a !== b) {
    const km = roadDistanceKm(a, b);
    return { distanceKm: km, durationMin: Math.round((km / 55) * 60 + 10), route: null };
  }
  return { distanceKm: 20, durationMin: 35, route: null };
}

export function isNight(pickupAt: string, s: SiteSettings["pricing"]): boolean {
  const d = new Date(pickupAt);
  if (Number.isNaN(d.getTime())) return false;
  const hour = (d.getUTCHours() + 8) % 24;
  return s.nightStartHour > s.nightEndHour
    ? hour >= s.nightStartHour || hour < s.nightEndHour
    : hour >= s.nightStartHour && hour < s.nightEndHour;
}

const round10 = (n: number) => Math.round(n / 10) * 10;

export function quoteVehicle(opts: {
  vehicle: Vehicle;
  vehicles: Vehicle[];
  category: Category;
  subcategory: Subcategory | null;
  trip: TripInput;
  estimate: TripEstimate;
  pricing: SiteSettings["pricing"];
}): Quote {
  const { vehicle, vehicles, category, subcategory, trip, estimate, pricing } = opts;
  const multiplier = subcategory?.priceMultiplier ?? 1;
  let base: number;
  let breakdown: string;
  if (category.pricingMode === "hourly") {
    const hours = Math.max(pricing.minHours, trip.hours || pricing.minHours);
    base = vehicle.perHour * hours;
    breakdown = `${vehicle.perHour} × ${hours}h`;
  } else if (category.pricingMode === "daily") {
    const days = Math.max(1, trip.days || 1);
    base = vehicle.perDay * days;
    breakdown = `${vehicle.perDay} × ${days}d`;
  } else if (estimate.route) {
    const minBase = Math.min(...vehicles.map((v) => v.basePrice)) || vehicle.basePrice;
    base = (estimate.route.price * vehicle.basePrice) / minBase;
    breakdown = `route ${estimate.route.price} × ${(vehicle.basePrice / minBase).toFixed(2)}`;
  } else {
    const extraKm = Math.max(0, estimate.distanceKm - pricing.includedKm);
    base = vehicle.basePrice + extraKm * vehicle.perKm;
    breakdown = `${vehicle.basePrice} + ${Math.round(extraKm)}km × ${vehicle.perKm}`;
  }
  base = base * multiplier;
  const surcharge = category.pricingMode !== "daily" && isNight(trip.pickupAt, pricing) ? (base * pricing.nightSurchargePercent) / 100 : 0;
  return {
    vehicleId: vehicle.id,
    base: round10(base),
    surcharge: round10(surcharge),
    subtotal: round10(base + surcharge),
    multiplier,
    breakdown,
  };
}

export function applyPromo(
  subtotal: number,
  promo: { discountType: string; discountValue: number; minAmount: number } | null,
): number {
  if (!promo || subtotal < promo.minAmount) return 0;
  const d = promo.discountType === "fixed" ? promo.discountValue : (subtotal * promo.discountValue) / 100;
  return Math.min(subtotal, round10(d));
}
