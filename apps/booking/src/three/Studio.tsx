import { MeshReflectorMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { scrollState, useStore } from '../store'
import { Vehicle } from './Vehicle'
import { SHOWCASE } from '../lib/content'
import { WORLD, clamp01 } from './world'

export function Studio() {
  const quality = useStore((s) => s.quality)
  const root = useRef<THREE.Group>(null)
  const car = useRef<THREE.Group>(null)
  const key = useRef<THREE.SpotLight>(null)
  const rim = useRef<THREE.SpotLight>(null)
  const col = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }, dt) => {
    const p = scrollState.p.showcase
    const po = scrollState.p.outro
    if (root.current) root.current.visible = p > -0.6 && po < 1.2
    const t = clamp01(p)
    if (car.current) {
      const target = t * Math.PI * 2 + Math.PI * 0.75 + (po > 0 ? clamp01(po) * 0.6 : 0)
      car.current.rotation.y = THREE.MathUtils.damp(car.current.rotation.y, target, 4, dt)
      car.current.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.015
    }
    const idx = Math.min(SHOWCASE.length - 1, Math.floor(t * SHOWCASE.length))
    if (rim.current) {
      col.set(SHOWCASE[idx].color)
      rim.current.color.lerp(col, dt * 2.5)
    }
    if (key.current) key.current.intensity = THREE.MathUtils.damp(key.current.intensity, 380 + Math.sin(clock.elapsedTime * 0.7) * 20, 3, dt)
  })

  return (
    <group ref={root} position={WORLD.studio}>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[30, 96]} />
        {quality === 'high' ? (
          <MeshReflectorMaterial blur={[400, 100]} resolution={1024} mixBlur={1} mixStrength={18} roughness={0.9} depthScale={1.1} minDepthThreshold={0.4} maxDepthThreshold={1.3} color="#06070b" metalness={0.6} mirror={0.5} />
        ) : (
          <meshStandardMaterial color="#07080c" roughness={0.25} metalness={0.8} />
        )}
      </mesh>
      {/* stage disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[4.4, 4.5, 96]} />
        <meshBasicMaterial color="#2a3150" toneMapped={false} />
      </mesh>
      {/* cyclorama */}
      <mesh position={[0, 12, -22]} receiveShadow>
        <planeGeometry args={[90, 40]} />
        <meshStandardMaterial color="#05060a" roughness={1} />
      </mesh>
      <group ref={car} rotation={[0, Math.PI * 0.75, 0]}>
        <Vehicle variant="premium" color="#0b0c10" lights={false} paintRoughness={0.1} />
      </group>
      {/* studio lighting */}
      <spotLight ref={key} position={[6, 9, 6]} angle={0.45} penumbra={0.7} intensity={380} distance={40} castShadow color="#fff6e6" shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} target-position={[0, 0.5, 0]} />
      <spotLight position={[-8, 6, -2]} angle={0.5} penumbra={0.8} intensity={160} distance={40} color="#c9d4ff" target-position={[0, 0.5, 0]} />
      <spotLight ref={rim} position={[0, 5, -9]} angle={0.7} penumbra={0.9} intensity={260} distance={40} color="#f4e9c8" target-position={[0, 0.6, 0]} />
      {/* soft box overhead */}
      <mesh position={[0, 7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 1.2]} />
        <meshBasicMaterial color="#e9eeff" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 6.5, 0]} intensity={90} distance={20} color="#e9eeff" />
    </group>
  )
}
