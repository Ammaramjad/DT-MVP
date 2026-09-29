import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { CatmullRomCurve3, RepeatWrapping, TubeGeometry, Vector3 } from 'three'
import type { Route } from '../lib/routing'

export function RoadSurface({length=44,width=8}:{length?:number;width?:number}) {
  const [asphalt,normal,roughness]=useTexture(['/textures/asphalt_02_diff_1k.jpg','/textures/asphalt_02_nor_gl_1k.jpg','/textures/asphalt_02_rough_1k.jpg'])
  for(const map of [asphalt,normal,roughness]){map.wrapS=map.wrapT=RepeatWrapping;map.repeat.set(2,length/6)}
  return <group>
    <mesh rotation-x={-Math.PI/2} receiveShadow><planeGeometry args={[width,length]}/><meshStandardMaterial map={asphalt} normalMap={normal} roughnessMap={roughness} roughness={.92}/></mesh>
    {[-1,1].map(side=><group key={side} position={[side*(width/2+.7),.12,0]}><mesh receiveShadow><boxGeometry args={[1.4,.24,length]}/><meshStandardMaterial color="#777b78" roughness={.82}/></mesh><mesh position={[-side*.72,.04,0]}><boxGeometry args={[.12,.12,length]}/><meshStandardMaterial color="#d7d4c9"/></mesh></group>)}
    {Array.from({length:Math.floor(length/4)},(_,i)=><mesh key={i} position={[0,.025,-length/2+2+i*4]} rotation-x={-Math.PI/2}><planeGeometry args={[.09,2]}/><meshStandardMaterial color="#ddd8c8" roughness={.7}/></mesh>)}
  </group>
}

export function RouteRibbon({route}:{route:Route}) {
  const geometry=useMemo(()=>{
    const curve=new CatmullRomCurve3(route.geometry.map(([x,z])=>new Vector3(x,.06,z)),false,'catmullrom',.25)
    return new TubeGeometry(curve,80,.07,8,false)
  },[route])
  return <mesh geometry={geometry}><meshStandardMaterial color="#48e0bb" emissive="#147f69" emissiveIntensity={2} metalness={.4} roughness={.3}/></mesh>
}
