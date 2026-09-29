import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { VEHICLES, fmtTWD, vehicleFits, type VehicleId } from '../lib/data'
import { scrollToSection } from '../lib/scroll'
import { scrollState, useStore, useTrip } from '../store'
import { Vehicle } from './Vehicle'
import { WORLD, htmlPortal, range, smooth } from './world'

const SLOT_BACK: [number, number][] = [
  [-13.5, -5],
  [-9.5, -7],
  [-4.8, -8.5],
  [4.8, -8.5],
  [9.5, -7],
]

function Turntable({ active }: { active: boolean }) {
  const ring = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (!ring.current) return
    const m = ring.current.material as THREE.MeshBasicMaterial
    m.opacity = THREE.MathUtils.damp(m.opacity, active ? 0.9 : 0.25, 6, dt)
  })
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[3.6, 48]} />
        <meshStandardMaterial color="#d7dbe3" roughness={0.25} metalness={0.7} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[3.5, 3.62, 64]} />
        <meshBasicMaterial color="#4f63e0" transparent opacity={0.25} toneMapped={false} />
      </mesh>
    </group>
  )
}

function PlazaVehicle({ id, index }: { id: VehicleId; index: number }) {
  const spec = VEHICLES[index]
  const selected = useStore((s) => s.booking.vehicle)
  const hovered = useStore((s) => s.hovered)
  const setHovered = useStore((s) => s.setHovered)
  const setBooking = useStore((s) => s.setBooking)
  const isMobile = useStore((s) => s.isMobile)
  const trip = useTrip()
  const available = vehicleFits(spec, trip.passengers, trip.luggage)
  const g = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const light = useRef<THREE.SpotLight>(null)
  const isSel = selected === id
  const isHov = hovered === id
  const tmp = useMemo(() => ({ target: new THREE.Vector3(), entered: 0 }), [])

  useFrame(({ clock }, dt) => {
    const grp = g.current
    if (!grp) return
    const p = scrollState.p.choose
    const enterT = smooth(range(p, 0.42 + index * 0.07, 0.62 + index * 0.07))
    const stay = p >= 1 ? 1 : enterT
    // slot: selected in front-centre, others arranged behind
    let slotX = 0
    let slotZ = 0
    if (!isSel) {
      const others = VEHICLES.filter((x) => x.id !== selected).map((x) => x.id)
      const k = others.indexOf(id)
      slotX = SLOT_BACK[k][0]
      slotZ = SLOT_BACK[k][1]
    }
    if (isMobile) {
      // Mobile: a swipeable row. Selected centred, others parked to the sides.
      const order = VEHICLES.findIndex((x) => x.id === selected)
      slotX = (index - order) * 5.2
      slotZ = isSel ? 0 : -1.2
    }
    tmp.target.set(THREE.MathUtils.lerp(60, slotX, stay), 0, slotZ)
    grp.position.x = THREE.MathUtils.damp(grp.position.x, tmp.target.x, 4.5, dt)
    grp.position.z = THREE.MathUtils.damp(grp.position.z, tmp.target.z, 4.5, dt)
    const s = isSel ? 1 : 0.9
    grp.scale.setScalar(THREE.MathUtils.damp(grp.scale.x, s, 4, dt))
    grp.visible = p > -0.3 && p < 1.6

    if (inner.current) {
      const targetRot = Math.PI + (isHov ? 0.32 : isSel ? Math.sin(clock.elapsedTime * 0.4) * 0.12 : 0)
      inner.current.rotation.y = THREE.MathUtils.damp(inner.current.rotation.y, targetRot, 5, dt)
      inner.current.position.y = THREE.MathUtils.damp(inner.current.position.y, isHov ? 0.12 : 0, 6, dt)
    }
    if (light.current) {
      const target = isHov ? 260 : isSel ? 170 : 60
      light.current.intensity = THREE.MathUtils.damp(light.current.intensity, target, 5, dt)
      light.current.color.lerp(new THREE.Color(isHov ? spec.accent : '#ffffff'), dt * 4)
    }
  })

  const showCard = !isMobile && (isHov || (isSel && !hovered))

  return (
    <group ref={g} position={[60, 0, 0]}>
      <Turntable active={isSel || isHov} />
      <spotLight ref={light} position={[0, 9, 2]} angle={0.5} penumbra={0.9} intensity={60} distance={30} castShadow color="#ffffff" target-position={[0, 0, 0]} />
      <group
        ref={inner}
        rotation={[0, Math.PI, 0]}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(null)
          document.body.style.cursor = ''
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (available) setBooking({ vehicle: id })
        }}
      >
        <Vehicle variant={id} color={spec.color} lights={false} />
      </group>
      {!isMobile && (
      <Html portal={htmlPortal} position={[0, 3.4, 0]} center distanceFactor={12} zIndexRange={[20, 0]} style={{ pointerEvents: showCard ? 'auto' : 'none' }}>
          <div className={`vcard ${isSel ? 'is-selected' : ''} ${showCard ? '' : 'is-hidden'}`}>
            <div className="vcard__head">
              <span className="vcard__name">{spec.name}</span>
              <span className="vcard__price">{fmtTWD(trip.fareFor(id))}</span>
            </div>
            <div className="vcard__meta">
              <span>{spec.seats} seats</span>
              <span>{spec.luggage} bags</span>
              <span>{available ? `Demo ETA ${spec.etaMin} min` : 'Capacity exceeded'}</span>
            </div>
            <button
              className="vcard__cta"
              disabled={!available}
              onClick={(e) => {
                e.stopPropagation()
                if (!available) return
                setBooking({ vehicle: id })
                scrollToSection('confirm')
              }}
            >
              Book this ride
            </button>
          </div>
      </Html>
      )}
    </group>
  )
}

/** Premium vehicle selection environment beside the route. */
export function VehiclePlaza() {
  return (
    <group position={WORLD.plaza}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -3]} receiveShadow>
        <circleGeometry args={[28, 64]} />
        <meshStandardMaterial color="#cfd4dd" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -3]}>
        <ringGeometry args={[27.6, 28, 96]} />
        <meshBasicMaterial color="#7f8bb0" toneMapped={false} />
      </mesh>
      {/* back wall wash */}
      <mesh position={[0, 6, -22]}>
        <planeGeometry args={[70, 14]} />
        <meshStandardMaterial color="#d5dae3" roughness={1} />
      </mesh>
      <pointLight position={[0, 10, -14]} intensity={120} distance={50} color="#7f8fd8" />
      {VEHICLES.map((v, i) => (
        <PlazaVehicle key={v.id} id={v.id} index={i} />
      ))}
    </group>
  )
}
