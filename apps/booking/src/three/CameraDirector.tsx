import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
export function CameraDirector({mode}:{mode:'service'|'route'|'studio'}){const {camera}=useThree();useFrame(()=>{const target=mode==='route'?new Vector3(9,11,13):mode==='studio'?new Vector3(7,3.2,8):new Vector3(8,4.8,10);camera.position.lerp(target,.035);camera.lookAt(0,0,0)});return null}
