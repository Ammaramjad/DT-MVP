import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { scrollState, useStore } from '../store'
import { WORLD, htmlPortal } from './world'

const GRID = 7
const CELL = 12
const ROAD = 4
const EXT = (GRID * CELL) / 2

const DRIVERS = ['Chen Wei-Ting', 'Lin Ya-Hui', 'Huang Chih-Ming', 'Wu Pei-Shan', 'Tsai Kuan-Yu', 'Liu Hsin-Yi', 'Chang Jia-Hao', 'Yang Mei-Ling', 'Hsu Cheng-En', 'Kuo Shu-Fen', 'Lee Tzu-Chieh', 'Cheng Yun-Ru', 'Hsieh Bo-Yan', 'Chou Wan-Ting']
const MODELS = ['Toyota Camry', 'Lexus ES', 'Toyota Alphard', 'Mercedes E-Class', 'Tesla Model Y', 'BMW 5 Series', 'Toyota Sienna', 'Lexus LM']

type Car = { id: number; axis: 'x' | 'z'; lane: number; dir: 1 | -1; speed: number; offset: number; color: string; driver: string; model: string; status: 'Available' | 'En route' | 'On trip'; eta: number }

function seeded(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

function MiniCar({ car, onHover }: { car: Car; onHover: (c: Car | null, pos: THREE.Vector3 | null) => void }) {
  const g = useRef<THREE.Group>(null)
  const hov = useRef(false)
  useFrame(({ clock }) => {
    const grp = g.current
    if (!grp) return
    const t = clock.elapsedTime * car.speed + car.offset
    const span = EXT * 2 + 10
    const along = ((t % span) + span) % span - EXT - 5
    const laneOff = car.dir * 0.9
    const roadCoord = -EXT + car.lane * CELL + laneOff
    if (car.axis === 'x') {
      grp.position.set(car.dir * along, 0.35, roadCoord)
      grp.rotation.y = car.dir > 0 ? -Math.PI / 2 : Math.PI / 2
    } else {
      grp.position.set(roadCoord, 0.35, car.dir * along)
      grp.rotation.y = car.dir > 0 ? Math.PI : 0
    }
    if (hov.current) onHover(car, grp.getWorldPosition(new THREE.Vector3()))
  })
  return (
    <group
      ref={g}
      onPointerOver={(e) => {
        e.stopPropagation()
        hov.current = true
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        hov.current = false
        onHover(null, null)
        document.body.style.cursor = ''
      }}
    >
      <mesh castShadow>
        <boxGeometry args={[1.1, 0.45, 2.3]} />
        <meshStandardMaterial color={car.color} roughness={0.25} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.35, -0.1]}>
        <boxGeometry args={[0.95, 0.3, 1.2]} />
        <meshStandardMaterial color="#0d1522" roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.05, -1.16]}>
        <boxGeometry args={[0.8, 0.1, 0.05]} />
        <meshBasicMaterial color="#e6eeff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.05, 1.16]}>
        <boxGeometry args={[0.8, 0.08, 0.05]} />
        <meshBasicMaterial color="#ff3b3b" toneMapped={false} />
      </mesh>
      {/* invisible bigger hit target */}
      <mesh visible={false}>
        <boxGeometry args={[3, 2, 4]} />
      </mesh>
    </group>
  )
}

