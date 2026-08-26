import type { VehicleType } from '../types'
import sedanPhoto from '../assets/vehicles/vehicle-sedan.jpg'
import suvPhoto from '../assets/vehicles/vehicle-suv.jpg'
import vanPhoto from '../assets/vehicles/vehicle-van.jpg'
import luxuryPhoto from '../assets/vehicles/vehicle-luxury.jpg'
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
