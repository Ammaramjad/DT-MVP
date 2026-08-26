import type { Driver, Order, Vehicle } from '../types'
import { haversineKm } from './geo'
import { translate, type Lang } from '../i18n/translations'

const TIER_PRIORITY: Driver['tier'][] = ['OWNED_FLEET', 'PAID_MEMBER', 'OUTSIDE_CONTRACTOR']

// Simulated "Automatic Dispatch Engine" priority logic: owned fleet first,
// then paid members, then contracted outside drivers — within a tier prefer
// an exact vehicle-type match and the closest available driver to pickup.
export function suggestDriver(order: Order, drivers: Driver[], vehicles: Vehicle[], excludeDriverIds: string[] = []): string | null {
  const available = drivers.filter((d) => d.status === 'AVAILABLE' && !excludeDriverIds.includes(d.id))
  if (available.length === 0) return null

  const scored = available.map((d) => {
    const vehicle = vehicles.find((v) => v.id === d.vehicleId)
    const typeMatch = vehicle?.type === order.vehicleType ? 0 : 1
    const distance = haversineKm(d.lat, d.lng, order.pickup.lat, order.pickup.lng)
    const tierRank = TIER_PRIORITY.indexOf(d.tier)
    return { driverId: d.id, tierRank, typeMatch, distance }
  })

  scored.sort((a, b) => {
    if (a.tierRank !== b.tierRank) return a.tierRank - b.tierRank
    if (a.typeMatch !== b.typeMatch) return a.typeMatch - b.typeMatch
    return a.distance - b.distance
  })

  return scored[0]?.driverId ?? null
}

export function driverDisplayLabel(driver: Driver | undefined | null, lang: Lang = 'en'): string {
  if (!driver) return translate(lang, 'unassigned')
  return `${driver.name} · ${driver.nameZh}`
}
