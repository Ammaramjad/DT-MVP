import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { VehicleModel } from './VehicleModel'

export function VehicleSpinner({ color = '#22d3ee', className }: { color?: string; className?: string }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [3.2, 1.6, 3.4], fov: 38 }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 4, 2]} intensity={1.2} />
          <pointLight position={[-2, 1, -2]} color={color} intensity={8} />
          <VehicleModel color={color} scale={0.95} />
          <ContactShadows position={[0, -0.72, 0]} opacity={0.45} scale={6} blur={2.2} far={2} />
        </Suspense>
      </Canvas>
    </div>
  )
}
