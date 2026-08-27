import type { VehicleCategory, VehicleFeature, VehicleType } from '../types'
import sedanPhoto from '../assets/vehicles/vehicle-sedan.jpg'
import comfortSedanPhoto from '../assets/vehicles/vehicle-comfort-sedan.jpg'
import premiumSedanPhoto from '../assets/vehicles/vehicle-premium-sedan.jpg'
import suvPhoto from '../assets/vehicles/vehicle-suv.jpg'
import vanPhoto from '../assets/vehicles/vehicle-van.jpg'
import van9Photo from '../assets/vehicles/vehicle-van9.jpg'
import luxuryPhoto from '../assets/vehicles/vehicle-luxury.jpg'
import luxuryVanPhoto from '../assets/vehicles/vehicle-luxury-van.jpg'
import accessiblePhoto from '../assets/vehicles/vehicle-accessible.jpg'
import minibusPhoto from '../assets/vehicles/vehicle-minibus.jpg'

/**
 * Real-sounding brand/model reference vehicles for each fleet category —
 * replaces any generic/emoji-only vehicle representation with an actual
 * make/model + studio product photo (generated once via the GenerateImage
 * tool and checked into src/assets/vehicles/, so the demo works fully
 * offline/reproducibly with no stock-photo licensing concerns).
 */
export interface VehicleCatalogEntry {
  type: VehicleType
  brand: string
  model: string
  nameZh: string
  seatingMin: number
  seatingMax: number
  photo: string
  colorHex: string
}

export const VEHICLE_CATALOG: Record<VehicleType, VehicleCatalogEntry> = {
  SEDAN: {
    type: 'SEDAN',
    brand: 'Toyota',
    model: 'Camry',
    nameZh: '豐田 Camry',
    seatingMin: 1,
    seatingMax: 3,
    photo: sedanPhoto,
    colorHex: '#22d3ee',
  },
  SUV: {
    type: 'SUV',
    brand: 'Honda',
    model: 'CR-V',
    nameZh: '本田 CR-V',
    seatingMin: 1,
    seatingMax: 5,
    photo: suvPhoto,
    colorHex: '#a855f7',
  },
  VAN: {
    type: 'VAN',
    brand: 'Toyota',
    model: 'Hiace',
    nameZh: '豐田 Hiace',
    seatingMin: 1,
    seatingMax: 7,
    photo: vanPhoto,
    colorHex: '#fbbf24',
  },
  LUXURY: {
    type: 'LUXURY',
    brand: 'Mercedes-Benz',
    model: 'E-Class',
    nameZh: '賓士 E-Class',
    seatingMin: 1,
    seatingMax: 3,
    photo: luxuryPhoto,
    colorHex: '#f472b6',
  },
  MINIBUS: {
    type: 'MINIBUS',
    brand: 'Toyota',
    model: 'Coaster',
    nameZh: '豐田 Coaster',
    seatingMin: 1,
    seatingMax: 12,
    photo: minibusPhoto,
    colorHex: '#a3e635',
  },
}

export const VEHICLE_TYPES: VehicleType[] = ['SEDAN', 'SUV', 'VAN', 'LUXURY', 'MINIBUS']

/**
 * Customer-facing vehicle *categories* — the client brief's 10-item catalogue
 * used for the vehicle-selection/recommendation UI, dynamic pricing, and
 * dispatch matching. TWD pricing is realistic for the Taiwan airport
 * transfer / city ride / intercity / charter market. `underlyingType` links
 * each category back to the physical fleet vehicle class (`VEHICLE_CATALOG`)
 * used for fleet inventory + the automatic-dispatch tier logic.
 */
