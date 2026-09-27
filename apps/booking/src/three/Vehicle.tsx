import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { forwardRef, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { VehicleId } from '../lib/data'

type Dim = { L: number; W: number; H: number; cabL: number; cabH: number; cabOff: number; wheel: number; nose: number }

const DIMS: Record<VehicleId, Dim> = {
  economy: { L: 3.9, W: 1.75, H: 0.62, cabL: 2.2, cabH: 0.6, cabOff: -0.15, wheel: 0.33, nose: 0.9 },
  comfort: { L: 4.6, W: 1.85, H: 0.62, cabL: 2.5, cabH: 0.56, cabOff: -0.25, wheel: 0.35, nose: 1.05 },
  business: { L: 5.1, W: 1.9, H: 0.64, cabL: 2.8, cabH: 0.56, cabOff: -0.3, wheel: 0.37, nose: 1.15 },
  premium: { L: 5.3, W: 1.98, H: 0.6, cabL: 2.6, cabH: 0.52, cabOff: -0.45, wheel: 0.39, nose: 1.35 },
  van: { L: 5.0, W: 1.92, H: 0.9, cabL: 3.8, cabH: 0.9, cabOff: -0.35, wheel: 0.36, nose: 0.6 },
}

export type VehicleProps = {
  variant: VehicleId
  color?: string
  lights?: boolean
  /** ref to a number updated each frame: wheel spin speed */
  speedRef?: React.MutableRefObject<number>
  paintRoughness?: number
  scale?: number
}

const glassMat = new THREE.MeshPhysicalMaterial({
  color: '#0d1522',
  roughness: 0.08,
  metalness: 0.2,
  transparent: true,
  opacity: 0.85,
  envMapIntensity: 1.6,
})
const tireMat = new THREE.MeshStandardMaterial({ color: '#0a0b0e', roughness: 0.95 })
const rimMat = new THREE.MeshStandardMaterial({ color: '#c8cdd8', roughness: 0.25, metalness: 0.9 })
const trimMat = new THREE.MeshStandardMaterial({ color: '#0b0d12', roughness: 0.5, metalness: 0.6 })
const headMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#dfe9ff', emissiveIntensity: 4 })
const tailMat = new THREE.MeshStandardMaterial({ color: '#ff3b3b', emissive: '#ff2a2a', emissiveIntensity: 3 })

function Wheel({ x, z, r, spin }: { x: number; z: number; r: number; spin: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.x -= spin.current * dt * 6
  })
  return (
    <group position={[x, r, z]}>
      <group ref={ref} rotation={[0, 0, Math.PI / 2]}>
        <mesh material={tireMat} castShadow>
          <cylinderGeometry args={[r, r, 0.26, 28]} />
        </mesh>
        <mesh material={rimMat} position={[0, x > 0 ? 0.04 : -0.04, 0]}>
          <cylinderGeometry args={[r * 0.62, r * 0.62, 0.2, 20]} />
        </mesh>
      </group>
    </group>
  )
}

export const Vehicle = forwardRef<THREE.Group, VehicleProps>(function Vehicle(
  { variant, color = '#5b6b8c', lights = true, speedRef, paintRoughness = 0.18, scale = 1 },
  ref,
) {
  const d = DIMS[variant]
  const fallbackSpin = useRef(0)
  const spin = speedRef ?? fallbackSpin
  const paint = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: paintRoughness,
        metalness: 0.55,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.4,
      }),
    [color, paintRoughness],
  )
  const wheelY = d.wheel
  const bodyY = wheelY + d.H / 2 - 0.05
  const axle = d.L / 2 - d.nose * 0.75
  return (
    <group ref={ref} scale={scale}>
      {/* body */}
      <RoundedBox args={[d.W, d.H, d.L]} radius={0.12} smoothness={4} position={[0, bodyY, 0]} material={paint} castShadow receiveShadow />
      {/* cabin */}
      <RoundedBox
        args={[d.W * 0.86, d.cabH, d.cabL]}
        radius={0.16}
        smoothness={4}
        position={[0, bodyY + d.H / 2 + d.cabH / 2 - 0.08, d.cabOff]}
        material={glassMat}
        castShadow
      />
      {/* roof plate */}
      <RoundedBox args={[d.W * 0.72, 0.05, d.cabL * 0.55]} radius={0.02} position={[0, bodyY + d.H / 2 + d.cabH - 0.06, d.cabOff]} material={paint} />
      {/* sills */}
      <mesh material={trimMat} position={[0, wheelY - 0.02, 0]}>
        <boxGeometry args={[d.W * 0.98, 0.14, d.L * 0.96]} />
      </mesh>
      {/* headlights */}
      <mesh material={headMat} position={[d.W * 0.32, bodyY + 0.05, -d.L / 2 + 0.01]}>
        <boxGeometry args={[0.36, 0.08, 0.05]} />
      </mesh>
      <mesh material={headMat} position={[-d.W * 0.32, bodyY + 0.05, -d.L / 2 + 0.01]}>
        <boxGeometry args={[0.36, 0.08, 0.05]} />
      </mesh>
      {/* taillight bar */}
      <mesh material={tailMat} position={[0, bodyY + 0.08, d.L / 2 - 0.01]}>
        <boxGeometry args={[d.W * 0.8, 0.06, 0.05]} />
      </mesh>
      {lights && (
        <spotLight
          position={[0, bodyY, -d.L / 2]}
          target-position={[0, 0, -d.L / 2 - 12]}
          angle={0.55}
          penumbra={0.8}
          intensity={35}
          distance={30}
          color="#dfe9ff"
        />
      )}
      <Wheel x={d.W / 2 - 0.05} z={-axle} r={wheelY} spin={spin} />
      <Wheel x={-d.W / 2 + 0.05} z={-axle} r={wheelY} spin={spin} />
      <Wheel x={d.W / 2 - 0.05} z={axle} r={wheelY} spin={spin} />
      <Wheel x={-d.W / 2 + 0.05} z={axle} r={wheelY} spin={spin} />
    </group>
  )
})
