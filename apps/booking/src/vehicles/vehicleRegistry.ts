import type { VehicleId } from '../lib/data'

export type VehicleClassId = 'sedan' | 'premium-sedan' | 'suv' | 'seven-seater' | 'van' | 'luxury'
export type VehicleAsset = {
  id: VehicleId
  classId: VehicleClassId
  displayName: string
  asset: string | null
  thumbnail: string | null
  passengers: number
  luggage: number
  features: readonly string[]
  priceMultiplier: number
  dimensions: readonly [number, number, number]
  scale: number
  rotation: number
  groundOffset: number
  cameraPreset: 'sedan' | 'suv' | 'van'
  productionStatus: 'licensed' | 'procedural-fallback'
}

export const VEHICLE_ASSETS: Record<VehicleId, VehicleAsset> = {
  economy: { id:'economy', classId:'sedan', displayName:'Fleet Sedan', asset:'/models/car.glb', thumbnail:null, passengers:3, luggage:2, features:['Climate control','Phone charging'], priceMultiplier:1, dimensions:[4.7,1.8,1.45], scale:1, rotation:0, groundOffset:0, cameraPreset:'sedan', productionStatus:'licensed' },
  comfort: { id:'comfort', classId:'premium-sedan', displayName:'Fleet Grand Sedan', asset:'/models/car.glb', thumbnail:null, passengers:4, luggage:3, features:['Quiet cabin','Rear comfort'], priceMultiplier:1.22, dimensions:[5,1.9,1.48], scale:1.04, rotation:0, groundOffset:0, cameraPreset:'sedan', productionStatus:'licensed' },
  business: { id:'business', classId:'suv', displayName:'Fleet Executive SUV', asset:null, thumbnail:null, passengers:5, luggage:4, features:['All-road confidence','Large cargo bay'], priceMultiplier:1.58, dimensions:[4.9,2,1.75], scale:1, rotation:0, groundOffset:0, cameraPreset:'suv', productionStatus:'procedural-fallback' },
  premium: { id:'premium', classId:'luxury', displayName:'Fleet Signature', asset:'/models/car.glb', thumbnail:null, passengers:3, luggage:3, features:['Professional driver','Priority support'], priceMultiplier:2.2, dimensions:[5.2,1.95,1.5], scale:1.08, rotation:0, groundOffset:0, cameraPreset:'sedan', productionStatus:'licensed' },
  seven: { id:'seven', classId:'seven-seater', displayName:'Fleet Three Row', asset:null, thumbnail:null, passengers:7, luggage:4, features:['Three rows','Flexible cargo'], priceMultiplier:1.82, dimensions:[5.05,2,1.82], scale:1, rotation:0, groundOffset:0, cameraPreset:'suv', productionStatus:'procedural-fallback' },
  van: { id:'van', classId:'van', displayName:'Fleet Group Van', asset:null, thumbnail:null, passengers:8, luggage:8, features:['Group seating','High cargo capacity'], priceMultiplier:2.05, dimensions:[5.4,2.05,2.12], scale:1, rotation:0, groundOffset:0, cameraPreset:'van', productionStatus:'procedural-fallback' },
}

export const compatibleVehicles = (passengers: number, luggage: number) =>
  Object.values(VEHICLE_ASSETS).filter(vehicle => vehicle.passengers >= passengers && vehicle.luggage >= luggage)

export function incompatibilityReason(vehicle: VehicleAsset, passengers: number, luggage: number) {
  if (vehicle.passengers < passengers) return `Seats ${vehicle.passengers}; ${passengers} requested`
  if (vehicle.luggage < luggage) return `Fits ${vehicle.luggage} bags; ${luggage} requested`
  return null
}
