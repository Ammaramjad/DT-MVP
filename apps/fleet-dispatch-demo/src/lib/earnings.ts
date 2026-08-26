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
  allTime: number
  tripsToday: number
  tripsWeek: number
  avgPerTrip: number
  last7Days: { label: string; earnings: number; trips: number }[]
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_SHORT_ZH = ['日', '一', '二', '三', '四', '五', '六']

export function buildDriverEarnings(driver: Driver, lang: 'en' | 'zh' = 'en'): DriverEarnings {
  const rand = mulberry32(hashSeed(`earnings-${driver.id}`))
  const avgPerTrip = Math.round(480 + rand() * 340)

  const today = Math.round(driver.stats.totalToday * avgPerTrip * (0.92 + rand() * 0.16))
  const week = Math.round(driver.stats.totalWeek * avgPerTrip * (0.92 + rand() * 0.16))
  const allTime = Math.round(driver.stats.totalAllTime * avgPerTrip * (0.95 + rand() * 0.1))

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

  return {
    today,
    week,
    allTime,
    tripsToday: driver.stats.totalToday,
    tripsWeek: driver.stats.totalWeek,
    avgPerTrip,
    last7Days,
  }
}
