import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

export function VehicleModel({
  color = '#22d3ee',
  autoRotate = true,
  scale = 1,
}: {
  color?: string
  autoRotate?: boolean
  scale?: number
}) {
  const group = useRef<Group>(null)

  useFrame((state, delta) => {
    if (!group.current) return
    if (autoRotate) group.current.rotation.y += delta * 0.45
    group.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.08
  })

  const wheelPositions: [number, number, number][] = [
    [0.78, -0.42, 0.62],
    [0.78, -0.42, -0.62],
    [-0.78, -0.42, 0.62],
    [-0.78, -0.42, -0.62],
  ]

  return (
    <group ref={group} scale={scale}>
      {/* main body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.15, 0.62, 1.05]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
      </mesh>

      {/* cabin / roof */}
      <mesh position={[-0.12, 0.5, 0]} castShadow>
        <boxGeometry args={[1.25, 0.48, 0.98]} />
        <meshStandardMaterial color="#0f172a" metalness={0.2} roughness={0.25} />
      </mesh>

      {/* windshield glow strip */}
      <mesh position={[0.5, 0.5, 0]}>
        <boxGeometry args={[0.06, 0.4, 0.9]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>

      {/* headlights */}
      <mesh position={[1.09, 0.05, 0.32]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[1.09, 0.05, -0.32]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#f8fafc" emissive="#f8fafc" emissiveIntensity={2} toneMapped={false} />
      </mesh>

      {/* taillights */}
      <mesh position={[-1.09, 0.05, 0.32]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <mesh position={[-1.09, 0.05, -0.32]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>

      {/* wheels */}
      {wheelPositions.map((pos, i) => (
        <mesh key={i} position={pos} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.24, 20]} />
          <meshStandardMaterial color="#0b0e18" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}

      {/* underglow disc */}
      <mesh position={[0, -0.68, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} />
      </mesh>
    </group>
  )
}
