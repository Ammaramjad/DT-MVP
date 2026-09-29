import type { Place } from './data'

/** Provider-neutral contracts. The bundled implementation only searches the disclosed preview dataset. */
export interface GeocodingProvider { search(query: string, locale: string): Promise<Place[]> }
export interface RoutingProvider { route(origin: Place, destination: Place): Promise<RouteResult> }
export interface PlacesProvider { nearby(center: Place, query: string, locale: string): Promise<Place[]> }
export interface GeographicSceneProvider { getContext(bounds: GeoBounds): Promise<GeographicScene | null> }
export type GeoBounds = { north: number; south: number; east: number; west: number }
export type RouteResult = { geometry: [number, number][]; distanceKm: number; durationMin: number; source: string }
export type GeographicScene = { kind: 'tiles-3d' | 'buildings'; attribution: string; url: string }

export type MobilityProviders = {
  geocoding: GeocodingProvider
  routing: RoutingProvider
  places: PlacesProvider
  geographicScene?: GeographicSceneProvider
}

/** Configure production providers at the composition root; never silently label demo geometry as real geography. */
export const createMobilityProviders = (providers: MobilityProviders) => providers
