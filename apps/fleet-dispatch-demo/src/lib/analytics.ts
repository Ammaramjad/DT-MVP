import type { OrderType, VehicleType } from '../types'
import { hashSeed, mulberry32 } from './geo'
import { VEHICLE_TYPES } from '../data/vehicleCatalog'

/**
 * Control Center "Analytics & Reports" tab data model.
 *
 * There's no real backend in this prototype, so historical revenue/order
 * volume for the last ~90 days is generated deterministically (seeded with
 * mulberry32, same technique as `buildCapacityForecast`) rather than
 * invented ad hoc per chart — one generator feeds every chart on the tab, so
 * the daily total always reconciles with the vehicle-type/order-type
 * breakdowns and the week-over-week comparison.
 */

export interface DailyAnalytics {
  date: string
  weekday: number
  revenue: number
  orders: number
  completed: number
  cancelled: number
  byVehicle: Record<VehicleType, number>
  byType: Record<OrderType, number>
}

const ORDER_TYPES: OrderType[] = ['AIRPORT_PICKUP', 'AIRPORT_DROPOFF', 'TOUR_CHARTER']

// Relative demand weights — airport pickups/drop-offs dominate an airport
// transfer fleet, tour charters are the smaller "extra" revenue line.
const ORDER_TYPE_WEIGHTS: Record<OrderType, number> = {
  AIRPORT_PICKUP: 0.42,
  AIRPORT_DROPOFF: 0.36,
  TOUR_CHARTER: 0.22,
}

const VEHICLE_WEIGHTS: Record<VehicleType, number> = {
  SEDAN: 0.34,
  SUV: 0.26,
  VAN: 0.16,
  LUXURY: 0.09,
  MINIBUS: 0.15,
}

