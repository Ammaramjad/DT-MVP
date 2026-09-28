import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { scrollState, useStore } from '../store'
import { WHY_ITEMS } from '../lib/content'
import { WORLD, clamp01, htmlPortal } from './world'

function Shape({ i, glass }: { i: number; glass: THREE.Material }) {
  switch (i) {
    case 0:
      return (
        <mesh material={glass} castShadow>
          <torusGeometry args={[1.1, 0.34, 24, 64]} />
        </mesh>
      )
    case 1:
      return (
        <mesh material={glass} castShadow>
          <icosahedronGeometry args={[1.25, 0]} />
        </mesh>
      )
    case 2:
      return (
        <group>
          <mesh material={glass}>
            <sphereGeometry args={[0.55, 32, 24]} />
          </mesh>
          <mesh material={glass} rotation={[Math.PI / 2.4, 0, 0]}>
            <torusGeometry args={[1.35, 0.06, 12, 80]} />
          </mesh>
          <mesh material={glass} rotation={[Math.PI / 2.4, 0.9, 0.4]}>
            <torusGeometry args={[1.05, 0.05, 12, 80]} />
          </mesh>
        </group>
      )
    case 3:
      return (
        <mesh material={glass} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[1.25, 1.25, 0.28, 48]} />
        </mesh>
      )
    case 4:
      return (
        <mesh material={glass} castShadow>
          <dodecahedronGeometry args={[1.2, 0]} />
        </mesh>
      )
    default:
      return (
        <mesh material={glass} castShadow>
          <octahedronGeometry args={[1.35, 0]} />
        </mesh>
      )
  }
}

export function WhyObjects() {
  const quality = useStore((s) => s.quality)
  const isMobile = useStore((s) => s.isMobile)
  const [hover, setHover] = useState<number | null>(null)
  const root = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Group>(null)
  const items = useRef<(THREE.Group | null)[]>([])

  const glass = useMemo(() => {
    if (quality === 'high')
      return new THREE.MeshPhysicalMaterial({ color: '#dfe6ff', roughness: 0.08, metalness: 0, transmission: 0.92, thickness: 1.2, ior: 1.4, clearcoat: 1, envMapIntensity: 1.5 })
    return new THREE.MeshPhysicalMaterial({ color: '#aab6f0', roughness: 0.15, metalness: 0.7, clearcoat: 1, envMapIntensity: 1.5 })
  }, [quality])

  const radius = isMobile ? 5.2 : 8.5

  useFrame(({ clock }, dt) => {
    const p = scrollState.p.why
    if (root.current) root.current.visible = p > -0.6 && p < 1.6
    if (ring.current) {
      const target = clamp01(p) * Math.PI * 0.9 + scrollState.mx * 0.25
      ring.current.rotation.y = THREE.MathUtils.damp(ring.current.rotation.y, target, 3, dt)
      ring.current.rotation.x = THREE.MathUtils.damp(ring.current.rotation.x, scrollState.my * 0.12, 3, dt)
    }
    const t = clock.elapsedTime
    items.current.forEach((g, i) => {
      if (!g) return
      const base = Math.sin(t * 0.8 + i * 1.1) * 0.25
      g.position.y = 1.4 + base + (hover === i ? 0.4 : 0)
      g.rotation.y += dt * (hover === i ? 1.2 : 0.25)
      g.rotation.x = Math.sin(t * 0.5 + i) * 0.2
      const s = THREE.MathUtils.damp(g.scale.x, hover === i ? 1.25 : 1, 6, dt)
      g.scale.setScalar(s)
    })
  })

  return (
    <group ref={root} position={WORLD.why}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#080a10" roughness={0.35} metalness={0.6} />
      </mesh>
      <group ref={ring}>
        {WHY_ITEMS.map((it, i) => {
          const a = (i / WHY_ITEMS.length) * Math.PI * 2
          const x = Math.sin(a) * radius
          const z = Math.cos(a) * radius
          return (
            <group key={it.key} position={[x, 0, z]}>
              <group
                ref={(el) => {
                  items.current[i] = el
                }}
                onPointerOver={(e) => {
                  e.stopPropagation()
                  setHover(i)
                }}
                onPointerOut={() => setHover(null)}
              >
                <Shape i={i} glass={glass} />
              </group>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
                <ringGeometry args={[1.7, 1.78, 48]} />
                <meshBasicMaterial color={hover === i ? '#dfe6ff' : '#3a4468'} toneMapped={false} transparent opacity={0.9} />
              </mesh>
              <Html portal={htmlPortal} position={[0, -1.4, 0]} center distanceFactor={14} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
                <div className={`whylabel ${hover === i ? 'is-hover' : ''}`}>
                  <span className="whylabel__t">{it.title}</span>
                  <span className="whylabel__c">{it.copy}</span>
                </div>
              </Html>
            </group>
          )
        })}
      </group>
      <pointLight position={[0, 10, 0]} intensity={200} distance={60} color="#dfe6ff" />
      <pointLight position={[-12, 4, 12]} intensity={80} distance={50} color="#a7b6ff" />
      <pointLight position={[12, 4, -12]} intensity={60} distance={50} color="#f4e9c8" />
    </group>
  )
}
