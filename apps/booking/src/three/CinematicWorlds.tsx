import { AdaptiveDpr, ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { VehicleId } from '../lib/data'
import { VehicleAsset } from './VehicleAsset'

const HDR = `${import.meta.env.BASE_URL}hdr/sky_1k.hdr`

function CinematicCamera({ mode = 0 }: { mode?: number }) {
  const { camera } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock, pointer }, dt) => {
    const shots = [[8.5, 3.1, 9], [6, 4.4, 7], [10, 7.5, 10], [4.8, 8.5, 10]]
    const shot = shots[mode] ?? shots[0]
    target.set(shot[0] + pointer.x * .45, shot[1] + pointer.y * .2, shot[2])
    camera.position.lerp(target, 1 - Math.exp(-dt * 2.1))
    camera.lookAt(0, mode > 1 ? .2 : .7, 0)
    camera.rotation.z += Math.sin(clock.elapsedTime * .18) * .00006
  })
  return null
}

function HeroDistrict() {
  const car = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (car.current) car.current.position.z = Math.sin(clock.elapsedTime * .28) * .15 })
  return <>
    <fog attach="fog" args={['#090b0a', 13, 48]} />
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[90, 90]} /><meshStandardMaterial color="#101310" roughness={.92} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position-y={.012}><planeGeometry args={[8.5, 70]} /><meshStandardMaterial color="#20221f" roughness={.98} /></mesh>
    {[-2.1, 2.1].map(x => <mesh key={x} rotation-x={-Math.PI / 2} position={[x,.025,0]}><planeGeometry args={[.07,70]} /><meshBasicMaterial color="#c8b684" /></mesh>)}
    {[-1,1].flatMap(side => Array.from({length:7},(_,i) => <group key={`${side}-${i}`} position={[side*(7+i%3*1.5),0,-24+i*8]}>
      <mesh position-y={2.2} castShadow><boxGeometry args={[5+i%2*1.5,4.4+i%3*1.8,5]} /><meshPhysicalMaterial color={i%2?'#323632':'#4a4b44'} metalness={.62} roughness={.27} /></mesh>
      <mesh position={[side>0?-2.51:2.51,2.25,0]} rotation-y={Math.PI/2}><planeGeometry args={[4.2,3.4]} /><meshPhysicalMaterial color="#789087" roughness={.12} metalness={.68} /></mesh>
      {Array.from({length:3},(_,w)=><mesh key={w} position={[side>0?-2.53:2.53,1.35+w*.9,-1.3]} rotation-y={Math.PI/2}><planeGeometry args={[.35,.08]} /><meshBasicMaterial color="#d4c08f" /></mesh>)}
    </group>))}
    <group ref={car} position={[.3,0,1.2]} rotation-y={-.22}><VehicleAsset vehicleId="premium" /></group>
    <ContactShadows position={[0,.02,0]} opacity={.75} scale={18} blur={2.5} />
  </>
}

export function HeroWorld() {
  return <Canvas aria-label="Interactive 3D executive vehicle in a future Taiwan district" shadows dpr={[.75,1.7]} camera={{position:[8.5,3.1,9],fov:35}} gl={{antialias:true,powerPreference:'high-performance'}}>
    <color attach="background" args={['#090b0a']} /><CinematicCamera /><ambientLight intensity={.34}/><directionalLight castShadow position={[6,11,6]} intensity={3.2} color="#f5e6c8" shadow-mapSize={[1024,1024]}/><spotLight position={[-8,7,2]} intensity={55} angle={.42} penumbra={1} color="#5d9b82"/>
    <Suspense fallback={null}><Environment files={HDR} environmentIntensity={.72}/><HeroDistrict/></Suspense><AdaptiveDpr pixelated={false}/>
  </Canvas>
}

function Network({ dense=false }:{dense?:boolean}) {
  const group=useRef<THREE.Group>(null)
  const paths=useMemo(()=>Array.from({length:dense?9:5},(_,i)=>new THREE.CatmullRomCurve3([
    new THREE.Vector3(-7, .05, -5+i*1.2),new THREE.Vector3(-2+i*.25,.05,(i%3)-2),new THREE.Vector3(2-i*.18,.05,2-i*.45),new THREE.Vector3(7,.05,-2+i*.75)
  ])),[dense])
  useFrame(({clock})=>{if(group.current)group.current.rotation.y=Math.sin(clock.elapsedTime*.14)*.045})
  return <group ref={group}>{paths.map((curve,i)=><group key={i}><mesh><tubeGeometry args={[curve,48,.025,6,false]}/><meshBasicMaterial color={i%2?'#69aa91':'#c5ad76'}/></mesh>{[.08,.5,.92].map(t=>{const p=curve.getPoint(t);return <mesh key={t} position={p}><sphereGeometry args={[.09,10,8]}/><meshBasicMaterial color="#eee4d0"/></mesh>})}</group>)}</group>
}

function BusinessScene({mode}:{mode:number}) {
  const vehicle:VehicleId=mode===1?'van':mode===0?'premium':'business'
  return <>
    <fog attach="fog" args={['#0b0e0c',12,38]}/><CinematicCamera mode={mode}/>
    <mesh rotation-x={-Math.PI/2} receiveShadow><planeGeometry args={[50,50]}/><meshStandardMaterial color="#111411" roughness={mode===0?.22:.78} metalness={mode===0?.55:.08}/></mesh>
    {mode<2&&<><VehicleAsset vehicleId={vehicle} position={[0,0,0]} rotation-y={-.42}/><ContactShadows opacity={.8} scale={16} blur={2}/></>}
    {mode===1&&Array.from({length:7},(_,i)=><mesh key={i} position={[-3+i,1.1,-2.8]}><capsuleGeometry args={[.16,.45,6,10]}/><meshStandardMaterial color={i<5?'#c6b27f':'#373d38'}/></mesh>)}
    {mode===2&&<><Network/><mesh rotation-x={-Math.PI/2} position-y={-.01}><ringGeometry args={[4.2,4.24,90]}/><meshBasicMaterial color="#5f947f" transparent opacity={.7}/></mesh></>}
    {mode===3&&<Network dense/>}
    <ambientLight intensity={.5}/><spotLight castShadow position={[5,10,4]} intensity={60} angle={.5} penumbra={1} color={mode>1?'#79b49c':'#ead9b7'}/>
  </>
}

export function BusinessWorld({mode}:{mode:number}) { return <Canvas aria-label="Interactive 3D business mobility visualization" shadows dpr={[.75,1.5]} camera={{position:[8,4,9],fov:38}}><color attach="background" args={['#0b0e0c']}/><Suspense fallback={null}><Environment files={HDR} environmentIntensity={.55}/><BusinessScene mode={mode}/></Suspense><OrbitControls enablePan={false} enableZoom={false} target={[0,.5,0]} minPolarAngle={.8} maxPolarAngle={1.45}/><AdaptiveDpr pixelated={false}/></Canvas> }

export function AboutWorld(){return <Canvas aria-label="Fleet OS operational network visualization" dpr={[.75,1.4]} camera={{position:[0,8,11],fov:40}}><color attach="background" args={['#e9e3d6']}/><ambientLight intensity={2}/><Network dense/><OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={.25}/></Canvas>}
