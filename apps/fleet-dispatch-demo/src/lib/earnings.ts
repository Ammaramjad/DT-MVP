import type { Driver } from '../types'
import { hashSeed, mulberry32 } from './geo'

/**
 * Uber-driver-earnings-style numbers derived from the same `DriverStats`
 * already modeled in the store (today/week/all-time trip counts) — rather
 * than inventing a parallel earnings data structure, this just applies a
 * deterministic per-driver average-fare multiplier (seeded, so it's stable
 * across reloads) to the counts that already exist.
 */
export interface DriverEarnings {
  today: number
  week: number
  month: number
  allTime: number
  tripsToday: number
  tripsWeek: number
  avgPerTrip: number
  last7Days: { label: string; earnings: number; trips: number }[]
  incentives: number
  tips: number
  adjustments: number
  cancellationDeduction: number
  grossEarnings: number
  platformCommission: number
  netEarnings: number
  hoursOnline: number
  utilizationPct: number
  cancellationRatePct: number
  serviceQualityScore: number
  breakdown: { airport: number; city: number; charter: number }
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_SHORT_ZH = ['日', '一', '二', '三', '四', '五', '六']

export function buildDriverEarnings(driver: Driver, lang: 'en' | 'zh' = 'en'): DriverEarnings {
  const rand = mulberry32(hashSeed(`earnings-${driver.id}`))
  const avgPerTrip = Math.round(480 + rand() * 340)

  const today = Math.round(driver.stats.totalToday * avgPerTrip * (0.92 + rand() * 0.16))
  const week = Math.round(driver.stats.totalWeek * avgPerTrip * (0.92 + rand() * 0.16))
  const allTime = Math.round(driver.stats.totalAllTime * avgPerTrip * (0.95 + rand() * 0.1))
  const month = Math.round(week * (2.6 + rand() * 0.8))

  const labels = lang === 'zh' ? WEEKDAY_SHORT_ZH : WEEKDAY_SHORT
  const today_ = new Date()
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const offset = -6 + i
    const d = new Date(today_)
    d.setDate(d.getDate() + offset)
    const isToday = offset === 0
    const trips = isToday ? driver.stats.totalToday : Math.max(0, Math.round(1 + rand() * 6))
    const earnings = isToday ? today : Math.round(trips * avgPerTrip * (0.85 + rand() * 0.3))
    return { label: labels[d.getDay()], earnings, trips }
  })

  const incentives = Math.round(week * (0.04 + rand() * 0.05))
  const tips = Math.round(week * (0.03 + rand() * 0.04))
  const adjustments = Math.round(week * (0.01 + rand() * 0.02)) * (rand() > 0.7 ? -1 : 1)
  const cancellationDeduction = Math.round(week * 0.015)
  const grossEarnings = week + incentives + tips + adjustments - cancellationDeduction
  const platformCommission = Math.round(grossEarnings * 0.18)
  const netEarnings = grossEarnings - platformCommission

  const hoursOnline = Math.round((6 + rand() * 4) * 10) / 10
  const resolved = driver.stats.acceptedAllTime + driver.stats.declinedAllTime + driver.stats.missedAllTime
  const utilizationPct = Math.round(55 + rand() * 30)
  const cancellationRatePct = resolved === 0 ? 0 : Math.round((driver.stats.missedAllTime / resolved) * 100)
  const serviceQualityScore = Math.round(driver.rating * 18 + rand() * 6)

  const airportShare = 0.45 + rand() * 0.15
  const charterShare = 0.1 + rand() * 0.1
  const cityShare = 1 - airportShare - charterShare

  return {
    today,
    week,
    month,
    allTime,
    tripsToday: driver.stats.totalToday,
    tripsWeek: driver.stats.totalWeek,
    avgPerTrip,
    last7Days,
    incentives,
    tips,
    adjustments,
    cancellationDeduction,
    grossEarnings,
    platformCommission,
    netEarnings,
    hoursOnline,
    utilizationPct,
    cancellationRatePct,
    serviceQualityScore: Math.min(100, serviceQualityScore),
    breakdown: {
      airport: Math.round(grossEarnings * airportShare),
      city: Math.round(grossEarnings * cityShare),
      charter: Math.round(grossEarnings * charterShare),
    },
  }
}
