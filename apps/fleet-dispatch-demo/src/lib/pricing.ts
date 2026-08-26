import type { FareBreakdown, VehicleType } from '../types'

// Simulated "auto pricing by distance / time / vehicle type" logic
// (Phase 2 module: Route Cost Logic), now broken into named line items so
// the customer sees exactly what they're paying for (Phase 1 depth item:
// "visible fare breakdown with named surcharges").
const BASE_FARE: Record<VehicleType, number> = {
  SEDAN: 350,
  SUV: 550,
  VAN: 750,
  LUXURY: 1200,
  MINIBUS: 1600,
}

const PER_KM_RATE: Record<VehicleType, number> = {
  SEDAN: 18,
  SUV: 24,
  VAN: 28,
  LUXURY: 42,
  MINIBUS: 34,
}

const PER_MIN_RATE: Record<VehicleType, number> = {
  SEDAN: 2.2,
  SUV: 2.8,
  VAN: 3.2,
  LUXURY: 5,
  MINIBUS: 4,
}

const AIRPORT_SURCHARGE = 150
const WAITING_FEE_PER_MIN = 6

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
  opts: { waitingMinutes?: number; couponCode?: string | null } = {},
): FareBreakdown {
  const baseFare = BASE_FARE[vehicleType]
  const distanceCost = Math.round(distanceKm * PER_KM_RATE[vehicleType])
  const timeCost = Math.round(durationMin * PER_MIN_RATE[vehicleType])
  const airportSurcharge = isAirport ? AIRPORT_SURCHARGE : 0
  const waitingMinutes = Math.max(0, Math.min(90, opts.waitingMinutes ?? 0))
  const waitingFee = Math.round(waitingMinutes * WAITING_FEE_PER_MIN)
  const subtotalRaw = baseFare + distanceCost + timeCost + airportSurcharge + waitingFee
  const subtotal = Math.round(subtotalRaw / 10) * 10

  const coupon = findCoupon(opts.couponCode)
  const discount = coupon ? (coupon.kind === 'PERCENT' ? Math.round(subtotal * (coupon.value / 100)) : Math.min(subtotal, coupon.value)) : 0
  const total = Math.max(0, Math.round((subtotal - discount) / 10) * 10)

  return {
    baseFare,
    distanceCost,
    timeCost,
    airportSurcharge,
    waitingFee,
    subtotal,
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
