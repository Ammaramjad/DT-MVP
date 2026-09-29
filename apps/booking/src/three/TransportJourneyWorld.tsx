import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CatmullRomCurve3, Group, MathUtils, Vector3 } from 'three'
import type { Place, ServiceId, VehicleId } from '../lib/data'
import type { Route } from '../lib/routing'
import { AirportTerminal, CityArchitecture } from './Architecture'
import { RoadSurface, RouteRibbon } from './RoadSystem'
import { PickupMarker } from './ServiceWorlds'
import { VehicleAsset } from './VehicleAsset'

const duration=16
export function TransportJourneyWorld({service,pickup,route,vehicle,reducedMotion=false}:{service:ServiceId;pickup:Place;route:Route;vehicle:VehicleId;reducedMotion?:boolean}){
  const car=useRef<Group>(null),{camera}=useThree()
  const curve=useMemo(()=>new CatmullRomCurve3(route.geometry.map(([x,z])=>new Vector3(x,.08,z)),false,'catmullrom',.25),[route])
  const isDeparture=service==='location-to-airport',isArrival=service==='airport-to-location'
  useFrame(({clock},delta)=>{
    if(!car.current)return
    const raw=reducedMotion?.18:(clock.elapsedTime%duration)/duration
    // Establish, approach, dwell for pickup, then travel and dwell at destination.
    const t=raw<.12?0:raw<.3?MathUtils.smoothstep(raw,.12,.3)*.2:raw<.4?.2:raw<.86?.2+MathUtils.smoothstep(raw,.4,.86)*.8:1
    const p=curve.getPointAt(Math.min(.999,t)),q=curve.getPointAt(Math.min(.999,t+.012))
    car.current.position.lerp(p,Math.min(1,delta*6));car.current.rotation.y=Math.atan2(q.x-p.x,q.z-p.z)
    const overview=raw>.34&&raw<.72
    const target=overview?new Vector3(p.x+7,9,p.z+10):new Vector3(p.x+5,3.2,p.z+7)
    camera.position.lerp(target,Math.min(1,delta*1.8));camera.lookAt(p.x,overview?0:1,p.z)
  })
  const start=route.geometry[0],end=route.geometry.at(-1)!
  return <group>
    <RoadSurface length={52} width={8}/><RouteRibbon route={route}/>
    {isArrival?<group position={[start[0],0,start[1]-7]}><AirportTerminal/></group>:<CityArchitecture city={pickup.city}/>}
    {isDeparture?<group position={[end[0],0,end[1]-8]}><AirportTerminal departures/></group>:isArrival?<group position={[end[0],0,end[1]-8]}><CityArchitecture city={route.destination.city}/></group>:null}
    <PickupMarker position={[start[0],0,start[1]]}/><PickupMarker position={[end[0],0,end[1]]}/>
    <group ref={car}><VehicleAsset vehicleId={vehicle}/></group>
  </group>
}