export interface VehicleCategoryEntry {
  category: VehicleCategory
  underlyingType: VehicleType
  brand: string
  model: string
  nameZh: string
  photo: string
  colorHex: string
  maxPassengers: number
  maxLuggage: number
  features: VehicleFeature[]
  isVip: boolean
  cancellationPolicy: 'FREE_24H' | 'FREE_48H' | 'NON_REFUNDABLE'
  /** TWD dynamic-pricing seed rates — see `lib/dynamicPricing.ts`. */
  baseFare: number
  perKmRate: number
  perMinRate: number
  /** Hourly Charter (計時包車) rate, TWD/hr — see `lib/serviceRules.ts` and
   * `lib/dynamicPricing.ts`'s charter-mode branch. */
  hourlyRate: number
}

export const VEHICLE_CATEGORY_CATALOG: Record<VehicleCategory, VehicleCategoryEntry> = {
  ECONOMY_SEDAN: {
    category: 'ECONOMY_SEDAN',
    underlyingType: 'SEDAN',
    brand: 'Toyota',
    model: 'Corolla Altis',
    nameZh: '豐田 Corolla Altis',
    photo: sedanPhoto,
    colorHex: '#38bdf8',
    maxPassengers: 3,
    maxLuggage: 2,
    features: [],
    isVip: false,
    cancellationPolicy: 'FREE_24H',
    baseFare: 280,
    perKmRate: 16,
    perMinRate: 2.0,
    hourlyRate: 850,
  },
  COMFORT_SEDAN: {
    category: 'COMFORT_SEDAN',
    underlyingType: 'SEDAN',
    brand: 'Toyota',
    model: 'Camry',
    nameZh: '豐田 Camry',
    photo: comfortSedanPhoto,
    colorHex: '#22d3ee',
    maxPassengers: 3,
    maxLuggage: 2,
    features: ['CHILD_SEAT'],
    isVip: false,
    cancellationPolicy: 'FREE_24H',
    baseFare: 350,
    perKmRate: 18,
    perMinRate: 2.2,
    hourlyRate: 950,
  },
  PREMIUM_SEDAN: {
    category: 'PREMIUM_SEDAN',
    underlyingType: 'SEDAN',
    brand: 'Toyota',
    model: 'Crown',
    nameZh: '豐田 Crown',
    photo: premiumSedanPhoto,
    colorHex: '#818cf8',
    maxPassengers: 3,
    maxLuggage: 2,
    features: ['CHILD_SEAT', 'WIFI'],
    isVip: false,
    cancellationPolicy: 'FREE_48H',
    baseFare: 480,
    perKmRate: 22,
    perMinRate: 2.6,
    hourlyRate: 1150,
  },
  SUV: {
    category: 'SUV',
    underlyingType: 'SUV',
    brand: 'Honda',
    model: 'CR-V',
    nameZh: '本田 CR-V',
    photo: suvPhoto,
    colorHex: '#a855f7',
    maxPassengers: 5,
    maxLuggage: 4,
    features: ['CHILD_SEAT', 'LARGE_LUGGAGE'],
    isVip: false,
    cancellationPolicy: 'FREE_24H',
    baseFare: 550,
    perKmRate: 24,
    perMinRate: 2.8,
    hourlyRate: 1300,
  },
  VAN_6: {
    category: 'VAN_6',
    underlyingType: 'VAN',
    brand: 'Toyota',
    model: 'Hiace (6-seat)',
    nameZh: '豐田 Hiace（6人座）',
    photo: vanPhoto,
    colorHex: '#fbbf24',
    maxPassengers: 6,
    maxLuggage: 5,
    features: ['CHILD_SEAT', 'LARGE_LUGGAGE'],
    isVip: false,
    cancellationPolicy: 'FREE_48H',
    baseFare: 750,
    perKmRate: 28,
    perMinRate: 3.2,
    hourlyRate: 1500,
  },
  VAN_9: {
    category: 'VAN_9',
    underlyingType: 'VAN',
    brand: 'Toyota',
    model: 'Hiace Grand (9-seat)',
    nameZh: '豐田 Hiace 加長版（9人座）',
    photo: van9Photo,
    colorHex: '#f59e0b',
    maxPassengers: 9,
    maxLuggage: 7,
    features: ['CHILD_SEAT', 'LARGE_LUGGAGE', 'WIFI'],
    isVip: false,
    cancellationPolicy: 'FREE_48H',
    baseFare: 980,
    perKmRate: 32,
    perMinRate: 3.6,
    hourlyRate: 1800,
  },
  LUXURY_SEDAN: {
    category: 'LUXURY_SEDAN',
    underlyingType: 'LUXURY',
    brand: 'Mercedes-Benz',
    model: 'E-Class',
    nameZh: '賓士 E-Class',
    photo: luxuryPhoto,
    colorHex: '#f472b6',
    maxPassengers: 3,
    maxLuggage: 2,
    features: ['CHILD_SEAT', 'VIP_INTERIOR', 'WIFI', 'MEET_AND_GREET'],
    isVip: true,
    cancellationPolicy: 'FREE_48H',
    baseFare: 1200,
    perKmRate: 42,
    perMinRate: 5.0,
    hourlyRate: 2400,
  },
  LUXURY_VAN: {
    category: 'LUXURY_VAN',
    underlyingType: 'VAN',
    brand: 'Mercedes-Benz',
    model: 'V-Class VIP',
    nameZh: '賓士 V-Class VIP',
    photo: luxuryVanPhoto,
    colorHex: '#c084fc',
    maxPassengers: 6,
    maxLuggage: 5,
    features: ['CHILD_SEAT', 'VIP_INTERIOR', 'WIFI', 'MEET_AND_GREET', 'LARGE_LUGGAGE'],
    isVip: true,
    cancellationPolicy: 'FREE_48H',
    baseFare: 1800,
    perKmRate: 48,
    perMinRate: 5.6,
    hourlyRate: 3200,
  },
  ACCESSIBLE: {
    category: 'ACCESSIBLE',
    underlyingType: 'VAN',
    brand: 'Toyota',
    model: 'Hiace (Wheelchair Ramp)',
    nameZh: '豐田 Hiace（無障礙輪椅升降）',
    photo: accessiblePhoto,
    colorHex: '#60a5fa',
    maxPassengers: 4,
    maxLuggage: 3,
    features: ['WHEELCHAIR_ACCESS', 'CHILD_SEAT'],
    isVip: false,
    cancellationPolicy: 'FREE_48H',
    baseFare: 700,
    perKmRate: 26,
    perMinRate: 3.0,
    hourlyRate: 1400,
  },
  CHARTER_MINIBUS: {
    category: 'CHARTER_MINIBUS',
    underlyingType: 'MINIBUS',
    brand: 'Toyota',
    model: 'Coaster',
    nameZh: '豐田 Coaster',
    photo: minibusPhoto,
    colorHex: '#a3e635',
    maxPassengers: 12,
    maxLuggage: 10,
    features: ['LARGE_LUGGAGE', 'WIFI'],
    isVip: false,
    cancellationPolicy: 'FREE_48H',
    baseFare: 1600,
    perKmRate: 34,
    perMinRate: 4.0,
    hourlyRate: 2000,
  },
}

/** Display order for the vehicle-selection grid — cheapest/most-common
 * options first, VIP/specialty options toward the end. */
export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  'ECONOMY_SEDAN',
  'COMFORT_SEDAN',
  'PREMIUM_SEDAN',
  'SUV',
  'VAN_6',
  'VAN_9',
  'ACCESSIBLE',
  'LUXURY_SEDAN',
  'LUXURY_VAN',
  'CHARTER_MINIBUS',
]

/** A sensible default category per physical vehicle type — used wherever
 * legacy code only has a `VehicleType` (e.g. ambient/seeded orders) and needs
 * a matching customer-facing category for pricing/matching purposes. */
export const DEFAULT_CATEGORY_FOR_TYPE: Record<VehicleType, VehicleCategory> = {
  SEDAN: 'COMFORT_SEDAN',
  SUV: 'SUV',
  VAN: 'VAN_6',
  LUXURY: 'LUXURY_SEDAN',
  MINIBUS: 'CHARTER_MINIBUS',
}
