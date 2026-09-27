import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { VEHICLES } from '../lib/data'
import { scrollState, useStore } from '../store'
import { rigState } from './CameraRig'
import { Vehicle } from './Vehicle'
import { JOURNEY_STAGES } from '../lib/content'
import { WORLD, range, routeCurve, smooth } from './world'

const approach = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(1.4, 0, -28),
  new THREE.Vector3(2.4, 0, -52),
  WORLD.pickup.clone().add(new THREE.Vector3(-3.2, 0, 3.5)),
])

/**
 * The customer's vehicle. It is the hero car at the start, waits at the
 * origin while pickup/destination are defined, then drives the whole route
 * during the FROM REQUEST TO ARRIVAL section. Stage markers along the
 * road light up as the car reaches them.
 */
export function JourneyVehicle() {
  const vehicle = useStore((s) => s.booking.vehicle)
  const spec = VEHICLES.find((x) => x.id === vehicle) ?? VEHICLES[1]
  const g = useRef<THREE.Group>(null)
  const speed = useRef(0)
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), stage: -1, lastT: 0 }), [])
  const markers = useRef<THREE.Group>(null)

  useFrame((_, dt) => {
    const p = scrollState.p.journey
    const grp = g.current
    if (!grp) return
    let t = 0 // 0 = origin, 1 = pickup, 2 = destination
    if (p >= 0) {
      const a = range(p, 0.2, 0.42) // approach
      const b = range(p, 0.44, 0.9) // route
      t = a < 1 ? smooth(a) : 1 + smooth(b)
    }
    if (t <= 1) {
      approach.getPointAt(Math.min(0.9999, t), tmp.a)
      approach.getPointAt(Math.min(1, t + 0.01), tmp.b)
    } else {
      const k = Math.min(0.9999, t - 1)
      routeCurve.getPointAt(k, tmp.a)
      routeCurve.getPointAt(Math.min(1, k + 0.01), tmp.b)
      tmp.a.y = 0
      tmp.b.y = 0
    }
    // keep the car on the curb side at the pickup, curve is at y 0.1
    tmp.a.y = 0
    grp.position.copy(tmp.a)
    const dir = tmp.b.sub(tmp.a)
    if (dir.lengthSq() > 1e-6) {
      dir.normalize()
      const yaw = Math.atan2(dir.x, dir.z) + Math.PI
      grp.rotation.y = THREE.MathUtils.damp(grp.rotation.y, yaw, 8, dt)
      rigState.journeyDir.copy(dir)
    }
    rigState.journeyPos.copy(grp.position)
    speed.current = Math.min(6, Math.abs(t - tmp.lastT) / Math.max(dt, 1e-3) * 40)
    tmp.lastT = t

    // Which stage is active?
    let stage = 0
    for (let i = 0; i < JOURNEY_STAGES.length; i++) if (p >= JOURNEY_STAGES[i].t - 0.02) stage = i
    if (p < 0) stage = -1
    if (markers.current) {
      markers.current.children.forEach((c, i) => {
        const on = i <= stage
        const m = c as THREE.Group
        m.scale.y = THREE.MathUtils.damp(m.scale.y, on ? 1 : 0.001, 5, dt)
        m.visible = p > -0.2 && p < 1.4
      })
    }
  })

  // Marker positions: book/match at the origin & mid approach, arrive at pickup, travel mid-route, destination.
  const markerPos = useMemo(
    () => [
      new THREE.Vector3(-6, 0, -6),
      approach.getPointAt(0.55).clone().add(new THREE.Vector3(-8, 0, 0)),
      WORLD.pickup.clone().add(new THREE.Vector3(6, 0, 4)),
      routeCurve.getPointAt(0.5).clone().add(new THREE.Vector3(8, 0, 0)),
      WORLD.destination.clone().add(new THREE.Vector3(-7, 0, 4)),
    ],
    [],
  )

  return (
    <group>
      <group ref={g}>
        <Vehicle variant={spec.id} color={spec.color} speedRef={speed} lights />
      </group>
      <group ref={markers}>
        {markerPos.map((pos, i) => (
          <group key={i} position={pos} scale={[1, 0.001, 1]}>
            <mesh position={[0, 6, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 12, 6]} />
              <meshBasicMaterial color={i === 4 ? '#f4e9c8' : '#a7b6ff'} toneMapped={false} transparent opacity={0.9} />
            </mesh>
            <mesh position={[0, 12.4, 0]}>
              <octahedronGeometry args={[0.7, 0]} />
              <meshBasicMaterial color={i === 4 ? '#f4e9c8' : '#dfe6ff'} toneMapped={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
              <ringGeometry args={[1.4, 1.7, 40]} />
              <meshBasicMaterial color={i === 4 ? '#f4e9c8' : '#a7b6ff'} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