export function FleetMap() {
  const quality = useStore((s) => s.quality)
  const [hover, setHover] = useState<{ car: Car; pos: THREE.Vector3 } | null>(null)
  const root = useRef<THREE.Group>(null)
  const blocks = useRef<THREE.InstancedMesh>(null)

  const cars = useMemo<Car[]>(() => {
    const rnd = seeded(11)
    const n = quality === 'low' ? 8 : 14
    const palette = ['#c9ced8', '#5b6b8c', '#1b1f2a', '#0b0c10', '#2c3140', '#8a93a8']
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      axis: i % 2 === 0 ? 'x' : 'z',
      lane: 1 + Math.floor(rnd() * (GRID - 1)),
      dir: rnd() > 0.5 ? 1 : -1,
      speed: 2.2 + rnd() * 2.2,
      offset: rnd() * 200,
      color: palette[i % palette.length],
      driver: DRIVERS[i % DRIVERS.length],
      model: MODELS[i % MODELS.length],
      status: (['Available', 'En route', 'On trip'] as const)[Math.floor(rnd() * 3)],
      eta: 2 + Math.floor(rnd() * 9),
    }))
  }, [quality])

  const blockData = useMemo(() => {
    const rnd = seeded(5)
    const arr: { x: number; z: number; h: number; w: number; d: number }[] = []
    for (let i = 0; i < GRID; i++)
      for (let j = 0; j < GRID; j++) {
        const cx = -EXT + i * CELL + CELL / 2
        const cz = -EXT + j * CELL + CELL / 2
        const sub = rnd() > 0.5 ? 2 : 1
        for (let a = 0; a < sub; a++)
          for (let b = 0; b < sub; b++) {
            const size = (CELL - ROAD) / sub - 0.6
            const h = 1.5 + Math.pow(rnd(), 1.6) * 9
            arr.push({ x: cx - ((CELL - ROAD) / 2) + size / 2 + a * (size + 0.6), z: cz - ((CELL - ROAD) / 2) + size / 2 + b * (size + 0.6), h, w: size, d: size })
          }
      }
    return arr
  }, [])

  useLayoutEffect(() => {
    const m = blocks.current
    if (!m) return
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    blockData.forEach((b, i) => {
      o.position.set(b.x, b.h / 2, b.z)
      o.scale.set(b.w, b.h, b.d)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      c.setHSL(0.63, 0.12, 0.09 + (b.h / 11) * 0.08)
      m.setColorAt(i, c)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [blockData])

  useFrame(() => {
    if (root.current) root.current.visible = scrollState.p.fleet > -0.6 && scrollState.p.fleet < 1.6
  })

  const onHover = (car: Car | null, pos: THREE.Vector3 | null) => {
    if (!car || !pos) setHover(null)
    else setHover({ car, pos })
  }

  return (
    <group ref={root} position={WORLD.fleet}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[EXT * 2 + 40, EXT * 2 + 40]} />
        <meshStandardMaterial color="#090c13" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* road grid */}
      {Array.from({ length: GRID + 1 }, (_, i) => (
        <group key={i}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -EXT + i * CELL]}>
            <planeGeometry args={[EXT * 2 + 8, ROAD]} />
            <meshStandardMaterial color="#10141d" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[-EXT + i * CELL, 0.01, 0]}>
            <planeGeometry args={[EXT * 2 + 8, ROAD]} />
            <meshStandardMaterial color="#10141d" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -EXT + i * CELL]}>
            <planeGeometry args={[EXT * 2 + 8, 0.08]} />
            <meshBasicMaterial color="#3d4a75" toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[-EXT + i * CELL, 0.02, 0]}>
            <planeGeometry args={[EXT * 2 + 8, 0.08]} />
            <meshBasicMaterial color="#3d4a75" toneMapped={false} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={blocks} args={[undefined, undefined, blockData.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#141926" roughness={0.7} metalness={0.2} />
      </instancedMesh>
      {cars.map((c) => (
        <MiniCar key={c.id} car={c} onHover={onHover} />
      ))}
      <Html portal={htmlPortal} position={hover ? [hover.pos.x - WORLD.fleet.x, 2.2, hover.pos.z - WORLD.fleet.z] : [0, 2.2, 0]} center distanceFactor={40} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        {hover && (
          <div className="fleetcard">
            <div className="fleetcard__row">
              <span className="fleetcard__k">Driver</span>
              <span>{hover.car.driver}</span>
            </div>
            <div className="fleetcard__row">
              <span className="fleetcard__k">Vehicle</span>
              <span>{hover.car.model}</span>
            </div>
            <div className="fleetcard__row">
              <span className="fleetcard__k">ETA</span>
              <span>{hover.car.eta} min</span>
            </div>
            <div className="fleetcard__row">
              <span className="fleetcard__k">Status</span>
              <span className={`fleetcard__status is-${hover.car.status.replace(' ', '').toLowerCase()}`}>{hover.car.status}</span>
            </div>
          </div>
        )}
      </Html>
      <ambientLight intensity={0.25} />
      <directionalLight position={[40, 60, 20]} intensity={1.6} castShadow color="#cfd8ff" shadow-mapSize={[1024, 1024]}>
        <orthographicCamera attach="shadow-camera" args={[-60, 60, 60, -60, 1, 200]} />
      </directionalLight>
    </group>
  )
}
