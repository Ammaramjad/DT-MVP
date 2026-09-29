import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { Suspense, useRef } from 'react'
import { Group } from 'three'
import { CityArchitecture } from './Architecture'
import { RoadSurface } from './RoadSystem'
import { VehicleAsset } from './VehicleAsset'

function MovingFleet(){const car=useRef<Group>(null);useFrame(({clock})=>{if(!car.current)return;car.current.position.z=5-((clock.elapsedTime*2.3)%18);car.current.rotation.y=Math.PI});return <group ref={car} position={[0,0,3]}><VehicleAsset vehicleId="premium"/></group>}
export function HeroExperience(){return <Canvas shadows dpr={[.75,1.5]} camera={{position:[9,5.2,11],fov:38}} gl={{antialias:true,powerPreference:'high-performance'}}><color attach="background" args={['#0a0c0d']}/><fog attach="fog" args={['#0a0c0d',18,45]}/><ambientLight intensity={.65}/><directionalLight castShadow position={[8,14,8]} intensity={3.5} color="#fff0d1"/><pointLight position={[-5,4,4]} intensity={16} color="#48e0bb"/><Suspense fallback={null}><Environment files="/hdr/sky_1k.hdr" environmentIntensity={.65}/><RoadSurface length={48}/><CityArchitecture city="Taipei"/><MovingFleet/></Suspense></Canvas>}
