import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, forwardRef, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { VehicleId } from '../lib/data'
import { ProceduralVehicle } from './ProceduralVehicle'

export const CAR_URL = `${import.meta.env.BASE_URL}models/car.glb`

/** Per-category footprint: [length/width scale, height scale]. */
const FIT: Record<VehicleId, [number, number]> = {
  economy: [0.92, 1.0],
  comfort: [1.0, 1.0],
  business: [1.08, 1.02],
  premium: [1.14, 1.0],
  van: [1.1, 1.22],
}

export type VehicleProps = {
  variant: VehicleId
  color?: string
  lights?: boolean
  /** ref to a number updated each frame: wheel spin speed */
  speedRef?: React.MutableRefObject<number>
  paintRoughness?: number
  scale?: number
}

const WHEELS = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']

const headMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#dfe9ff', emissiveIntensity: 3, toneMapped: false })
const tailMat = new THREE.MeshStandardMaterial({ color: '#ff3b3b', emissive: '#ff2a2a', emissiveIntensity: 2.5 })
const glassMat = new THREE.MeshPhysicalMaterial({
  color: '#1a222f',
  roughness: 0.05,
  metalness: 0.4,
  transparent: true,
  opacity: 0.72,
  envMapIntensity: 2,
})
const chromeMat = new THREE.MeshStandardMaterial({ color: '#e8ebf0', roughness: 0.12, metalness: 1 })
const tireMat = new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.92 })
const rimMat = new THREE.MeshStandardMaterial({ color: '#c9ced8', roughness: 0.25, metalness: 0.95 })

const GlbVehicle = forwardRef<THREE.Group, VehicleProps>(function GlbVehicle(
  { variant, color = '#8a96b0', lights = true, speedRef, paintRoughness = 0.18, scale = 1 },
  ref,
) {
  const { scene } = useGLTF(CAR_URL)
  const fallbackSpin = useRef(0)
  const spin = speedRef ?? fallbackSpin
  const paint = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: paintRoughness,
        metalness: 0.7,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.6,
      }),
    [color, paintRoughness],
  )

  const { model, wheels, axle, len } = useMemo(() => {
    const model = scene.clone(true)
    const wheels: THREE.Object3D[] = []
    const raw = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
    const axle: 'x' | 'z' = raw.x > raw.z ? 'z' : 'x'
    model.traverse((o) => {
      if (WHEELS.includes(o.name)) wheels.push(o)
      if (!(o instanceof THREE.Mesh)) return
      o.castShadow = true
      o.receiveShadow = false
      switch (o.name) {
        case 'body':
          o.material = paint
          break
        case 'glass':
          o.material = glassMat
          break
        case 'chrome':
        case 'metal':
          o.material = chromeMat
          break
        case 'tire':
          o.material = tireMat
          break
        case 'rim_fl':
        case 'rim_fr':
        case 'rim_rl':
        case 'rim_rr':
          o.material = rimMat
          break
        case 'lights':
          o.material = headMat
          break
        case 'lights_red':
          o.material = tailMat
          break
      }
    })
    // long axis → Z, wheels on the ground, headlights facing -Z
    if (axle === 'z') model.rotation.y = Math.PI / 2
    model.updateMatrixWorld(true)
    const b2 = new THREE.Box3().setFromObject(model)
    const head = model.getObjectByName('lights')
    if (head) {
      const hb = new THREE.Box3().setFromObject(head).getCenter(new THREE.Vector3())
      const c = b2.getCenter(new THREE.Vector3())
      if (hb.z > c.z) model.rotation.y += Math.PI
    }
    model.updateMatrixWorld(true)
    const b3 = new THREE.Box3().setFromObject(model)
    const c3 = b3.getCenter(new THREE.Vector3())
    model.position.set(-c3.x, -b3.min.y, -c3.z)
    return { model, wheels, axle, len: b3.max.z - b3.min.z }
  }, [scene, paint])

  useFrame((_, dt) => {
    for (const w of wheels) w.rotation[axle] -= spin.current * dt * 6
  })

  const [f, fy] = FIT[variant]
  return (
    <group ref={ref} scale={scale}>
      <group scale={[f, f * fy, f]}>
        <primitive object={model} />
      </group>
      {lights && (
        <spotLight
          position={[0, 0.6, (-len / 2) * f]}
          target-position={[0, 0, (-len / 2) * f - 12]}
          angle={0.55}
          penumbra={0.8}
          intensity={35}
          distance={30}
          color="#dfe9ff"
        />
      )}
    </group>
  )
})

/** Realistic GLB car; falls back to the procedural body while the model streams in. */
export const Vehicle = forwardRef<THREE.Group, VehicleProps>(function Vehicle(props, ref) {
  return (
    <Suspense fallback={<ProceduralVehicle {...props} ref={ref} />}>
      <GlbVehicle {...props} ref={ref} />
    </Suspense>
  )
})

useGLTF.preload(CAR_URL)