const AVG_FARE_BY_VEHICLE: Record<VehicleType, number> = {
  SEDAN: 1050,
  SUV: 1450,
  VAN: 1850,
  LUXURY: 2600,
  MINIBUS: 3400,
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function splitByWeights<K extends string>(total: number, weights: Record<K, number>, rand: () => number): Record<K, number> {
  const keys = Object.keys(weights) as K[]
  const jittered = keys.map((k) => Math.max(0.02, weights[k] * (0.75 + rand() * 0.5)))
  const sum = jittered.reduce((a, b) => a + b, 0)
  const result = {} as Record<K, number>
  let allocated = 0
  keys.forEach((k, i) => {
    const share = i === keys.length - 1 ? total - allocated : Math.round((jittered[i] / sum) * total)
    result[k] = Math.max(0, share)
    allocated += result[k]
  })
  return result
}

/** Builds a deterministic 90-day trailing daily analytics series ending today. */
export function buildDailyAnalytics(days = 90, seedKey = 'analytics-v1'): DailyAnalytics[] {
  const rand = mulberry32(hashSeed(seedKey))
  const out: DailyAnalytics[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Slow upward growth trend over the window plus a weekly seasonality
  // pattern (weekends busier) so the trend chart has a real story to tell.
  for (let offset = -(days - 1); offset <= 0; offset++) {
    const date = new Date(today)
    date.setDate(date.getDate() + offset)
    const weekday = date.getDay()
    const progressThroughWindow = (offset + days - 1) / Math.max(1, days - 1)
    const growth = 1 + progressThroughWindow * 0.35
    const weekendBoost = weekday === 0 || weekday === 6 ? 1.22 : weekday === 5 ? 1.1 : 1
    const noise = 0.82 + rand() * 0.36
    const isHoliday = rand() > 0.95

    const orders = Math.max(4, Math.round(58 * growth * weekendBoost * noise * (isHoliday ? 1.4 : 1)))
    const cancelledRate = 0.03 + rand() * 0.05
    const cancelled = Math.round(orders * cancelledRate)
    const completed = orders - cancelled

    const byType = splitByWeights(orders, ORDER_TYPE_WEIGHTS, rand)
    const byVehicleCount = splitByWeights(completed, VEHICLE_WEIGHTS, rand)

    let revenue = 0
    for (const type of Object.keys(byVehicleCount) as VehicleType[]) {
      revenue += byVehicleCount[type] * AVG_FARE_BY_VEHICLE[type] * (0.9 + rand() * 0.2)
    }

    out.push({
      date: toISODate(date),
      weekday,
      revenue: Math.round(revenue),
      orders,
      completed,
      cancelled,
      byVehicle: byVehicleCount,
      byType,
    })
  }

  return out
}

export type Granularity = 'daily' | 'weekly' | 'monthly'

export interface SeriesPoint {
  label: string
  date: string
  revenue: number
  orders: number
  completed: number
  cancelled: number
}

function isoWeekLabel(d: Date): string {
  const onejan = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export function aggregateSeries(days: DailyAnalytics[], granularity: Granularity): SeriesPoint[] {
  if (granularity === 'daily') {
    return days.map((d) => ({
      label: d.date.slice(5),
      date: d.date,
      revenue: d.revenue,
      orders: d.orders,
      completed: d.completed,
      cancelled: d.cancelled,
    }))
  }

  const buckets = new Map<string, SeriesPoint>()
  for (const d of days) {
    const dateObj = new Date(d.date + 'T00:00:00')
    const key = granularity === 'weekly' ? isoWeekLabel(dateObj) : d.date.slice(0, 7)
    const existing = buckets.get(key)
    if (existing) {
      existing.revenue += d.revenue
      existing.orders += d.orders
      existing.completed += d.completed
      existing.cancelled += d.cancelled
    } else {
      buckets.set(key, { label: key, date: d.date, revenue: d.revenue, orders: d.orders, completed: d.completed, cancelled: d.cancelled })
    }
  }
  return Array.from(buckets.values())
}

export function sumRange(days: DailyAnalytics[], fromOffsetDays: number, toOffsetDaysExclusive: number): DailyAnalytics[] {
  const n = days.length
  return days.slice(Math.max(0, n - toOffsetDaysExclusive), Math.max(0, n - fromOffsetDays))
}

export interface WeekComparison {
  thisWeek: { revenue: number; orders: number; completed: number; cancelled: number }
  lastWeek: { revenue: number; orders: number; completed: number; cancelled: number }
  revenueDeltaPct: number
  ordersDeltaPct: number
}

function summarize(days: DailyAnalytics[]) {
  return days.reduce(
    (acc, d) => ({
      revenue: acc.revenue + d.revenue,
      orders: acc.orders + d.orders,
      completed: acc.completed + d.completed,
      cancelled: acc.cancelled + d.cancelled,
    }),
    { revenue: 0, orders: 0, completed: 0, cancelled: 0 },
  )
}

export function buildWeekComparison(days: DailyAnalytics[]): WeekComparison {
  const thisWeek = summarize(sumRange(days, 0, 7))
  const lastWeek = summarize(sumRange(days, 7, 14))
  const pctDelta = (curr: number, prev: number) => (prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 100))
  return {
    thisWeek,
    lastWeek,
    revenueDeltaPct: pctDelta(thisWeek.revenue, lastWeek.revenue),
    ordersDeltaPct: pctDelta(thisWeek.orders, lastWeek.orders),
  }
}

export interface VehicleBreakdownEntry {
  type: VehicleType
  orders: number
  revenue: number
}

export function buildVehicleBreakdown(days: DailyAnalytics[]): VehicleBreakdownEntry[] {
  const totals: Record<VehicleType, { orders: number; revenue: number }> = {
    SEDAN: { orders: 0, revenue: 0 },
    SUV: { orders: 0, revenue: 0 },
    VAN: { orders: 0, revenue: 0 },
    LUXURY: { orders: 0, revenue: 0 },
    MINIBUS: { orders: 0, revenue: 0 },
  }
  for (const d of days) {
    for (const type of VEHICLE_TYPES) {
      const count = d.byVehicle[type] ?? 0
      totals[type].orders += count
      totals[type].revenue += count * AVG_FARE_BY_VEHICLE[type]
    }
  }
  return VEHICLE_TYPES.map((type) => ({ type, orders: totals[type].orders, revenue: Math.round(totals[type].revenue) }))
}

export interface OrderTypeBreakdownEntry {
  type: OrderType
  orders: number
  revenue: number
}

export function buildOrderTypeBreakdown(days: DailyAnalytics[]): OrderTypeBreakdownEntry[] {
  const totals: Record<OrderType, { orders: number; revenue: number }> = {
    AIRPORT_PICKUP: { orders: 0, revenue: 0 },
    AIRPORT_DROPOFF: { orders: 0, revenue: 0 },
    TOUR_CHARTER: { orders: 0, revenue: 0 },
  }
  for (const d of days) {
    const revenueByType = d.revenue / Math.max(1, d.orders)
    for (const type of ORDER_TYPES) {
      const count = d.byType[type] ?? 0
      totals[type].orders += count
      totals[type].revenue += count * revenueByType
    }
  }
  return ORDER_TYPES.map((type) => ({ type, orders: totals[type].orders, revenue: Math.round(totals[type].revenue) }))
}

export function completionRateSeries(days: DailyAnalytics[]): { label: string; completionRate: number; cancellationRate: number }[] {
  return days.map((d) => ({
    label: d.date.slice(5),
    completionRate: d.orders === 0 ? 100 : Math.round((d.completed / d.orders) * 1000) / 10,
    cancellationRate: d.orders === 0 ? 0 : Math.round((d.cancelled / d.orders) * 1000) / 10,
  }))
}
