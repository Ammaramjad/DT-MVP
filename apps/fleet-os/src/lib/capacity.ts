import type { CapacityDay, ShiftDay } from '../types'
import { hashSeed, mulberry32 } from './geo'

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Generates a rolling capacity forecast (7 trailing days of "actuals" + today +
 * ~22 forward-looking days), modelled after the reference Fleet OS "量能月曆"
 * (capacity calendar) — daily order volume, scheduled driver headcount, and
 * leave count, with a handful of deterministic "peak day" spikes.
 */
export function buildCapacityForecast(fleetSize: number, seedKey = 'capacity-v1'): CapacityDay[] {
  const rand = mulberry32(hashSeed(seedKey))
  const days: CapacityDay[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let offset = -7; offset <= 22; offset++) {
    const date = new Date(today)
    date.setDate(date.getDate() + offset)
    const weekday = date.getDay()
    const weekendBoost = weekday === 0 || weekday === 6 ? 1.12 : 1
    const isPeak = rand() > 0.86
    const base = 60 + rand() * 45
    const orderCount = Math.round(base * weekendBoost * (isPeak ? 1.55 : 1))
    const scheduledDrivers = Math.min(fleetSize, Math.max(1, Math.round(fleetSize * (0.55 + rand() * 0.4))))
    const onLeave = Math.max(0, Math.round(rand() * (fleetSize * 0.2)))

    days.push({
      date: toISODate(date),
      orderCount,
      scheduledDrivers,
      onLeave,
      isPeak,
      isToday: offset === 0,
      isPast: offset < 0,
    })
  }

  return days
}

/**
 * Generates a deterministic day/night/off shift schedule for one driver
 * spanning 7 trailing days through 7 upcoming days, mirroring the reference
 * site's per-driver schedule matrix ("排班管理").
 */
export function buildShiftSchedule(driverId: string, seedKey = 'shift-v1'): ShiftDay[] {
  const rand = mulberry32(hashSeed(`${seedKey}-${driverId}`))
  const schedule: ShiftDay[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let offset = -7; offset <= 7; offset++) {
    const date = new Date(today)
    date.setDate(date.getDate() + offset)
    const roll = rand()
    const shift: ShiftDay['shift'] = roll > 0.86 ? 'OFF' : roll > 0.48 ? 'DAY' : 'NIGHT'
    schedule.push({
      date: toISODate(date),
      shift,
      adjusted: rand() > 0.9,
    })
  }

  return schedule
}

export function hourlyOrderDistribution(scheduledTimes: string[]): { hour: number; count: number }[] {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))
  for (const iso of scheduledTimes) {
    const hour = new Date(iso).getHours()
    if (buckets[hour]) buckets[hour].count += 1
  }
  return buckets
}
