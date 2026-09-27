import { AdaptiveDpr, Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { scrollState, useStore } from '../store'
import { CameraRig } from './CameraRig'
import { City, Road } from './City'
import { FleetMap } from './FleetMap'
import { JourneyVehicle } from './JourneyVehicle'
import { RouteSystem } from './Route'
import { Studio } from './Studio'
import { VehiclePlaza } from './VehiclePlaza'
import { WhyObjects } from './WhyObjects'
import { WORLD } from './world'

function Particles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null)
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 160
      pos[i * 3 + 1] = Math.random() * 40
      pos[i * 3 + 2] = THREE.MathUtils.lerp(WORLD.roadFrom, WORLD.roadTo, Math.random())
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [count])
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.02) * 0.05
      ref.current.position.y = Math.sin(clock.elapsedTime * 0.15) * 0.8
    }
  })
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial size={0.14} color="#9fb0ff" transparent opacity={0.45} sizeAttenuation depthWrite={false} />
    </points>
  )
}

/** Everything that lives in the main city world (hero → journey). */
function CityWorld() {
  const root = useRef<THREE.Group>(null)
  const quality = useStore((s) => s.quality)
  useFrame(() => {
    if (root.current) root.current.visible = scrollState.p.fleet < 0.05
  })
  return (
    <group ref={root}>
      <City />
      <Road />
      <RouteSystem />
      <JourneyVehicle />
      <VehiclePlaza />
      {quality !== 'low' && <Particles count={quality === 'high' ? 700 : 300} />}
      <directionalLight position={[-40, 60, 20]} intensity={1.1} color="#b7c4ff" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003}>
        <orthographicCamera attach="shadow-camera" args={[-40, 40, 40, -40, 1, 200]} />
      </directionalLight>
      <hemisphereLight args={['#2a3350', '#05060a', 0.8]} />
    </group>
  )
}

function Ready() {
  const setReady = useStore((s) => s.setReady)
  const frames = useRef(0)
  useFrame(() => {
    frames.current++
    if (frames.current === 2) setReady(true)
  })
  return null
}

function SceneBackground() {
  const { scene } = useThree()
  const fog = useMemo(() => new THREE.FogExp2('#06080d', 0.0065), [])
  useEffect(() => {
    scene.background = new THREE.Color('#06080d')
    scene.fog = fog
    return () => {
      scene.fog = null
    }
  }, [scene, fog])
  useFrame(() => {
    // the studio and fleet map read better with thinner fog
    const a = scrollState.active
    fog.density = a === 'showcase' || a === 'outro' ? 0.012 : a === 'fleet' || a === 'why' ? 0.004 : 0.0065
  })
  return null
}

export default function Scene() {
  const quality = useStore((s) => s.quality)
  const setQuality = useStore((s) => s.setQuality)
  const isMobile = useStore((s) => s.isMobile)
  const [dpr, setDpr] = useState<[number, number]>(quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [0.75, 1])

  useEffect(() => {
    setDpr(quality === 'high' ? [1, 2] : quality === 'medium' ? [1, 1.5] : [0.75, 1])
  }, [quality])

  return (
    <Canvas
      className="gl"
      dpr={dpr}
      shadows={quality !== 'low'}
      gl={{ antialias: quality !== 'low', powerPreference: 'high-performance', alpha: false, stencil: false }}
      camera={{ fov: 36, near: 0.1, far: 900, position: [6.5, 2.1, 7.5] }}
      eventPrefix="client"
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <PerformanceMonitor
        onDecline={() => {
          if (quality === 'high') setQuality('medium')
          else if (quality === 'medium') setQuality('low')
        }}
        flipflops={2}
      />
      <AdaptiveDpr pixelated={false} />
      <SceneBackground />
      <CameraRig />
      <Suspense fallback={null}>
        <Environment resolution={quality === 'high' ? 256 : 128} frames={1}>
          <Lightformer intensity={2.2} rotation-x={Math.PI / 2} position={[0, 6, 0]} scale={[14, 2, 1]} color="#dfe6ff" />
          <Lightformer intensity={1.2} rotation-y={Math.PI / 2} position={[-8, 2, 0]} scale={[8, 3, 1]} color="#a7b6ff" />
          <Lightformer intensity={0.9} rotation-y={-Math.PI / 2} position={[8, 2, 0]} scale={[8, 3, 1]} color="#f4e9c8" />
          <Lightformer intensity={0.4} position={[0, 2, -10]} scale={[20, 6, 1]} color="#5b6b8c" />
        </Environment>
      </Suspense>
      <CityWorld />
      <FleetMap />
      <WhyObjects />
      <Studio />
      <Ready />
      {quality === 'high' && !isMobile && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.55} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.75} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
