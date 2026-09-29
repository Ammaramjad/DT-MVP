import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
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

const TEX = `${import.meta.env.BASE_URL}textures/`
const ROAD_TEX = [`${TEX}asphalt_02_diff_1k.jpg`, `${TEX}asphalt_02_nor_gl_1k.jpg`, `${TEX}asphalt_02_rough_1k.jpg`]
const WALL_TEX = [`${TEX}concrete_wall_005_diff_1k.jpg`, `${TEX}concrete_wall_005_nor_gl_1k.jpg`, `${TEX}concrete_wall_005_rough_1k.jpg`]

/**
 * Curtain-wall facade: one tile = one floor of a tower. Colour carries the
 * glass/mullion pattern, roughness/metalness maps make the glass reflect the
 * sky while the concrete spandrels stay matte. Each map is built once.
 */
function makeFacadeMaps() {
  const W = 256
  const H = 256
  const cols = 4
  const rows = 8
  const cw = W / cols
  const rh = H / rows
  const rnd = seeded(7)
  const color = document.createElement('canvas')
  const rough = document.createElement('canvas')
  const emis = document.createElement('canvas')
  for (const c of [color, rough, emis]) {
    c.width = W
    c.height = H
  }
  const cc = color.getContext('2d')!
  const rc = rough.getContext('2d')!
  const ec = emis.getContext('2d')!
  // concrete frame
  cc.fillStyle = '#b9bec8'
  cc.fillRect(0, 0, W, H)
  rc.fillStyle = 'rgb(230,0,0)' // r = roughness, g = metalness (rough concrete)
  rc.fillRect(0, 0, W, H)
  ec.fillStyle = '#000'
  ec.fillRect(0, 0, W, H)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + 6
      const y = r * rh + 5
      const w = cw - 12
      const h = rh - 12
      // glass pane with a vertical gradient (sky reflection)
      const g = cc.createLinearGradient(0, y, 0, y + h)
      const t = rnd()
      g.addColorStop(0, `hsl(${215 + t * 15}, 30%, ${58 + t * 14}%)`)
      g.addColorStop(1, `hsl(${215 + t * 15}, 22%, ${34 + t * 10}%)`)
      cc.fillStyle = g
      cc.fillRect(x, y, w, h)
      // mullion
      cc.fillStyle = 'rgba(40,46,58,0.55)'
      cc.fillRect(x + w / 2 - 1, y, 2, h)
      // glossy, metallic glass
      rc.fillStyle = 'rgb(28,190,0)'
      rc.fillRect(x, y, w, h)
      // a few lit interiors
      if (rnd() > 0.7) {
        ec.fillStyle = rnd() > 0.5 ? 'rgba(255,226,186,0.9)' : 'rgba(200,214,255,0.8)'
        ec.fillRect(x + 2, y + 2, w - 4, h - 4)
      }
    }
  }
  // slab line at the bottom of each floor
  cc.fillStyle = '#9ca3ad'
  for (let r = 0; r < rows; r++) cc.fillRect(0, r * rh, W, 3)
  const mk = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }
  return { map: mk(color, true), rough: mk(rough, false), emissive: mk(emis, true) }
}

/**
 * Procedural night city: instanced towers flanking the main road plus a
 * second cluster around the vehicle plaza. Density scales with quality.
 */
