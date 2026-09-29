import * as THREE from 'three'
import type { RefObject } from 'react'

/**
 * Stable container for drei <Html> portals. Without an explicit portal, Html
 * re-targets to R3F's connected event element after mount and tears down its
 * DOM root mid-commit, which React 19 reports as a synchronous unmount.
 */
export const htmlPortal = { current: null } as unknown as RefObject<HTMLDivElement>

/** World layout — everything in metres. The main road runs along -Z. */
export const WORLD = {
  heroCar: new THREE.Vector3(0, 0, 0),
  pickup: new THREE.Vector3(3.2, 0, -70),
  destination: new THREE.Vector3(-3.2, 0, -230),
  plaza: new THREE.Vector3(46, 0, -250),
  roadWidth: 22,
  roadFrom: 80,
  roadTo: -330,
  fleet: new THREE.Vector3(700, 0, 0),
  why: new THREE.Vector3(1400, 0, 0),
  studio: new THREE.Vector3(2100, 0, 0),
}

export const routeCurve = new THREE.CatmullRomCurve3(
  [
    WORLD.pickup.clone().add(new THREE.Vector3(0, 0.1, 0)),
    new THREE.Vector3(5.5, 0.1, -110),
    new THREE.Vector3(-1, 0.1, -150),
    new THREE.Vector3(-6, 0.1, -190),
    WORLD.destination.clone().add(new THREE.Vector3(0, 0.1, 0)),
  ],
  false,
  'catmullrom',
  0.5,
)

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
export const smooth = (v: number) => {
  const t = clamp01(v)
  return t * t * (3 - 2 * t)
}
export const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a))
export const damp = THREE.MathUtils.damp
