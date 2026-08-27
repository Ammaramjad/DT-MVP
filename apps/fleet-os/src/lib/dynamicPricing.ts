import type {
  DemandLevel,
  Driver,
  PricingRules,
  TaiwanRegion,
  Vehicle,
  VehicleCategory,
  WeatherCondition,
  ZoneCondition,
  FareBreakdown,
} from '../types'
import { REGIONS } from '../data/locations'
import type { VehicleCategoryEntry } from '../data/vehicleCatalog'

/**
 * Simulated Dynamic Pricing Service — "Demo API simulation" per the client
 * brief. Every value here (weather, demand, availability) is generated
 * client-side; the shape is deliberately API-response-like so a real Weather
 * API, Maps/traffic API, fleet GPS API, supplier-availability API and
 * pricing-rules service could replace this module's data source later
 * without changing any downstream consumer (BookingPanel, Fleet OS, the
 * Driver App earnings estimate, etc.).
 */

export const WEATHER_CONDITIONS: WeatherCondition[] = ['CLEAR', 'RAIN', 'HEAVY_RAIN', 'TYPHOON_WARNING']
export const DEMAND_LEVELS: DemandLevel[] = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL']

/** Platform take rate used to split the customer's final fare into a
 * supplier/driver-facing price and the platform's margin — kept consistent
 * with the 18% commission already modeled in the Driver App's earnings
 * screen (`lib/earnings.ts`) so the two views of "the same money" agree. */
export const PLATFORM_MARGIN_PCT = 18

export const DEFAULT_PRICING_RULES: PricingRules = {
  maxSurgeMultiplierPct: 60,
  weatherSurchargePct: { CLEAR: 0, RAIN: 10, HEAVY_RAIN: 25, TYPHOON_WARNING: 45 },
  demandSurchargePct: { LOW: -5, NORMAL: 0, HIGH: 20, CRITICAL: 45 },
  minAvailableVehiclesBeforeSurge: 3,
  lowAvailabilitySurchargePct: 15,
  vipSurchargePct: 8,
  nightSurchargePct: 15,
  nightStartHour: 23,
  nightEndHour: 6,
  holidaySurchargePct: 20,
  zoneSurcharges: {
    TAIPEI: 0,
    NEW_TAIPEI: 0,
    TAOYUAN: 150,
    HSINCHU: 60,
    TAICHUNG: 60,
    TAINAN: 60,
    KAOHSIUNG: 100,
    HUALIEN: 80,
    TAITUNG: 80,
    NANTOU: 60,
  },
  roundingIncrement: 10,
  transparencyMessage: 'The final fare is always shown before payment — no hidden fees.',
  transparencyMessageZh: '結帳前一定會顯示最終總金額 — 絕無隱藏費用。',
}

/** Seeded initial zone conditions — deliberately gives Taoyuan a live "heavy
 * rain + high demand" scenario out of the box so the surge-pricing /
 * transparent-breakdown demo scenario is visible immediately without
 * needing to wait for the drift simulation. */
export function buildInitialZoneConditions(): ZoneCondition[] {
  const now = Date.now()
  const overrides: Partial<Record<TaiwanRegion, { weather: WeatherCondition; demand: DemandLevel }>> = {
    TAOYUAN: { weather: 'HEAVY_RAIN', demand: 'HIGH' },
    TAIPEI: { weather: 'RAIN', demand: 'NORMAL' },
    KAOHSIUNG: { weather: 'CLEAR', demand: 'LOW' },
    HUALIEN: { weather: 'CLEAR', demand: 'NORMAL' },
  }
  return REGIONS.map((r) => ({
    region: r.key,
    weather: overrides[r.key]?.weather ?? 'CLEAR',
    demand: overrides[r.key]?.demand ?? 'NORMAL',
    updatedAt: now,
  }))
}

/** Occasionally nudges one random zone's weather/demand by one step —
 * called from the simulation tick so the Dynamic Pricing module feels
 * "live" without needing a real API poll. */
