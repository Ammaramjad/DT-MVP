import type { LocationRef, RoutePath, RoutePoint } from '../types'
import { durationTicksFromKm, haversineKm } from './geo'

type GeoSvgPoint = Pick<LocationRef, 'lat' | 'lng' | 'svgX' | 'svgY'>

// Public, no-API-key OSRM demo server. Free to use for light/demo traffic;
// this is exactly the kind of "free routing API" the client's plan calls for
// so the map route is a genuine road-snapped path rather than a synthetic
// curve. If it's unreachable (e.g. an offline sandbox), callers fall back to
// the existing synthetic-route generator in `geo.ts` so the demo never breaks.
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'
const FETCH_TIMEOUT_MS = 6000

/**
 * Builds a similarity transform (uniform scale + rotation, derived from the
 * known geo<->stylized-SVG-canvas correspondence of the two route endpoints)
 * so every intermediate OSRM geo point can also be projected onto the
 * offline SVG map used by `RouteMapFallback` / `FleetMapFallback`. This
 * keeps both renderers driven by the exact same real polyline.
 */
function buildSimilarityTransform(from: GeoSvgPoint, to: GeoSvgPoint) {
  const dgx = to.lat - from.lat
  const dgy = to.lng - from.lng
  const dsx = to.svgX - from.svgX
  const dsy = to.svgY - from.svgY
  const denom = dgx * dgx + dgy * dgy

  if (denom < 1e-12) {
    return (_: { lat: number; lng: number }) => ({ x: from.svgX, y: from.svgY })
  }

  const a = (dsx * dgx + dsy * dgy) / denom
  const b = (dsy * dgx - dsx * dgy) / denom

  return (p: { lat: number; lng: number }) => {
    const x = p.lat - from.lat
    const y = p.lng - from.lng
    return { x: from.svgX + (a * x - b * y), y: from.svgY + (b * x + a * y) }
  }
}

interface OsrmResponse {
  code: string
  routes?: { distance: number; geometry: { coordinates: [number, number][] } }[]
}

/** Fetches a real, road-snapped route from the public OSRM demo server.
 * Returns null (rather than throwing) on any network/parse failure so
 * callers can gracefully fall back to the synthetic generator. */
export async function fetchOsrmRoute(from: GeoSvgPoint, to: GeoSvgPoint): Promise<RoutePath | null> {
  if (typeof fetch !== 'function') return null
  if (forceOfflineForTesting) return null

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const data = (await res.json()) as OsrmResponse
    const route = data.routes?.[0]
    if (data.code !== 'Ok' || !route?.geometry?.coordinates || route.geometry.coordinates.length < 2) return null

    const transform = buildSimilarityTransform(from, to)
    const points: RoutePoint[] = route.geometry.coordinates.map(([lng, lat]) => {
      const { x, y } = transform({ lat, lng })
      return { lat, lng, x, y }
    })

    const distanceKm = route.distance > 0 ? route.distance / 1000 : haversineKm(from.lat, from.lng, to.lat, to.lng)

    return {
      points,
      distanceKm,
      durationTicks: durationTicksFromKm(distanceKm),
      source: 'OSRM',
    }
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
  }
}

const routeCache = new Map<string, RoutePath>()
const inflightRequests = new Map<string, Promise<RoutePath | null>>()

function routeCacheKey(from: GeoSvgPoint, to: GeoSvgPoint): string {
  return `${from.lat.toFixed(4)},${from.lng.toFixed(4)}->${to.lat.toFixed(4)},${to.lng.toFixed(4)}`
}

/** Returns an already-cached real route for this pickup/dropoff pair, if any
 * order has previously resolved one — lets a fresh order created for the
 * same two locations reuse the same fetch instantly. */
export function getCachedRoute(from: GeoSvgPoint, to: GeoSvgPoint): RoutePath | undefined {
  return routeCache.get(routeCacheKey(from, to))
}

/** Resolves (and caches) a real OSRM route for one order leg, once per
 * distinct location pair, de-duping concurrent requests for the same pair. */
export function resolveDynamicRoute(from: GeoSvgPoint, to: GeoSvgPoint): Promise<RoutePath | null> {
  const key = routeCacheKey(from, to)
  const cached = routeCache.get(key)
  if (cached) return Promise.resolve(cached)

  const existing = inflightRequests.get(key)
  if (existing) return existing

  const promise = fetchOsrmRoute(from, to).then((route) => {
    inflightRequests.delete(key)
    if (route) routeCache.set(key, route)
    return route
  })
  inflightRequests.set(key, promise)
  return promise
}

/** Test/demo hook: lets Playwright / manual QA force the OSRM lookup to
 * behave as if the routing service were unreachable, to verify the
 * synthetic fallback still works end-to-end without needing to actually
 * sever network access. */
let forceOfflineForTesting = false
export function setRoutingForcedOffline(value: boolean): void {
  forceOfflineForTesting = value
}
export function isRoutingForcedOffline(): boolean {
  return forceOfflineForTesting
}

// Exposed on `window` so QA/Playwright can flip this from devtools/console
// (`window.__setRoutingOffline(true)`) to verify the synthetic fallback path
// without needing to actually sever the sandbox's network access.
if (typeof window !== 'undefined') {
  ;(window as unknown as { __setRoutingOffline?: typeof setRoutingForcedOffline }).__setRoutingOffline = setRoutingForcedOffline
}
