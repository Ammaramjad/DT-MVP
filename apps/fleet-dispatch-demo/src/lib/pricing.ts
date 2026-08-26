import type { VehicleType } from '../types'

// Simulated "auto pricing by distance / time / vehicle type" logic
// (Phase 2 module: Route Cost Logic).
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

export function estimateFare(distanceKm: number, vehicleType: VehicleType, isAirport: boolean): number {
  const base = BASE_FARE[vehicleType]
  const distanceCost = distanceKm * PER_KM_RATE[vehicleType]
  const airportSurcharge = isAirport ? 150 : 0
  const total = base + distanceCost + airportSurcharge
  return Math.round(total / 10) * 10
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

export function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}
