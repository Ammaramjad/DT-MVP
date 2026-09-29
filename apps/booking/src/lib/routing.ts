import { haversineKm, type Place } from './data'

export type RoutePoint = readonly [number, number]
export type Route = { routeId: string; origin: Place; destination: Place; geometry: RoutePoint[]; distanceKm: number; durationMin: number; source: 'deterministic-demo' | 'provider' }
export interface GeocodingProvider { search(query: string): Promise<Place[]> }
export interface PlaceProvider { get(id: string): Promise<Place | null> }
export interface RoutingProvider { route(origin: Place, destination: Place): Promise<Route> }

const hash = (text: string) => [...text].reduce((n, c) => ((n * 31 + c.charCodeAt(0)) >>> 0), 2166136261)
/** Deterministic, explicitly simulated route geometry. Swap this provider without changing UI or scenes. */
export class DemoRoutingProvider implements RoutingProvider {
  async route(origin: Place, destination: Place) { return createDemoRoute(origin, destination) }
}
export function createDemoRoute(origin: Place, destination: Place): Route {
  const seed = hash(`${origin.id}:${destination.id}:${origin.city}`)
  const bend = ((seed % 9) - 4) * .42
  const direction = seed % 2 ? 1 : -1
  const length = 13 + (seed % 8)
  const points: RoutePoint[] = [[-length / 2, -2.8]]
  const count = 4 + seed % 4
  for (let i = 1; i < count; i++) {
    const t = i / count
    const lane = Math.sin(t * Math.PI * (2 + seed % 3)) * (1.3 + Math.abs(bend)) + direction * bend
    points.push([-length / 2 + length * t, lane])
  }
  points.push([length / 2, 2.6 * direction])
  const distanceKm = haversineKm(origin, destination)
  return { routeId: `demo-${origin.id}-${destination.id}-${seed.toString(36)}`, origin, destination, geometry: points, distanceKm, durationMin: Math.max(8, Math.round(distanceKm / 38 * 60)), source: 'deterministic-demo' }
}
export function createApproachRoute(pickup: Place): RoutePoint[] {
  const seed = hash(pickup.id); const side = seed % 2 ? 1 : -1
  return [[-8, side * 6], [-6, side * 2], [-3, side * 2.8], [0, 0]]
}
