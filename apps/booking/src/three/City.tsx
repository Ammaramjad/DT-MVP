import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { WORLD } from './world'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function makeWindowTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#0a0d14'
  ctx.fillRect(0, 0, 64, 128)
  const rnd = seeded(7)
  for (let y = 4; y < 128; y += 8) {
    for (let x = 4; x < 64; x += 8) {
      const on = rnd()
      if (on > 0.62) {
        const warm = rnd() > 0.5
        ctx.fillStyle = warm ? `rgba(255,225,180,${0.5 + rnd() * 0.5})` : `rgba(170,190,255,${0.4 + rnd() * 0.5})`
        ctx.fillRect(x, y, 4, 5)
      }
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Procedural night city: instanced towers flanking the main road plus a
 * second cluster around the vehicle plaza. Density scales with quality.
 */
export function City() {
  const quality = useStore((s) => s.quality)
  const count = quality === 'high' ? 520 : quality === 'medium' ? 300 : 140
  const ref = useRef<THREE.InstancedMesh>(null)
  const tex = useMemo(makeWindowTexture, [])

  const data = useMemo(() => {
    const rnd = seeded(42)
    const items: { pos: THREE.Vector3; scale: THREE.Vector3; shade: number }[] = []
    const half = WORLD.roadWidth / 2 + 6
    let tries = 0
    while (items.length < count && tries < count * 6) {
      tries++
      const side = rnd() > 0.5 ? 1 : -1
      const z = THREE.MathUtils.lerp(WORLD.roadFrom + 40, WORLD.roadTo - 40, rnd())
      const depth = Math.pow(rnd(), 1.4) * 150
      const x = side * (half + depth)
      // keep the plaza clear
      const dx = x - WORLD.plaza.x
      const dz = z - WORLD.plaza.z
      if (Math.sqrt(dx * dx + dz * dz) < 46) continue
      const w = 6 + rnd() * 10
      const dpt = 6 + rnd() * 10
      const near = 1 - Math.min(1, depth / 150)
      const h = 6 + Math.pow(rnd(), 2.2) * (40 + near * 50)
      items.push({
        pos: new THREE.Vector3(x, h / 2, z),
        scale: new THREE.Vector3(w, h, dpt),
        shade: 0.35 + rnd() * 0.65,
      })
    }
    return items
  }, [count])

  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    const color = new THREE.Color()
    data.forEach((d, i) => {
      o.position.copy(d.pos)
      o.scale.copy(d.scale)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      color.setHSL(0.62, 0.15, 0.06 + d.shade * 0.08)
      m.setColorAt(i, color)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [data])

  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#141926',
      roughness: 0.6,
      metalness: 0.3,
      emissive: '#ffffff',
      emissiveMap: tex,
      emissiveIntensity: 0.9,
    })
    return m
  }, [tex])

  useFrame(({ clock }) => {
    mat.emissiveIntensity = 0.85 + Math.sin(clock.elapsedTime * 0.7) * 0.08
  })

  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, data.length]} material={mat} frustumCulled={false} castShadow={false} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  )
}

/** Road, lane markers and light poles along the main axis. */
export function Road() {
  const quality = useStore((s) => s.quality)
  const length = WORLD.roadFrom - WORLD.roadTo
  const centerZ = (WORLD.roadFrom + WORLD.roadTo) / 2
  const dashes = useMemo(() => {
    const arr: number[] = []
    const step = quality === 'low' ? 12 : 6
    for (let z = WORLD.roadTo; z < WORLD.roadFrom; z += step) arr.push(z)
    return arr
  }, [quality])
  const dashRef = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = dashRef.current
    if (!m) return
    const o = new THREE.Object3D()
    dashes.forEach((z, i) => {
      const lane = i % 2 === 0 ? -1 : 1
      o.position.set(lane * WORLD.roadWidth * 0.17, 0.02, z)
      o.scale.set(0.16, 1, 2.6)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [dashes])

  const poles = useMemo(() => {
    const arr: [number, number][] = []
    for (let z = WORLD.roadTo; z < WORLD.roadFrom; z += 28) {
      arr.push([-WORLD.roadWidth / 2 - 1.5, z])
      arr.push([WORLD.roadWidth / 2 + 1.5, z + 14])
    }
    return arr
  }, [])

  return (
    <group>
      {/* asphalt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, centerZ]} receiveShadow>
        <planeGeometry args={[WORLD.roadWidth, length]} />
        <meshStandardMaterial color="#0c0f16" roughness={0.35} metalness={0.5} />
      </mesh>
      {/* edge glow strips */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * (WORLD.roadWidth / 2 - 0.15), 0.015, centerZ]}>
          <planeGeometry args={[0.14, length]} />
          <meshBasicMaterial color="#8fa3ff" toneMapped={false} />
        </mesh>
      ))}
      {/* lane dashes */}
      <instancedMesh ref={dashRef} args={[undefined, undefined, dashes.length]} frustumCulled={false}>
        <boxGeometry args={[1, 0.02, 1]} />
        <meshBasicMaterial color="#5f6b8f" />
      </instancedMesh>
      {/* sidewalks */}
      {[-1, 1].map((s) => (
        <mesh key={`sw${s}`} position={[s * (WORLD.roadWidth / 2 + 3), 0.15, centerZ]} receiveShadow>
          <boxGeometry args={[6, 0.3, length]} />
          <meshStandardMaterial color="#12161f" roughness={0.9} />
        </mesh>
      ))}
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, centerZ]} receiveShadow>
        <planeGeometry args={[900, length + 400]} />
        <meshStandardMaterial color="#070910" roughness={1} />
      </mesh>
      {/* light poles */}
      {quality !== 'low' &&
        poles.map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 4, 0]}>
              <cylinderGeometry args={[0.06, 0.09, 8, 6]} />
              <meshStandardMaterial color="#1a1f2b" />
            </mesh>
            <mesh position={[x > 0 ? -1.2 : 1.2, 8, 0]}>
              <boxGeometry args={[2.4, 0.08, 0.3]} />
              <meshBasicMaterial color="#cfd9ff" toneMapped={false} />
            </mesh>
          </group>
        ))}
    </group>
  )
}
