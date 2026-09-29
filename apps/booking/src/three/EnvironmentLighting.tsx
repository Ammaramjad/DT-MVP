import { Environment } from '@react-three/drei'
import { Suspense } from 'react'
export function EnvironmentLighting({night=false}:{night?:boolean}) { return <>
  <color attach="background" args={[night?'#111611':'#d8d1c3']}/><fog attach="fog" args={[night?'#111611':'#d8d1c3',16,52]}/>
  <hemisphereLight args={[night?'#d8dccd':'#fff8e9','#292c25',night?.8:1.5]}/><directionalLight castShadow position={[9,14,6]} intensity={night?1.8:3} color="#fff0d1"/>
  <Suspense fallback={null}><Environment files={`${import.meta.env.BASE_URL}hdr/sky_1k.hdr`} environmentIntensity={night?.65:1}/></Suspense>
</> }
