import type { LocationRef, RoutePath, RoutePoint } from '../types'

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Deterministic PRNG (mulberry32) so routes look consistent across re-renders
// but vary between different order/location pairs.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  }
  return h
}

interface XY {
  x: number
  y: number
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Uniform Catmull-Rom spline through control points, sampled into `numSamples`
// evenly spaced points (inclusive of both endpoints).
function catmullRom(points: XY[], numSamples: number): XY[] {
  if (points.length < 2) return points
  const pts = [points[0], ...points, points[points.length - 1]]
  const segments = points.length - 1
  const out: XY[] = []

  for (let i = 0; i < numSamples; i++) {
    const t = (i / (numSamples - 1)) * segments
    const segIndex = Math.min(Math.floor(t), segments - 1)
    const localT = t - segIndex

    const p0 = pts[segIndex]
    const p1 = pts[segIndex + 1]
    const p2 = pts[segIndex + 2]
    const p3 = pts[segIndex + 3]

    const t2 = localT * localT
    const t3 = t2 * localT

    const x =
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * localT +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3)
    const y =
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * localT +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)

    out.push({ x, y })
  }
  return out
}

function buildBendControlPoints(a: XY, b: XY, rand: () => number, curviness: number): XY[] {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len

  const bendCount = 2
  const points: XY[] = [a]
  for (let i = 1; i <= bendCount; i++) {
    const t = i / (bendCount + 1)
    const base = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
    const wobble = (rand() - 0.5) * 2 * curviness * len * 0.18
    const sway = Math.sin(t * Math.PI) * curviness * len * 0.12
    const offset = wobble + sway * (i === 1 ? 1 : -0.6)
    points.push({ x: base.x + nx * offset, y: base.y + ny * offset })
  }
  points.push(b)
  return points
}

const SAMPLE_COUNT = 56

export function buildRoutePath(from: LocationRef, to: LocationRef, seedKey: string): RoutePath {
  const rand = mulberry32(hashSeed(seedKey))
  const curviness = 0.6 + rand() * 0.5

  const geoControls = buildBendControlPoints(
    { x: from.lat, y: from.lng },
    { x: to.lat, y: to.lng },
    rand,
    curviness * 0.02,
  )
  const svgControls = buildBendControlPoints(
    { x: from.svgX, y: from.svgY },
    { x: to.svgX, y: to.svgY },
    rand,
    curviness,
  )

  const geoSamples = catmullRom(geoControls, SAMPLE_COUNT)
  const svgSamples = catmullRom(svgControls, SAMPLE_COUNT)

  const points: RoutePoint[] = geoSamples.map((g, i) => ({
    lat: g.x,
    lng: g.y,
    x: svgSamples[i].x,
    y: svgSamples[i].y,
  }))

  let distanceKm = 0
  for (let i = 1; i < points.length; i++) {
    distanceKm += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
  }

  const durationTicks = Math.max(7, Math.min(24, Math.round(6 + distanceKm * 0.42)))

  return { points, distanceKm, durationTicks }
}

export function evaluateRoute(path: RoutePath, progress: number): RoutePoint {
  const p = Math.max(0, Math.min(1, progress))
  const n = path.points.length
  const t = p * (n - 1)
  const i0 = Math.floor(t)
  const i1 = Math.min(n - 1, i0 + 1)
  const localT = t - i0
  const a = path.points[i0]
  const b = path.points[i1]
  return {
    lat: lerp(a.lat, b.lat, localT),
    lng: lerp(a.lng, b.lng, localT),
    x: lerp(a.x, b.x, localT),
    y: lerp(a.y, b.y, localT),
  }
}

export function remainingDistanceKm(path: RoutePath, progress: number): number {
  return Math.max(0, path.distanceKm * (1 - progress))
}
