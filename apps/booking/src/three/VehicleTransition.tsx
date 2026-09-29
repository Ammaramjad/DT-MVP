import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { VehicleId } from '../lib/data'
import { VehicleAsset } from './VehicleAsset'

/** Sequential vehicle hand-off: the current vehicle clears the stage before its replacement enters. */
export function VehicleTransition({ vehicle, position = [0, 0, 0], rotationY = 0 }: { vehicle: VehicleId; position?: [number, number, number]; rotationY?: number }) {
  const group = useRef<THREE.Group>(null)
  const [displayed, setDisplayed] = useState(vehicle)
  const requested = useRef(vehicle)
  const phase = useRef<'idle' | 'exit' | 'enter'>('idle')

  useEffect(() => {
    requested.current = vehicle
    if (vehicle !== displayed) phase.current = 'exit'
  }, [vehicle, displayed])

  useFrame((_, delta) => {
    if (!group.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const speed = reduced ? 30 : 8
    if (phase.current === 'exit') {
      group.current.position.x += delta * speed
      if (group.current.position.x > position[0] + 8) {
        setDisplayed(requested.current)
        group.current.position.x = position[0] - 8
        phase.current = 'enter'
      }
    } else if (phase.current === 'enter') {
      group.current.position.x = Math.min(position[0], group.current.position.x + delta * speed)
      if (group.current.position.x >= position[0]) phase.current = 'idle'
    }
  })

  return <group ref={group} position={position} rotation-y={rotationY}><VehicleAsset vehicleId={displayed} /></group>
}
