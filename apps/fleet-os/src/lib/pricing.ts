import type { FareBreakdown, VehicleType } from '../types'
import { DEFAULT_CATEGORY_FOR_TYPE, VEHICLE_CATEGORY_CATALOG } from '../data/vehicleCatalog'
import { computeDynamicFareBreakdown, DEFAULT_PRICING_RULES } from './dynamicPricing'

// Simulated "auto pricing by distance / time / vehicle type" logic
// (Phase 2 module: Route Cost Logic). `computeFareBreakdown` below is kept as
// the simple/legacy entry point (used by seed data + ambient orders, which
// don't carry a live zone/weather/demand context) — it now delegates to the
// full simulated Dynamic Pricing Service (`lib/dynamicPricing.ts`) with
// neutral "clear weather / normal demand" conditions, so the numbers it
// produces are unchanged from before that engine existed. Real bookings made
// through the Customer App call `computeDynamicFareBreakdown` directly with
// the live zone/weather/demand context instead.

export interface CouponDef {
  code: string
  kind: 'PERCENT' | 'FIXED'
  value: number
  description: string
  descriptionZh: string
}

// Seeded demo coupons for the client-side promo-code flow — validated
// entirely in the browser, no server/payment integration (out of scope).
export const DEMO_COUPONS: CouponDef[] = [
  { code: 'FLYHIGH10', kind: 'PERCENT', value: 10, description: '10% off your fare', descriptionZh: '車資折抵 10%' },
  { code: 'NT100OFF', kind: 'FIXED', value: 100, description: 'NT$100 off your fare', descriptionZh: '折抵 NT$100' },
  { code: 'WELCOME50', kind: 'FIXED', value: 50, description: 'NT$50 off your first ride', descriptionZh: '首次乘車折抵 NT$50' },
]

export function findCoupon(code: string | null | undefined): CouponDef | null {
  if (!code) return null
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null
  return DEMO_COUPONS.find((c) => c.code === normalized) ?? null
}

export function computeFareBreakdown(
  distanceKm: number,
  durationMin: number,
  vehicleType: VehicleType,
  isAirport: boolean,
  opts: { waitingMinutes?: number; couponCode?: string | null; scheduledTimeIso?: string } = {},
): FareBreakdown {
  const category = VEHICLE_CATEGORY_CATALOG[DEFAULT_CATEGORY_FOR_TYPE[vehicleType]]
  const coupon = findCoupon(opts.couponCode)
  // Legacy 2-arg discount math (percent-of-subtotal / fixed) is resolved after
  // the subtotal is known, so pass 0 into the engine and re-derive it below —
  // keeps this call site's coupon semantics identical to the pre-Phase-3 code.
  const preview = computeDynamicFareBreakdown({
    category,
    distanceKm,
    durationMin,
    isAirport,
    pickupZone: undefined,
    scheduledTimeIso: opts.scheduledTimeIso ?? new Date().toISOString(),
    waitingMinutes: opts.waitingMinutes,
    availableVehiclesInZone: 999,
    weather: 'CLEAR',
    demand: 'NORMAL',
    rules: DEFAULT_PRICING_RULES,
  })
  const discount = coupon ? (coupon.kind === 'PERCENT' ? Math.round(preview.subtotal * (coupon.value / 100)) : Math.min(preview.subtotal, coupon.value)) : 0
  const total = Math.max(0, Math.round((preview.subtotal - discount) / 10) * 10)

  return {
    ...preview,
    discount,
    couponCode: coupon ? coupon.code : null,
    total,
  }
}

export function estimateDurationMin(distanceKm: number): number {
  const avgSpeedKmh = 42
  return Math.max(12, Math.round((distanceKm / avgSpeedKmh) * 60))
}

let counter = Math.floor(Math.random() * 40) + 1024

export function nextOrderNo(): string {
  counter += 1
  return `FP-${counter}`
}

/**
 * The seed data's bulk order generator (`src/data/seed.ts`, sized to hit the
 * client-requested "86 active rides" + multi-window completed counts) issues
 * several hundred sequential `FP-####` numbers of its own, starting well
 * within this counter's default random range — which could otherwise produce
 * colliding order numbers between a seeded order and a freshly booked one.
 * The store calls this once after seeding to push the live counter safely
 * past every number the seed already used.
 */
export function ensureOrderNoAbove(min: number): void {
  if (counter < min) counter = min
}

export function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}

// Quotations are only valid for a short demo-friendly window before the
// customer must refresh to a new version (Phase 1 depth item: "quotation
// expiry/versioning").
export const QUOTATION_TTL_MS = 5 * 60_000
