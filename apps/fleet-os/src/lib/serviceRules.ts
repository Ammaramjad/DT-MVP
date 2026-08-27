import type { VehicleCategory } from '../types'

/**
 * Realism/depth rules adapted from two real Taiwan airport-transfer
 * competitor sites (client-provided research, not literal requirements):
 *
 * - 機場快綫 Airport Express (airportfrstcar.com) — the "保證有車" (guaranteed)
 *   vs. "24小時內臨時預約" (last-minute, 15 min–24 hr ahead, NOT guaranteed,
 *   auto-cancelled free if unmatched within 30 min of the flight landing)
 *   booking-urgency split, and free-cancellation/multi-stop trust signals.
 * - 萬馬接送 Wanma Transfer (wanma.tw/express) — driver-info-reveal timing
 *   (8pm the night before), the 48-hour free-cancellation window, vehicle
 *   substitution within a compatible capacity band, the late-boarding
 *   waiting-fee schedule (15-min grace, 30-min billing blocks, per-vehicle
 *   TWD rate, cash to driver), flight-aware airport-ready buffers with a
 *   70-minute free wait before an escalating fee, a full refund on a
 *   diversion or 2+ hour schedule shift, and the Hourly Charter (計時包車)
 *   product's mountain-route surcharge.
 *
 * Real-world timers (30 minutes, 16 hours, etc.) are compressed to short,
 * clearly-commented demo durations here, the same way the existing
 * dispatch-escalation ladder compresses its real-world timers in
 * `store/useFleetStore.ts`.
 */

// ---- Booking urgency tiers (Airport Express) ------------------------------

export const LAST_MINUTE_MIN_LEAD_MS = 15 * 60_000
export const LAST_MINUTE_MAX_LEAD_MS = 24 * 60 * 60_000

/** Real-world rule: auto-cancel a last-minute, flight-based booking free of
 * charge if no driver has been matched within 30 minutes of the flight's
 * *actual* landing. Compressed here to a short, watchable demo window. */
export const LAST_MINUTE_AUTO_CANCEL_REAL_MINUTES = 30
export const LAST_MINUTE_AUTO_CANCEL_DEMO_MS = 45_000

// ---- Free-cancellation policy (Wanma: 48h, no reason required) -----------

export const FREE_CANCELLATION_WINDOW_HOURS = 48

// ---- Driver-info reveal timing (Wanma: sent 8pm the night before) --------

/** Real-world rule: full driver contact details (name/phone/plate) are only
 * sent the night before the trip. Modeled here as "within N hours of
 * departure," compressed for a demo where most seeded bookings are made
 * only ~90 minutes ahead. */
export const DRIVER_REVEAL_WINDOW_REAL_HOURS = 16
export const DRIVER_REVEAL_WINDOW_MS = DRIVER_REVEAL_WINDOW_REAL_HOURS * 60 * 60_000

// ---- Late-boarding / no-show waiting fee (Wanma) --------------------------

export const WAITING_GRACE_MINUTES = 15
export const WAITING_FEE_BLOCK_MINUTES = 30
export const WAITING_FEE_FORFEIT_MINUTES = 45

/** Per-vehicle-category TWD rate per 30-minute block, paid in cash to the
 * driver — mirrors Wanma's sedan/SUV NT$200, 9-seat van NT$300, large van
 * (大T) / minibus NT$400, Alphard-equivalent luxury NT$500 schedule. */
export const WAITING_FEE_RATE_TWD: Record<VehicleCategory, number> = {
  ECONOMY_SEDAN: 200,
  COMFORT_SEDAN: 200,
  PREMIUM_SEDAN: 200,
  SUV: 200,
  ACCESSIBLE: 200,
  VAN_6: 300,
  VAN_9: 300,
  CHARTER_MINIBUS: 400,
  LUXURY_SEDAN: 500,
  LUXURY_VAN: 500,
}

/** Waiting-fee math: free for the first `WAITING_GRACE_MINUTES`, then billed
 * in `WAITING_FEE_BLOCK_MINUTES` blocks (any partial block rounds up). */
export function computeWaitingFee(category: VehicleCategory, waitMinutes: number): number {
  const billable = Math.max(0, waitMinutes - WAITING_GRACE_MINUTES)
  if (billable <= 0) return 0
  const blocks = Math.ceil(billable / WAITING_FEE_BLOCK_MINUTES)
  return blocks * WAITING_FEE_RATE_TWD[category]
}

// ---- Flight-aware airport-ready buffers (Wanma) ---------------------------

/** How long after *actual* landing a passenger is typically ready to
 * depart the terminal — bigger international airports need a bigger
 * buffer than a small regional one. */
export const AIRPORT_READY_BUFFER_MIN: Record<string, number> = {
  'tpe-airport': 55, // Taoyuan Intl. — large international hub
  'tsa-airport': 50, // Taipei Songshan — mixed domestic/regional international
  'kaohsiung-airport': 35, // Kaohsiung Xiaogang — smaller regional airport
  'hualien-airport': 30,
  'taitung-airport': 30,
}
export const AIRPORT_READY_BUFFER_DEFAULT_MIN = 45

export const AIRPORT_FREE_WAIT_AFTER_LANDING_MIN = 70
export const AIRPORT_FEE_ESCALATION_END_MIN = 100

/** A flight that diverts, or whose arrival shifts by 2+ hours from what was
 * booked, triggers an automatic full refund + cancellation. */
export const MAJOR_FLIGHT_SHIFT_MINUTES = 120

export function airportReadyBufferMin(airportId: string): number {
  return AIRPORT_READY_BUFFER_MIN[airportId] ?? AIRPORT_READY_BUFFER_DEFAULT_MIN
}

// ---- Hourly Charter (計時包車) — Wanma ------------------------------------

export const CHARTER_HOUR_OPTIONS = [4, 6, 8, 10, 12] as const
export const CHARTER_MIN_HOURS = 4
/** Cash-to-driver surcharge for routes through elevations above 1,500m
 * (e.g. Alishan, Hehuanshan) — Wanma charges "NT$500+"; kept at a flat
 * NT$500 for this prototype's simplicity. */
export const MOUNTAIN_ROUTE_SURCHARGE_TWD = 500
/** A per-hour rate multiplier applied on top of the category's per-km rate
 * (charter trips are billed by time reserved, not distance driven). */
export const CHARTER_HOURLY_RATE_MULTIPLIER = 9
