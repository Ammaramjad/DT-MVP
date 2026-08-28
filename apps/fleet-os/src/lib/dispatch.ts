import type { Driver, Order, Vehicle } from '../types'
import { VEHICLE_CATEGORY_CATALOG } from '../data/vehicleCatalog'
import { haversineKm } from './geo'
import { translate, type Lang } from '../i18n/translations'

const TIER_PRIORITY: Driver['tier'][] = ['OWNED_FLEET', 'PAID_MEMBER', 'OUTSIDE_CONTRACTOR']

/**
 * Hard eligibility check used by the matching engine — "only suggest drivers
 * and vehicles that satisfy: passenger capacity; luggage capacity; service
 * category (incl. VIP requirements); accessibility/child-seat need; vehicle
 * availability; scheduled pickup time" (client brief). Deliberately checks
 * physical capability (underlying vehicle type + capacity + luggage +
 * features) rather than requiring an exact category-string match, mirroring
 * how a real fleet would match "any van with a wheelchair ramp that fits 4
 * people" rather than only ever a vehicle tagged exactly `ACCESSIBLE`.
 */
export function vehicleSatisfiesOrder(vehicle: Vehicle, order: Order): boolean {
  const now = Date.now()
  if (vehicle.maintenanceUntil && vehicle.maintenanceUntil > now) return false
  if (vehicle.complianceStatus === 'FLAGGED' || vehicle.insuranceStatus === 'EXPIRED') return false

  const categoryEntry = VEHICLE_CATEGORY_CATALOG[order.vehicleCategory]
  if (vehicle.type !== categoryEntry.underlyingType) return false
  if (vehicle.capacity < order.passengers) return false
  if (vehicle.luggageCapacity < order.luggage) return false
  if (order.passengerRequirements.wheelchair && !vehicle.features.includes('WHEELCHAIR_ACCESS')) return false
  if (order.passengerRequirements.childSeat && !vehicle.features.includes('CHILD_SEAT')) return false
  if (categoryEntry.isVip && !vehicle.features.includes('VIP_INTERIOR')) return false
  return true
}

// Simulated "Automatic Dispatch Engine" priority logic: owned fleet first,
// then paid members, then contracted outside drivers — within a tier prefer
// an exact vehicle-category match, then a compatible-but-not-exact match,
// then the closest available driver to pickup. Hard capacity/luggage/
// accessibility/VIP requirements (see `vehicleSatisfiesOrder`) are enforced
// before any of that ranking runs, so an order is only ever offered to a
// driver/vehicle that can genuinely fulfil it.
export function suggestDriver(order: Order, drivers: Driver[], vehicles: Vehicle[], excludeDriverIds: string[] = []): string | null {
  const available = drivers.filter((d) => d.status === 'AVAILABLE' && !excludeDriverIds.includes(d.id))
  if (available.length === 0) return null

  const vehicleById = new Map(vehicles.map((v) => [v.id, v]))
  const scored = available
    .map((d) => {
      const vehicle = vehicleById.get(d.vehicleId)
      if (!vehicle || !vehicleSatisfiesOrder(vehicle, order)) return null
      const categoryMatch = vehicle.category === order.vehicleCategory ? 0 : 1
      const distance = haversineKm(d.lat, d.lng, order.pickup.lat, order.pickup.lng)
      const tierRank = TIER_PRIORITY.indexOf(d.tier)
      return { driverId: d.id, tierRank, categoryMatch, distance }
    })
    .filter((x): x is { driverId: string; tierRank: number; categoryMatch: number; distance: number } => x !== null)

  scored.sort((a, b) => {
    if (a.tierRank !== b.tierRank) return a.tierRank - b.tierRank
    if (a.categoryMatch !== b.categoryMatch) return a.categoryMatch - b.categoryMatch
    return a.distance - b.distance
  })

  return scored[0]?.driverId ?? null
}

export function rankRescueDrivers(
  order: Order,
  drivers: Driver[],
  vehicles: Vehicle[],
  accidentLocation: { lat: number; lng: number },
): { driver: Driver; vehicle: Vehicle; distanceKm: number; etaMinutes: number; score: number }[] {
  const available = drivers.filter((d) => d.status === 'AVAILABLE' && d.id !== order.originalDriverId)
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]))

  const ranked = available
    .map((d) => {
      const vehicle = vehicleById.get(d.vehicleId)
      if (!vehicle || !vehicleSatisfiesOrder(vehicle, order)) return null

      const distanceKm = haversineKm(d.lat, d.lng, accidentLocation.lat, accidentLocation.lng)
      const etaMinutes = Math.max(3, Math.round(distanceKm * 2.2))
      const tierRank = TIER_PRIORITY.indexOf(d.tier)
      const categoryMatch = vehicle.category === order.vehicleCategory ? 0 : 1

      // Combined ranking score (lower is better)
      const score = distanceKm * 1.5 + tierRank * 5 + categoryMatch * 3
      return { driver: d, vehicle, distanceKm, etaMinutes, score }
    })
    .filter((x): x is { driver: Driver; vehicle: Vehicle; distanceKm: number; etaMinutes: number; score: number } => x !== null)

  ranked.sort((a, b) => a.score - b.score)
  return ranked
}

export function driverDisplayLabel(driver: Driver | undefined | null, lang: Lang = 'en'): string {
  if (!driver) return translate(lang, 'unassigned')
  return `${driver.name} · ${driver.nameZh}`
}
