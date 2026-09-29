import { useMemo } from 'react'
import { PLACES, SERVICES } from '../../lib/data'
import { createDemoRoute } from '../../lib/routing'
import { selectRouteWorld } from '../../routes/routeWorlds'
import { resolveScene } from '../../three/sceneResolver'
import { FleetScene } from '../../three/FleetScene'
import { useStore } from '../../store'
import type { BookingStep } from './bookingSteps'

export function SceneViewport({ step }: { step: BookingStep }) {
  const booking = useStore(state => state.booking)
  const origin = booking.pickup ?? PLACES[0]
  const destination = booking.destination ?? PLACES[3]
  const route = useMemo(() => createDemoRoute(origin, destination), [origin, destination])
  const world = useMemo(() => selectRouteWorld(origin, destination, booking.service), [origin, destination, booking.service])
  const scene = resolveScene({ ...booking, bookingStep: step, pickup: origin, destination, route, tripStatus: 'planning' })
  const serviceIndex = SERVICES.findIndex(service => service.id === booking.service)
  return <div className="scene-viewport">
    <div className="scene-label"><span>LIVE WORLD · 0{serviceIndex + 1}</span><h3>{scene.worldLabel}</h3><p>{origin.area} → {destination.area}</p></div>
    <FleetScene service={booking.service} pickup={scene.marker} vehicle={booking.vehicleModelId} route={route} phase={scene.phase} night={scene.lighting.state === 'night' || scene.lighting.state === 'evening'} progress={step >= 8 ? .92 : Math.max(.08, step / 9)} />
    <div className="scene-data"><span>{world.label}</span><span>{scene.lighting.state}</span><span>{route.distanceKm.toFixed(0)} KM</span></div>
    <div className="orbit-hint"><i>360°</i><span>DRAG TO EXPLORE</span></div>
  </div>
}
