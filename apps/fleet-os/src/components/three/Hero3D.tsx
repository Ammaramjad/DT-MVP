import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Float, Sparkles } from '@react-three/drei'
import type { Group } from 'three'
import { VehicleModel } from './VehicleModel'

function Pin({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<Group>(null)
  useFrame((state) => {
    if (!ref.current) return
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.8 + position[0]) * 0.18
    ref.current.rotation.y += 0.015
  })
  return (
    <group ref={ref} position={position}>
      <mesh>
        <coneGeometry args={[0.14, 0.36, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.1, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.2, 0]} color={color} intensity={1.5} distance={2} />
    </group>
  )
}

function ShowroomPlatform() {
  const ringRef = useRef<Group>(null)
  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.z -= delta * 0.1
  })

  return (
    <group position={[0, -0.76, 0]}>
      {/* Glossy showroom floor disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.8, 64]} />
        <meshStandardMaterial
          color="#060b18"
          roughness={0.15}
          metalness={0.8}
        />
      </mesh>

      {/* Outer illuminated neon cyber ring */}
      <group ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <mesh>
          <ringGeometry args={[3.6, 3.75, 64]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.6} />
        </mesh>
        <mesh>
          <ringGeometry args={[2.8, 2.86, 48]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.4} />
        </mesh>
      </group>
    </group>
  )
}

function Scene() {
  const gridRef = useRef<Group>(null)
  useFrame((_, delta) => {
    if (gridRef.current) gridRef.current.rotation.z += delta * 0.02
  })

  return (
    <>
      <color attach="background" args={['#030712']} />
      <fog attach="fog" args={['#030712', 6, 16]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 6, 3]} intensity={2.2} castShadow color="#f0f9ff" />
      <directionalLight position={[-4, 4, -3]} intensity={1.2} color="#c084fc" />
      <pointLight position={[-3, 2.5, -2]} color="#8b5cf6" intensity={16} distance={10} />
      <pointLight position={[3, 1.8, 3]} color="#06b6d4" intensity={18} distance={10} />
      <pointLight position={[0, 4, 0]} color="#38bdf8" intensity={8} distance={8} />

      <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.45}>
        <VehicleModel color="#06b6d4" scale={1.2} />
      </Float>

      <Pin position={[-2.5, 0.5, -1.2]} color="#f43f5e" />
      <Pin position={[2.7, 0.8, -1.8]} color="#8b5cf6" />
      <Pin position={[2.2, 0.3, 2]} color="#f59e0b" />
      <Pin position={[-2.4, 1, 1.7]} color="#10b981" />

      <Sparkles count={80} scale={8} size={2.5} speed={0.4} color="#38bdf8" opacity={0.7} />
      <Sparkles count={40} scale={6} size={1.8} speed={0.6} color="#c084fc" opacity={0.5} />

      <ShowroomPlatform />

      <group ref={gridRef} position={[0, -0.77, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <gridHelper args={[20, 30, '#06b6d4', '#0f172a']} />
      </group>

      <ContactShadows position={[0, -0.75, 0]} opacity={0.7} scale={12} blur={2.2} far={2.5} color="#000000" />
    </>
  )
}

export function Hero3D({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [4.4, 2.6, 4.8], fov: 40 }} dpr={[1, 1.6]} shadows>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}
