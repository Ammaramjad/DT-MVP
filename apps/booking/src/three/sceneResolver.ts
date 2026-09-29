import type { Place, ServiceId, VehicleId } from '../lib/data'

export type SceneInput = {
  service: ServiceId
  bookingStep: number
  pickup: Place
  destination: Place
  time: string
  vehicle: VehicleId
}

export type ScenePlan = {
  world: 'airport-arrival' | 'airport-departure' | 'urban' | 'rental-studio' | 'executive'
  phase: 'service' | 'route' | 'studio'
  night: boolean
  camera: 'service' | 'route' | 'studio'
  marker: Place
}

/** One deterministic boundary between booking state and the WebGL world. */
export function resolveScene(input: SceneInput): ScenePlan {
  const hour = Number(input.time.slice(0, 2))
  const world = input.service === 'airport-to-location' ? 'airport-arrival'
    : input.service === 'location-to-airport' ? 'airport-departure'
      : input.service === 'self-drive' ? 'rental-studio'
        : input.service === 'chauffeur' ? 'executive' : 'urban'
  const phase = input.service === 'self-drive' ? 'studio' : input.bookingStep >= 2 ? 'route' : 'service'
  return {
    world,
    phase,
    camera: phase,
    night: hour < 6 || hour >= 18,
    marker: input.bookingStep >= 2 ? input.destination : input.pickup,
  }
}
