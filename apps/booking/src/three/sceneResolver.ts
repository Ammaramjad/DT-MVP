import type { Place, ServiceId, VehicleId } from '../lib/data'
import type { Route } from '../lib/routing'
import { LIGHT_PROFILES, resolveTimeOfDay, type LightProfile, type WeatherState } from '../scenes/timeOfDay'
import { selectRouteWorld, type RouteWorld } from '../routes/routeWorlds'
import type { VehicleClassId } from '../vehicles/vehicleRegistry'

export type SceneInput = {
  service: ServiceId
  bookingStep: number
  pickup: Place
  destination: Place
  route: Route
  date: string
  time: string
  passengers: number
  luggage: number
  vehicle: VehicleId
  vehicleClassId: VehicleClassId
  vehicleModelId: VehicleId
  options: string[]
  tripStatus: 'planning' | 'approach' | 'pickup' | 'travelling' | 'arrived'
  weather?: WeatherState
}

export type ScenePlan = {
  world: 'airport-arrival' | 'airport-departure' | 'urban' | 'rental-studio' | 'executive'
  worldLabel: string
  phase: 'service' | 'route' | 'studio'
  camera: 'service' | 'route' | 'studio'
  marker: Place
  routeWorld: RouteWorld
  lighting: LightProfile
  weather: WeatherState
  pedestrian: 'terminal-exit' | 'station-exit' | 'building-exit' | null
  luggageVisible: number
  driverVisible: boolean
}

/** The single deterministic boundary between the complete booking state and its WebGL presentation. */
export function resolveScene(input: SceneInput): ScenePlan {
  const world = input.service === 'airport-to-location' ? 'airport-arrival'
    : input.service === 'location-to-airport' ? 'airport-departure'
      : input.service === 'self-drive' ? 'rental-studio'
        : input.service === 'chauffeur' ? 'executive' : 'urban'
  const phase = input.service === 'self-drive' ? 'studio' : input.bookingStep >= 2 ? 'route' : 'service'
  const time = resolveTimeOfDay(input.time)
  const labels = { 'airport-arrival':'Terminal arrivals', 'airport-departure':'Airport departures', urban:'Dynamic city transfer', 'rental-studio':'Automotive studio', executive:'Executive mobility' }
  return {
    world,
    worldLabel: labels[world],
    phase,
    camera: phase,
    marker: input.bookingStep >= 2 ? input.destination : input.pickup,
    routeWorld: selectRouteWorld(input.pickup, input.destination, input.service),
    lighting: LIGHT_PROFILES[time],
    weather: input.weather ?? 'clear',
    pedestrian: input.pickup.type === 'airport' ? 'terminal-exit' : input.pickup.type === 'station' ? 'station-exit' : input.service === 'chauffeur' ? 'building-exit' : null,
    luggageVisible: Math.min(input.luggage, 4),
    driverVisible: input.service !== 'self-drive',
  }
}