export function driftZoneConditions(conditions: ZoneCondition[]): ZoneCondition[] {
  if (Math.random() > 0.12) return conditions
  const idx = Math.floor(Math.random() * conditions.length)
  const target = conditions[idx]
  if (!target) return conditions
  const stepList = (Math.random() > 0.5 ? WEATHER_CONDITIONS : DEMAND_LEVELS) as (WeatherCondition | DemandLevel)[]
  const isWeather = stepList === WEATHER_CONDITIONS
  const currentIndex = isWeather ? WEATHER_CONDITIONS.indexOf(target.weather) : DEMAND_LEVELS.indexOf(target.demand)
  const direction = Math.random() > 0.5 ? 1 : -1
  const nextIndex = Math.min(stepList.length - 1, Math.max(0, currentIndex + direction))
  const next: ZoneCondition = isWeather
    ? { ...target, weather: WEATHER_CONDITIONS[nextIndex], updatedAt: Date.now() }
    : { ...target, demand: DEMAND_LEVELS[nextIndex], updatedAt: Date.now() }
  return conditions.map((c, i) => (i === idx ? next : c))
}

/** A handful of fixed "holiday / peak period" dates (month-day, any year) so
 * the holiday-surcharge rule has something concrete to demo against —
 * mirrors Taiwan public holidays/long weekends without needing a real
 * calendar API. */
const HOLIDAY_MONTH_DAYS = new Set(['01-01', '02-08', '02-09', '02-10', '02-28', '04-04', '05-01', '06-10', '09-17', '10-10'])

export function isHolidayPeriod(scheduledIso: string): boolean {
  const d = new Date(scheduledIso)
  const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return HOLIDAY_MONTH_DAYS.has(key) || d.getDay() === 6 // Saturdays modeled as a lightweight "peak period" too
}

export function isNightTime(scheduledIso: string, startHour: number, endHour: number): boolean {
  const hour = new Date(scheduledIso).getHours()
  if (startHour === endHour) return false
  if (startHour < endHour) return hour >= startHour && hour < endHour
  return hour >= startHour || hour < endHour
}

/** Vehicles usable to fulfil a given category in a given zone right now —
 * "current fleet availability in the pickup area" from the client brief.
 * Counts vehicles whose category matches (or whose underlying physical type
 * matches, as a softer fallback), that are not blocked for maintenance, and
 * whose driver is currently AVAILABLE. */
export function countAvailableVehicles(vehicles: Vehicle[], drivers: Driver[], region: TaiwanRegion, category: VehicleCategory, underlyingType: string): number {
  const now = Date.now()
  const driverById = new Map(drivers.map((d) => [d.id, d]))
  return vehicles.filter((v) => {
    if (v.maintenanceUntil && v.maintenanceUntil > now) return false
    if (v.complianceStatus === 'FLAGGED' || v.insuranceStatus === 'EXPIRED') return false
    if (v.serviceZone !== region) return false
    if (v.category !== category && v.type !== underlyingType) return false
    const driver = driverById.get(v.driverId)
    return driver?.status === 'AVAILABLE'
  }).length
}

export interface DynamicPricingInput {
  category: VehicleCategoryEntry
  distanceKm: number
  durationMin: number
  isAirport: boolean
  pickupZone: TaiwanRegion | undefined
  scheduledTimeIso: string
  waitingMinutes?: number
  tollFee?: number
  parkingFee?: number
  availableVehiclesInZone: number
  weather: WeatherCondition
  demand: DemandLevel
  rules: PricingRules
  couponDiscount?: number
  couponCode?: string | null
  memberDiscountPct?: number
}

/**
 * The core simulated dynamic-pricing calculation. Pure function — the same
 * inputs always produce the same, fully-itemized breakdown, so it can be
 * called identically from the Customer App booking flow, the Fleet OS
 * `/fleet-os/pricing/dynamic` preview grid, and seed/ambient order
 * generation. Every adjustment line is always populated (0 when inactive)
 * so the UI can render a stable, honest breakdown with nothing hidden.
 */