export function City() {
  const quality = useStore((s) => s.quality)
  const count = quality === 'high' ? 520 : quality === 'medium' ? 300 : 140
  const ref = useRef<THREE.InstancedMesh>(null)
  const maps = useMemo(() => makeFacadeMaps(), [])

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
      color.setHSL(0.6, 0.04 + d.shade * 0.05, 0.62 + d.shade * 0.3)
      m.setColorAt(i, color)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [data])

  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: maps.map,
      roughnessMap: maps.rough,
      metalnessMap: maps.rough,
      roughness: 1,
      metalness: 1,
      envMapIntensity: 1.2,
      emissive: '#ffffff',
      emissiveMap: maps.emissive,
      emissiveIntensity: 0.35,
    })
    // tile the facade per floor: instances scale a unit box, so the shader
    // derives repeats from world-space size to keep floors ~3.6m tall.
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <uv_vertex>', `#include <uv_vertex>
          {
            vec3 sx = vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]);
            vec3 sy = vec3(instanceMatrix[1][0], instanceMatrix[1][1], instanceMatrix[1][2]);
            vec3 sz = vec3(instanceMatrix[2][0], instanceMatrix[2][1], instanceMatrix[2][2]);
            vec3 n = abs(normal);
            float horiz = n.x > 0.5 ? length(sz) : length(sx);
            float floors = length(sy) / 3.6;
            float bays = horiz / 3.6;
            vec2 fuv = n.y > 0.5 ? vec2(0.02) : vec2(uv.x * bays, uv.y * floors);
            vMapUv = fuv;
            vRoughnessMapUv = fuv;
            vMetalnessMapUv = fuv;
            vEmissiveMapUv = fuv;
          }`)
    }
    return m
  }, [maps])

  useFrame(({ clock }) => {
    mat.emissiveIntensity = 0.35 + Math.sin(clock.elapsedTime * 0.7) * 0.05
  })

  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, data.length]} material={mat} frustumCulled={false} castShadow={false} receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  )
}

function TexturedGround({ length, centerZ }: { length: number; centerZ: number }) {
  const [rMap, rNor, rRough] = useTexture(ROAD_TEX)
  const [wMap, wNor, wRough] = useTexture(WALL_TEX)
  useLayoutEffect(() => {
    for (const t of [rMap, rNor, rRough]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(WORLD.roadWidth / 3.5, length / 3.5)
      t.anisotropy = 8
      t.needsUpdate = true
    }
    for (const t of [wMap, wNor, wRough]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(1.5, length / 4)
      t.anisotropy = 8
      t.needsUpdate = true
    }
  }, [rMap, rNor, rRough, wMap, wNor, wRough, length])
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, centerZ]} receiveShadow>
        <planeGeometry args={[WORLD.roadWidth, length]} />
        <meshStandardMaterial map={rMap} normalMap={rNor} roughnessMap={rRough} color="#dde1e8" roughness={1} metalness={0.05} normalScale={new THREE.Vector2(0.6, 0.6)} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`sw${s}`} position={[s * (WORLD.roadWidth / 2 + 3), 0.15, centerZ]} receiveShadow>
          <boxGeometry args={[6, 0.3, length]} />
          <meshStandardMaterial map={wMap} normalMap={wNor} roughnessMap={wRough} color="#e3e6ec" roughness={1} />
        </mesh>
      ))}
    </>
  )
}

function FlatGround({ length, centerZ }: { length: number; centerZ: number }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, centerZ]} receiveShadow>
        <planeGeometry args={[WORLD.roadWidth, length]} />
        <meshStandardMaterial color="#8c93a1" roughness={0.8} metalness={0.1} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`sw${s}`} position={[s * (WORLD.roadWidth / 2 + 3), 0.15, centerZ]} receiveShadow>
          <boxGeometry args={[6, 0.3, length]} />
          <meshStandardMaterial color="#d0d5de" roughness={0.9} />
        </mesh>
      ))}
    </>
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
      {/* asphalt + sidewalks (textured when the maps are in, flat until then) */}
      <Suspense fallback={<FlatGround length={length} centerZ={centerZ} />}>
        <TexturedGround length={length} centerZ={centerZ} />
      </Suspense>
      {/* edge lines */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * (WORLD.roadWidth / 2 - 0.3), 0.012, centerZ]}>
          <planeGeometry args={[0.16, length]} />
          <meshStandardMaterial color="#f4f5f7" roughness={0.7} />
        </mesh>
      ))}
      {/* lane dashes */}
      <instancedMesh ref={dashRef} args={[undefined, undefined, dashes.length]} frustumCulled={false}>
        <boxGeometry args={[1, 0.02, 1]} />
        <meshStandardMaterial color="#eef0f3" roughness={0.7} />
      </instancedMesh>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, centerZ]} receiveShadow>
        <planeGeometry args={[900, length + 400]} />
        <meshStandardMaterial color="#c3c8d2" roughness={1} />
      </mesh>
      {/* light poles */}
      {quality !== 'low' &&
        poles.map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 4, 0]}>
              <cylinderGeometry args={[0.06, 0.09, 8, 6]} />
              <meshStandardMaterial color="#f2f4f8" />
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
