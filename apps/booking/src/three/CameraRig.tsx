import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { SECTION_ORDER, scrollState, useStore, type SectionId } from '../store'
import { WORLD, clamp01, damp, smooth } from './world'

/** Shared per-frame state for things the camera needs to follow. */
export const rigState = {
  journeyPos: new THREE.Vector3(),
  journeyDir: new THREE.Vector3(0, 0, -1),
  plazaFocus: new THREE.Vector3(),
}

type KF = { t: number; pos: THREE.Vector3; look: THREE.Vector3; fov?: number }
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const P = WORLD.pickup
const D = WORLD.destination
const PL = WORLD.plaza

function sample(kfs: KF[], t: number, outPos: THREE.Vector3, outLook: THREE.Vector3): number {
  if (t <= kfs[0].t) {
    outPos.copy(kfs[0].pos)
    outLook.copy(kfs[0].look)
    return kfs[0].fov ?? 40
  }
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i]
    const b = kfs[i + 1]
    if (t >= a.t && t <= b.t) {
      const k = smooth((t - a.t) / (b.t - a.t))
      outPos.lerpVectors(a.pos, b.pos, k)
      outLook.lerpVectors(a.look, b.look, k)
      return THREE.MathUtils.lerp(a.fov ?? 40, b.fov ?? 40, k)
    }
  }
  const last = kfs[kfs.length - 1]
  outPos.copy(last.pos)
  outLook.copy(last.look)
  return last.fov ?? 40
}

const heroEnd = { pos: v(2, 12, -28), look: v(P.x, 0, P.z) }
const pickupEnd = { pos: v(P.x + 16, 8, P.z + 14), look: v(P.x, 1.5, P.z) }
const destEnd = { pos: v(D.x - 10, 14, D.z + 26), look: v(D.x, 1, D.z) }
const chooseStart = { pos: v(PL.x, 3.6, PL.z + 16), look: v(PL.x, 0.9, PL.z) }
const chooseEnd = { pos: v(PL.x - 4, 3.2, PL.z + 15), look: v(PL.x, 0.9, PL.z) }
const confirmEnd = { pos: v(4, 130, -150), look: v(0, 0, -152) }

const KEYS: Partial<Record<SectionId, KF[]>> = {
  hero: [
    { t: 0, pos: v(6.5, 2.1, 7.5), look: v(0, 0.7, 0), fov: 36 },
    { t: 0.5, pos: v(-3, 4.5, -6), look: v(0, 0.6, -14), fov: 40 },
    { t: 1, pos: heroEnd.pos, look: heroEnd.look, fov: 42 },
  ],
  pickup: [
    { t: 0, pos: heroEnd.pos, look: heroEnd.look, fov: 42 },
    { t: 0.45, pos: v(P.x - 12, 16, P.z + 30), look: v(P.x, 0, P.z), fov: 42 },
    { t: 1, pos: pickupEnd.pos, look: pickupEnd.look, fov: 40 },
  ],
  destination: [
    { t: 0, pos: pickupEnd.pos, look: pickupEnd.look, fov: 40 },
    { t: 0.35, pos: v(10, 12, -112), look: v(-1, 0, -150), fov: 44 },
    { t: 0.7, pos: v(-8, 11, -170), look: v(D.x, 0, D.z), fov: 44 },
    { t: 1, pos: destEnd.pos, look: destEnd.look, fov: 40 },
  ],
  choose: [
    { t: 0, pos: destEnd.pos, look: destEnd.look, fov: 40 },
    { t: 0.28, pos: v(PL.x - 30, 10, PL.z + 40), look: v(PL.x, 0.8, PL.z), fov: 40 },
    { t: 0.5, pos: chooseStart.pos, look: chooseStart.look, fov: 34 },
    { t: 1, pos: chooseEnd.pos, look: chooseEnd.look, fov: 34 },
  ],
  confirm: [
    { t: 0, pos: chooseEnd.pos, look: chooseEnd.look, fov: 34 },
    { t: 0.6, pos: v(30, 90, -170), look: v(0, 0, -150), fov: 40 },
    { t: 1, pos: confirmEnd.pos, look: confirmEnd.look, fov: 40 },
  ],
  fleet: [
    { t: 0, pos: WORLD.fleet.clone().add(v(64, 56, 64)), look: WORLD.fleet.clone(), fov: 34 },
    { t: 1, pos: WORLD.fleet.clone().add(v(30, 50, 80)), look: WORLD.fleet.clone().add(v(-6, 0, -6)), fov: 34 },
  ],
  why: [
    { t: 0, pos: WORLD.why.clone().add(v(0, 1.6, 30)), look: WORLD.why.clone().add(v(0, 1.2, 0)), fov: 38 },
    { t: 1, pos: WORLD.why.clone().add(v(0, 2.6, 22)), look: WORLD.why.clone().add(v(0, 1.4, 0)), fov: 38 },
  ],
  showcase: [
    { t: 0, pos: WORLD.studio.clone().add(v(0, 1.6, 11.5)), look: WORLD.studio.clone().add(v(0, 0.7, 0)), fov: 34 },
    { t: 0.5, pos: WORLD.studio.clone().add(v(0, 2.8, 10)), look: WORLD.studio.clone().add(v(0, 0.6, 0)), fov: 34 },
    { t: 1, pos: WORLD.studio.clone().add(v(0, 1.4, 12.5)), look: WORLD.studio.clone().add(v(0, 0.8, 0)), fov: 34 },
  ],
  outro: [
    { t: 0, pos: WORLD.studio.clone().add(v(0, 1.4, 12.5)), look: WORLD.studio.clone().add(v(0, 0.8, 0)), fov: 34 },
    { t: 1, pos: WORLD.studio.clone().add(v(0, 6, 22)), look: WORLD.studio.clone().add(v(0, 0.8, 0)), fov: 30 },
  ],
}