export function computeDynamicFareBreakdown(input: DynamicPricingInput): FareBreakdown {
  const { category, rules } = input
  const baseFare = category.baseFare
  const distanceCost = Math.round(input.distanceKm * category.perKmRate)
  const timeCost = Math.round(input.durationMin * category.perMinRate)
  const rideCost = baseFare + distanceCost + timeCost

  const lowAvailability = input.availableVehiclesInZone < rules.minAvailableVehiclesBeforeSurge
  const demandPctRaw = rules.demandSurchargePct[input.demand] + (lowAvailability ? rules.lowAvailabilitySurchargePct : 0)
  const weatherPctRaw = rules.weatherSurchargePct[input.weather]
  const totalSurchargePctRaw = demandPctRaw + weatherPctRaw
  const cappedPct = Math.min(totalSurchargePctRaw, rules.maxSurgeMultiplierPct)
  const fairnessCapApplied = totalSurchargePctRaw > rules.maxSurgeMultiplierPct
  const scale = totalSurchargePctRaw > 0 ? cappedPct / totalSurchargePctRaw : 1

  const demandAdjustment = Math.round(rideCost * ((demandPctRaw * scale) / 100))
  const weatherAdjustment = Math.round(rideCost * ((weatherPctRaw * scale) / 100))

  const night = isNightTime(input.scheduledTimeIso, rules.nightStartHour, rules.nightEndHour)
  const holiday = isHolidayPeriod(input.scheduledTimeIso)
  const nightSurcharge = night ? Math.round(rideCost * (rules.nightSurchargePct / 100)) : 0
  const holidaySurcharge = holiday ? Math.round(rideCost * (rules.holidaySurchargePct / 100)) : 0

  const zoneSurcharge = input.pickupZone ? rules.zoneSurcharges[input.pickupZone] ?? 0 : 0
  const airportSurcharge = input.isAirport ? (zoneSurcharge || 150) : 0
  const tollFee = input.tollFee ?? 0
  const parkingFee = input.parkingFee ?? 0
  const waitingMinutes = Math.max(0, Math.min(90, input.waitingMinutes ?? 0))
  const waitingFee = Math.round(waitingMinutes * 6)
  const vipSurcharge = category.isVip ? Math.round(rideCost * (rules.vipSurchargePct / 100)) : 0

  const subtotalRaw =
    rideCost + demandAdjustment + weatherAdjustment + nightSurcharge + holidaySurcharge + airportSurcharge + tollFee + parkingFee + waitingFee + vipSurcharge
  const roundTo = Math.max(1, rules.roundingIncrement)
  const subtotal = Math.round(subtotalRaw / roundTo) * roundTo

  const memberDiscount = input.memberDiscountPct ? Math.round(subtotal * (input.memberDiscountPct / 100)) : 0
  const couponDiscount = input.couponDiscount ?? 0
  const discount = memberDiscount + couponDiscount
  const total = Math.max(0, Math.round((subtotal - discount) / roundTo) * roundTo)

  const supplierPrice = Math.round(subtotal * (1 - PLATFORM_MARGIN_PCT / 100))
  const platformMargin = subtotal - supplierPrice

  let explanationKey: string | null = null
  const explanationParams: Record<string, string | number> = {
    category: category.category,
    zone: input.pickupZone ?? '',
    weather: input.weather,
    demand: input.demand,
  }
  const demandIsHigh = input.demand === 'HIGH' || input.demand === 'CRITICAL'
  const weatherIsBad = input.weather !== 'CLEAR'
  if (demandIsHigh && weatherIsBad) explanationKey = 'pricing.explanation.demandWeather'
  else if (demandIsHigh && lowAvailability) explanationKey = 'pricing.explanation.demandLowAvailability'
  else if (demandIsHigh) explanationKey = 'pricing.explanation.demand'
  else if (weatherIsBad) explanationKey = 'pricing.explanation.weather'
  else if (night) explanationKey = 'pricing.explanation.night'
  else if (holiday) explanationKey = 'pricing.explanation.holiday'

  return {
    baseFare,
    distanceCost,
    timeCost,
    demandAdjustment,
    weatherAdjustment,
    nightSurcharge,
    holidaySurcharge,
    airportSurcharge,
    tollFee,
    parkingFee,
    waitingFee,
    vipSurcharge,
    subtotal,
    discount,
    couponCode: input.couponCode ?? null,
    total,
    demandLevel: input.demand,
    weatherCondition: input.weather,
    appliedSurchargePct: Math.round(cappedPct),
    fairnessCapApplied,
    supplierPrice,
    platformMargin,
    explanationKey,
    explanationParams,
  }
}
