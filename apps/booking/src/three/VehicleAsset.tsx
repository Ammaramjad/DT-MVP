import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { VEHICLE_ASSETS } from '../lib/vehicleRegistry'
import type { VehicleId } from '../lib/data'
export function VehicleAsset({ vehicleId, ...props }: { vehicleId: VehicleId } & ThreeElements['group']) {
  const asset=VEHICLE_ASSETS[vehicleId], gltf=useGLTF(`${import.meta.env.BASE_URL}${asset.url.slice(1)}`)
  const model=useMemo(()=>gltf.scene.clone(true),[gltf.scene])
  useEffect(()=>model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true}}),[model])
  return <group {...props}><primitive object={model} scale={asset.scale}/></group>
}