export function currentSection(): { id: SectionId; p: number } {
  let id: SectionId = 'hero'
  for (const s of SECTION_ORDER) {
    const p = scrollState.p[s]
    if (p >= 0) id = s
  }
  return { id, p: clamp01(scrollState.p[id]) }
}

export function CameraRig() {
  const { camera } = useThree()
  const isMobile = useStore((s) => s.isMobile)
  const tmp = useMemo(
    () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), curLook: new THREE.Vector3(0, 0.7, 0), curPos: new THREE.Vector3(6.5, 2.1, 7.5), fov: 36, q: new THREE.Quaternion(), m: new THREE.Matrix4() }),
    [],
  )

  useFrame((state, dt) => {
    const { id, p } = currentSection()
    const t = state.clock.elapsedTime
    const kfs = KEYS[id] ?? KEYS.hero!
    let fov = sample(kfs, p, tmp.pos, tmp.look)

    // Hero idle orbit blends out as the user starts scrolling.
    if (id === 'hero') {
      const idle = 1 - smooth(p * 3)
      const a = t * 0.12
      const r = 8.6
      tmp.pos.x = THREE.MathUtils.lerp(tmp.pos.x, Math.sin(a) * r + 1.5, idle)
      tmp.pos.z = THREE.MathUtils.lerp(tmp.pos.z, Math.cos(a) * r, idle)
      tmp.pos.y = THREE.MathUtils.lerp(tmp.pos.y, 2 + Math.sin(t * 0.3) * 0.4, idle)
    }

    // Journey: camera follows the moving vehicle with stage-specific framing.
    if (id === 'journey') {
      const jp = rigState.journeyPos
      const dir = rigState.journeyDir
      if (p < 0.42) {
        // Waiting at the pickup, watching the driver approach.
        const k = smooth(p / 0.42)
        tmp.pos.set(P.x + 12, 5 + k * 2, P.z + 10 + k * 6)
        tmp.look.lerpVectors(v(P.x, 1, P.z), jp, 0.35)
        fov = 40
      } else if (p < 0.64) {
        // "Track your journey": rise above the route.
        const k = smooth((p - 0.42) / 0.22)
        tmp.pos.set(jp.x - dir.x * 10 + 6, THREE.MathUtils.lerp(6, 42, k), jp.z - dir.z * 10 + 8)
        tmp.look.copy(jp)
        fov = 42
      } else if (p < 0.9) {
        // Chase cam behind the vehicle.
        const k = smooth((p - 0.64) / 0.26)
        tmp.pos.set(jp.x - dir.x * 12 + 4, THREE.MathUtils.lerp(42, 5, k), jp.z - dir.z * 12)
        tmp.look.copy(jp).add(dir.clone().multiplyScalar(6))
        fov = 42
      } else {
        // Arrival: low, still, cinematic.
        const k = smooth((p - 0.9) / 0.1)
        tmp.pos.set(D.x + 9 - k * 3, 2.2 + k, D.z + 9)
        tmp.look.set(D.x, 1, D.z)
        fov = 36
      }
    }

    // Pointer parallax
    const mx = isMobile ? 0 : scrollState.mx
    const my = isMobile ? 0 : scrollState.my
    const par = id === 'showcase' || id === 'why' || id === 'choose' ? 0.9 : 0.5
    tmp.pos.x += mx * par
    tmp.pos.y += -my * par * 0.5
    tmp.look.x += mx * par * 0.3

    const lam = id === 'hero' ? 2.5 : 4
    tmp.curPos.x = damp(tmp.curPos.x, tmp.pos.x, lam, dt)
    tmp.curPos.y = damp(tmp.curPos.y, tmp.pos.y, lam, dt)
    tmp.curPos.z = damp(tmp.curPos.z, tmp.pos.z, lam, dt)
    tmp.curLook.x = damp(tmp.curLook.x, tmp.look.x, lam + 1, dt)
    tmp.curLook.y = damp(tmp.curLook.y, tmp.look.y, lam + 1, dt)
    tmp.curLook.z = damp(tmp.curLook.z, tmp.look.z, lam + 1, dt)
    tmp.fov = damp(tmp.fov, fov, 3, dt)

    // Hard cut between worlds: snap instead of tweening across the void.
    if (scrollState.cut > 0.97) {
      tmp.curPos.copy(tmp.pos)
      tmp.curLook.copy(tmp.look)
    }

    camera.position.copy(tmp.curPos)
    camera.lookAt(tmp.curLook)
    const pc = camera as THREE.PerspectiveCamera
    if (Math.abs(pc.fov - tmp.fov) > 0.01) {
      pc.fov = tmp.fov
      pc.updateProjectionMatrix()
    }
  })
  return null
}
