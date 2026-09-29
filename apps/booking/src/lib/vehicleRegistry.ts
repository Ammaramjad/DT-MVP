import type { VehicleId } from './data'
export type VehicleAsset = { id: VehicleId; url: string; scale: number; wheelbase: number; presentation: 'licensed-existing' | 'placeholder-pending-licensed-asset' }
/** Asset registry isolates booking logic from replaceable GLB files. */
export const VEHICLE_ASSETS: Record<VehicleId, VehicleAsset> = {
  economy: { id:'economy', url:'/models/car.glb', scale:.86, wheelbase:2.7, presentation:'licensed-existing' },
  comfort: { id:'comfort', url:'/models/car.glb', scale:.94, wheelbase:2.9, presentation:'licensed-existing' },
  business: { id:'business', url:'/models/car.glb', scale:1.04, wheelbase:3, presentation:'placeholder-pending-licensed-asset' },
  premium: { id:'premium', url:'/models/car.glb', scale:1, wheelbase:3.1, presentation:'licensed-existing' },
  seven: { id:'seven', url:'/models/car.glb', scale:1.1, wheelbase:3.15, presentation:'placeholder-pending-licensed-asset' },
  van: { id:'van', url:'/models/car.glb', scale:1.18, wheelbase:3.4, presentation:'placeholder-pending-licensed-asset' },
}
