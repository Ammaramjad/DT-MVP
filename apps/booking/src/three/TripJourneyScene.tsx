import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CatmullRomCurve3, Group, Vector3 } from 'three'
import type { Route } from '../lib/routing'
import type { VehicleId } from '../lib/data'
import { VehicleAsset } from './VehicleAsset'
export function TripJourneyScene({route,vehicle,progress}:{route:Route;vehicle:VehicleId;progress:number}){const ref=useRef<Group>(null);const curve=useMemo(()=>new CatmullRomCurve3(route.geometry.map(([x,z])=>new Vector3(x,.04,z)),false,'catmullrom',.2),[route]);useFrame(()=>{if(!ref.current)return;const t=Math.min(.999,Math.max(0,progress));const p=curve.getPointAt(t),q=curve.getPointAt(Math.min(.999,t+.006));ref.current.position.copy(p);ref.current.rotation.y=Math.atan2(q.x-p.x,q.z-p.z)});return <group ref={ref}><VehicleAsset vehicleId={vehicle}/></group>}
