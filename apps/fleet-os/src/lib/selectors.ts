import { ACTIVE_ORDER_STATUSES } from '../types'
import type { Driver, Order, Vehicle } from '../types'
import { DRIVER_REVEAL_WINDOW_MS } from './serviceRules'

const DRIVER_VISIBLE_STATUSES = new Set<Order['status']>(['DRIVER_EN_ROUTE', 'ARRIVED', 'PASSENGER_ONBOARD', 'COMPLETED'])

/**
 * 萬馬接送-style driver-info-reveal timing: full contact details (name,
 * phone, plate) are only shown once the driver is genuinely en route (or a
 * demo override is set), or once the trip is within the reveal window of
 * departure — rather than instantly at booking, even though a driver may
 * already be `ASSIGNED` well ahead of time.
 */
export function isDriverInfoRevealed(order: Order, now: number = Date.now()): boolean {
  if (!order.driverId) return false
  if (order.driverInfoRevealOverride) return true
  if (DRIVER_VISIBLE_STATUSES.has(order.status)) return true
  if (order.status !== 'ASSIGNED') return false
  const scheduledAt = new Date(order.scheduledTime).getTime()
  return now >= scheduledAt - DRIVER_REVEAL_WINDOW_MS
}

/** Honest "vehicle substitution" transparency: true when the vehicle Fleet
 * OS actually dispatched differs from the category the customer originally
 * selected (e.g. booked a 9-seat van, dispatched a compatible 6-seat van
 * that still covers the party) — mirrors Wanma's "may substitute an
 * 8-seater if ≤7 passengers" disclosure. */
export function isVehicleSubstituted(order: Order, vehicles: Vehicle[]): boolean {
  if (!order.vehicleId) return false
  const vehicle = vehicles.find((v) => v.id === order.vehicleId)
  if (!vehicle) return false
  return vehicle.category !== order.vehicleCategory
}

const ACTIVE_SET = new Set(ACTIVE_ORDER_STATUSES)
const UNASSIGNED_SET = new Set<Order['status']>(['CONFIRMED', 'DRIVER_MATCHING'])

export function computeKpis(orders: Order[], drivers: Driver[]) {
  const now = Date.now()
  const activeOrders = orders.filter((o) => ACTIVE_SET.has(o.status)).length
  const availableDrivers = drivers.filter((d) => d.status === 'AVAILABLE').length
  const completedToday = orders.filter((o) => o.status === 'COMPLETED' && isWithinHours(o, 24, now))
  const todayRevenue = completedToday.reduce((sum, o) => sum + o.priceEstimate, 0)

  const delayedFlights = orders.filter((o) => o.flightInfo?.status === 'DELAYED').length
  const flightOrders = orders.filter((o) => o.flightInfo).length
  const onTimePct = flightOrders === 0 ? 98 : Math.round(((flightOrders - delayedFlights) / flightOrders) * 100)

  const unassignedOrders = orders.filter((o) => UNASSIGNED_SET.has(o.status)).length
  const anomalies =
    drivers.filter((d) => d.unresponsiveFlagUntil && d.unresponsiveFlagUntil > now).length +
    orders.filter((o) => o.flightInfo?.status === 'DELAYED' && ACTIVE_SET.has(o.status)).length
  const todayIso = new Date().toISOString().slice(0, 10)
  const onLeaveToday = drivers.filter((d) => d.shiftSchedule.find((s) => s.date === todayIso)?.shift === 'OFF').length

  return {
    activeOrders,
    availableDrivers,
    todayRevenue,
    onTimePct,
    completedCount: completedToday.length,
    unassignedOrders,
    anomalies,
    onLeaveToday,
  }
}

function isWithinHours(order: Order, hours: number, now: number): boolean {
  const at = order.statusHistory.find((h) => h.status === 'COMPLETED')?.at ?? order.createdAt
  return now - at <= hours * 60 * 60 * 1000
}

/** Client brief: "Fleet OS must show 86 active rides and completed rides for
 * the last 3 hours, 4 hours, today, week and month." Seed data is generated
 * to make these figures true on load; this selector just reads them back out
 * of the live order list so they stay correct as the simulation runs. */
export function computeRideVolumeStats(orders: Order[]) {
  const now = Date.now()
  const completedAt = (o: Order) => o.statusHistory.find((h) => h.status === 'COMPLETED')?.at ?? o.createdAt
  const completed = orders.filter((o) => o.status === 'COMPLETED')

  const within = (hours: number) => completed.filter((o) => now - completedAt(o) <= hours * 60 * 60 * 1000).length

  return {
    active: orders.filter((o) => ACTIVE_SET.has(o.status)).length,
    completedLast3h: within(3),
    completedLast4h: within(4),
    completedToday: within(24),
    completedThisWeek: within(24 * 7),
    completedThisMonth: within(24 * 30),
  }
}

export function documentAlerts(drivers: Driver[]) {
  return drivers.flatMap((d) => {
    const alerts: { driverId: string; driverName: string; docTypeKey: string; status: string; expiresAt: string }[] = []
    for (const [kind, doc] of Object.entries(d.documents)) {
      if (doc.status !== 'VALID') {
        alerts.push({ driverId: d.id, driverName: d.name, docTypeKey: `doc.${kind}`, status: doc.status, expiresAt: doc.expiresAt })
      }
    }
    return alerts
  })
}
