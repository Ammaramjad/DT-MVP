import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { scrollState, useStore } from '../store'
import { range, routeCurve, smooth } from './world'

const pinMat = new THREE.MeshStandardMaterial({ color: '#f4f6ff', emissive: '#a7b6ff', emissiveIntensity: 1.2, roughness: 0.3, metalness: 0.4 })
const destMat = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#f4e9c8', emissiveIntensity: 1.1, roughness: 0.3, metalness: 0.4 })
const ringMat = new THREE.MeshBasicMaterial({ color: '#a7b6ff', transparent: true, opacity: 0.6, side: THREE.DoubleSide, toneMapped: false })

/** Floating location pin: a cone stem and a sphere head, plus a pulsing ground ring. */
export function Pin({ position, riseRef, gold = false }: { position: THREE.Vector3; riseRef: React.MutableRefObject<number>; gold?: boolean }) {
  const g = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const ring2 = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const r = riseRef.current
    const t = clock.elapsedTime
    if (g.current) {
      g.current.position.set(position.x, THREE.MathUtils.lerp(-9, 0.6 + Math.sin(t * 1.6) * 0.15, smooth(r)), position.z)
      g.current.rotation.y = t * 0.6
      g.current.visible = r > 0.001
    }
    const pulse = (t * 0.6) % 1
    if (ring.current) {
      const s = 1 + pulse * 6
      ring.current.scale.set(s, s, 1)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - pulse) * 0.5 * smooth(r)
    }
    if (ring2.current) {
      const p2 = (pulse + 0.5) % 1
      const s = 1 + p2 * 6
      ring2.current.scale.set(s, s, 1)
      ;(ring2.current.material as THREE.MeshBasicMaterial).opacity = (1 - p2) * 0.5 * smooth(r)
    }
  })
  const mat = gold ? destMat : pinMat
  return (
    <group>
      <group ref={g}>
        <mesh material={mat} position={[0, 1.6, 0]} castShadow>
          <coneGeometry args={[0.9, 3.2, 24, 1, true]} />
        </mesh>
        <mesh material={mat} position={[0, 3.4, 0]} castShadow>
          <sphereGeometry args={[1.05, 32, 24]} />
        </mesh>
        <mesh position={[0, 3.4, 0]}>
          <sphereGeometry args={[0.42, 16, 12]} />
          <meshBasicMaterial color={gold ? '#3a2d10' : '#0b1020'} />
        </mesh>
        <pointLight position={[0, 4, 0]} intensity={gold ? 40 : 60} distance={22} color={gold ? '#f4e9c8' : '#a7b6ff'} />
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[position.x, 0.06, position.z]} material={ringMat.clone()}>
        <ringGeometry args={[0.9, 1.0, 48]} />
      </mesh>
      <mesh ref={ring2} rotation={[-Math.PI / 2, 0, 0]} position={[position.x, 0.06, position.z]} material={ringMat.clone()}>
        <ringGeometry args={[0.9, 1.0, 48]} />
      </mesh>
    </group>
  )
}

/** Illuminated route drawn progressively along the curve. */
export function RouteLine({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const quality = useStore((s) => s.quality)
  const N = quality === 'low' ? 60 : 140
  const dots = useRef<THREE.InstancedMesh>(null)
  const tube = useRef<THREE.Mesh>(null)
  const pts = useMemo(() => routeCurve.getSpacedPoints(N), [N])
  const geom = useMemo(() => new THREE.TubeGeometry(routeCurve, 160, 0.22, 8, false), [])
  const o = useMemo(() => new THREE.Object3D(), [])

  useFrame(({ clock }) => {
    const p = smooth(progressRef.current)
    const visible = Math.floor(p * N)
    const m = dots.current
    if (m) {
      const t = clock.elapsedTime
      for (let i = 0; i < N; i++) {
        const pt = pts[i]
        const on = i <= visible
        const wave = 0.5 + 0.5 * Math.sin(t * 3 - i * 0.35)
        o.position.set(pt.x, on ? 0.35 + wave * 0.25 : -2, pt.z)
        const s = on ? 0.32 + wave * 0.18 : 0.0001
        o.scale.setScalar(s)
        o.updateMatrix()
        m.setMatrixAt(i, o.matrix)
      }
      m.instanceMatrix.needsUpdate = true
    }
    if (tube.current) {
      const g = tube.current.geometry as THREE.TubeGeometry
      const total = g.index ? g.index.count : 0
      g.setDrawRange(0, Math.floor(total * p))
      tube.current.visible = p > 0.002
    }
  })

  return (
    <group>
      <mesh ref={tube} geometry={geom}>
        <meshBasicMaterial color="#8fa3ff" transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <instancedMesh ref={dots} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#dfe6ff" toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

/**
 * Drives pickup/destination pins and the route from scroll state:
 * pin rises during PICKUP, destination + route during DESTINATION.
 * Everything stays visible afterwards for CONFIRM/JOURNEY.
 */
export function RouteSystem() {
  const pickupRise = useRef(0)
  const destRise = useRef(0)
  const route = useRef(0)
  useFrame(() => {
    const p = scrollState.p
    pickupRise.current = p.pickup >= 1 ? 1 : range(p.pickup, 0.05, 0.4)
    destRise.current = p.destination >= 1 ? 1 : range(p.destination, 0.25, 0.6)
    route.current = p.destination >= 1 ? 1 : range(p.destination, 0.35, 0.95)
  })
  return (
    <group>
      <Pin position={routeCurve.getPoint(0)} riseRef={pickupRise} />
      <Pin position={routeCurve.getPoint(1)} riseRef={destRise} gold />
      <RouteLine progressRef={route} />
    </group>
  )
}
