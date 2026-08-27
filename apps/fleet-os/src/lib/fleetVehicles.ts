import type { Driver, TaiwanRegion, Vehicle, VehicleCategory, VehicleOperationalStatus } from '../types'

/**
 * Derived (never stored) vehicle operational status for the Fleet OS vehicle
 * inventory module — combines the vehicle's own maintenance/compliance
 * fields with its assigned driver's live status, so there is exactly one
 * source of truth (no risk of the two drifting out of sync).
 */
export function vehicleOperationalStatus(vehicle: Vehicle, driver: Driver | undefined): VehicleOperationalStatus {
  const now = Date.now()
  if (vehicle.maintenanceUntil && vehicle.maintenanceUntil > now) return 'MAINTENANCE'
  if (vehicle.complianceStatus === 'FLAGGED' || vehicle.insuranceStatus === 'EXPIRED') return 'DOCUMENT_ISSUE'
  if (!driver || driver.status === 'OFFLINE' || driver.status === 'BREAK') return 'OFFLINE'
  if (driver.status === 'AVAILABLE') return 'AVAILABLE'
  if (driver.status === 'PENDING_RESPONSE') return 'ASSIGNED'
  if (driver.status === 'BUSY') return 'EN_ROUTE'
  return 'OFFLINE'
}

/** A vehicle is "customer-visible" (i.e. counted in availability figures and
 * eligible for dispatch matching) only while it isn't blocked for
 * maintenance and has clean compliance/insurance — regardless of whether its
 * driver happens to be busy right now. Client brief: "maintenance block so
 * unavailable vehicles never appear to customers." */
export function isVehicleCustomerVisible(vehicle: Vehicle): boolean {
  const now = Date.now()
  if (vehicle.maintenanceUntil && vehicle.maintenanceUntil > now) return false
  if (vehicle.complianceStatus === 'FLAGGED' || vehicle.insuranceStatus === 'EXPIRED') return false
  return true
}

export interface ZoneCategorySupply {
  region: TaiwanRegion
  category: VehicleCategory
  total: number
  available: number
}

/** Real-time supply-vs-demand table by Taiwan city/airport zone — one row
 * per (region, category) combination that actually has at least one
 * vehicle, used by both the Fleet OS vehicle-inventory chart and the Dynamic
 * Pricing module's availability readout. */
export function buildZoneCategorySupply(vehicles: Vehicle[], drivers: Driver[]): ZoneCategorySupply[] {
  const driverById = new Map(drivers.map((d) => [d.id, d]))
  const map = new Map<string, ZoneCategorySupply>()
  for (const v of vehicles) {
    const key = `${v.serviceZone}::${v.category}`
    const existing = map.get(key) ?? { region: v.serviceZone, category: v.category, total: 0, available: 0 }
    existing.total += 1
    const driver = driverById.get(v.driverId)
    const status = vehicleOperationalStatus(v, driver)
    if (status === 'AVAILABLE') existing.available += 1
    map.set(key, existing)
  }
  return Array.from(map.values()).sort((a, b) => (a.region === b.region ? a.category.localeCompare(b.category) : a.region.localeCompare(b.region)))
}
