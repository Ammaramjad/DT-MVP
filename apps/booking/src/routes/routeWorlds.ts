import type { Place, ServiceId } from '../lib/data'

export type WorldVariant =
  | 'airport-arterial' | 'downtown-grid' | 'business-boulevard' | 'station-district'
  | 'residential-city' | 'waterfront' | 'expressway-connector' | 'hotel-executive'
  | 'technology-district' | 'suburban-connector'

export type RouteWorld = {
  id: WorldVariant
  label: string
  geometry: readonly (readonly [number, number])[]
  camera: readonly [number, number, number]
  buildings: 'terminal' | 'towers' | 'station' | 'residential' | 'hotel' | 'campus'
  vegetation: number
}

export const ROUTE_WORLDS: readonly RouteWorld[] = [
  { id: 'airport-arterial', label: 'Airport arterial', geometry: [[-9,-4],[-6,-4],[-2,-2],[2,-2],[6,1],[9,4]], camera: [10,9,12], buildings: 'terminal', vegetation: 2 },
  { id: 'downtown-grid', label: 'Downtown grid', geometry: [[-8,-5],[-4,-5],[-4,0],[1,0],[1,5],[8,5]], camera: [9,11,10], buildings: 'towers', vegetation: 1 },
  { id: 'business-boulevard', label: 'Business boulevard', geometry: [[-9,3],[-5,1],[-1,1],[3,0],[7,-3],[9,-3]], camera: [11,7,13], buildings: 'towers', vegetation: 4 },
  { id: 'station-district', label: 'Station district', geometry: [[-8,4],[-4,4],[-2,1],[0,-3],[5,-3],[8,-1]], camera: [8,10,11], buildings: 'station', vegetation: 2 },
  { id: 'residential-city', label: 'Residential city', geometry: [[-9,-2],[-5,-2],[-3,2],[0,4],[4,2],[8,3]], camera: [10,8,12], buildings: 'residential', vegetation: 8 },
  { id: 'waterfront', label: 'Waterfront', geometry: [[-9,4],[-5,2],[-2,3],[1,1],[5,2],[9,-1]], camera: [12,6,11], buildings: 'hotel', vegetation: 6 },
  { id: 'expressway-connector', label: 'Expressway connector', geometry: [[-10,-4],[-6,-1],[-2,0],[2,3],[6,4],[10,1]], camera: [13,10,14], buildings: 'residential', vegetation: 10 },
  { id: 'hotel-executive', label: 'Executive quarter', geometry: [[-8,-4],[-5,0],[-1,2],[3,2],[5,-1],[8,-2]], camera: [8,7,12], buildings: 'hotel', vegetation: 5 },
  { id: 'technology-district', label: 'Technology district', geometry: [[-9,0],[-6,3],[-2,3],[1,0],[5,-2],[9,0]], camera: [11,9,10], buildings: 'campus', vegetation: 7 },
  { id: 'suburban-connector', label: 'Suburban connector', geometry: [[-9,3],[-6,0],[-3,-3],[1,-2],[4,2],[9,4]], camera: [12,8,13], buildings: 'residential', vegetation: 12 },
] as const

const hash = (value: string) => [...value].reduce((total, char) => ((total * 33) ^ char.charCodeAt(0)) >>> 0, 5381)

export function selectRouteWorld(origin: Place, destination: Place, service: ServiceId): RouteWorld {
  if (origin.type === 'airport' || service === 'airport-to-location') return ROUTE_WORLDS[0]
  if (destination.type === 'airport' || service === 'location-to-airport') return ROUTE_WORLDS[6]
  if (origin.type === 'station') return ROUTE_WORLDS[3]
  if (origin.id.includes('tamsui') || destination.id.includes('harbor')) return ROUTE_WORLDS[5]
  if (service === 'chauffeur' || origin.type === 'hotel') return ROUTE_WORLDS[7]
  if (origin.city === 'Hsinchu' || destination.city === 'Hsinchu') return ROUTE_WORLDS[8]
  return ROUTE_WORLDS[hash(`${origin.id}:${destination.id}:${service}`) % ROUTE_WORLDS.length]
}
