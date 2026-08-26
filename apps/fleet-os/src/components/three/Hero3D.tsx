import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Float, Sparkles } from '@react-three/drei'
import type { Group } from 'three'
import { VehicleModel } from './VehicleModel'

function Pin({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<Group>(null)
  useFrame((state) => {
    if (!ref.current) return
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.6 + position[0]) * 0.15
    ref.current.rotation.y += 0.01
  })
  return (
    <group ref={ref} position={position}>
      <mesh>
        <coneGeometry args={[0.12, 0.32, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Scene() {
  const gridRef = useRef<Group>(null)
  useFrame((_, delta) => {
    if (gridRef.current) gridRef.current.rotation.z += delta * 0.03
  })

  return (
    <>
      <color attach="background" args={['#05060f']} />
      <fog attach="fog" args={['#05060f', 6, 15]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 2]} intensity={1.4} castShadow />
      <pointLight position={[-3, 2, -2]} color="#a855f7" intensity={12} />
      <pointLight position={[3, 1, 3]} color="#22d3ee" intensity={10} />

      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.4}>
        <VehicleModel color="#22d3ee" scale={1.15} />
      </Float>

      <Pin position={[-2.4, 0.4, -1]} color="#f472b6" />
      <Pin position={[2.6, 0.7, -1.6]} color="#a855f7" />
      <Pin position={[2.1, 0.2, 1.8]} color="#fbbf24" />
      <Pin position={[-2.3, 0.9, 1.6]} color="#a3e635" />

      <Sparkles count={60} scale={7} size={2} speed={0.3} color="#67e8f9" opacity={0.6} />

      <group ref={gridRef} position={[0, -0.75, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <gridHelper args={[16, 24, '#22d3ee', '#161c33']} />
      </group>

      <ContactShadows position={[0, -0.74, 0]} opacity={0.55} scale={10} blur={2.4} far={2} color="#000000" />
    </>
  )
}

export function Hero3D({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [4.2, 2.4, 4.6], fov: 42 }} dpr={[1, 1.6]} shadows>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}
