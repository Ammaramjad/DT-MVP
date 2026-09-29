import { useTexture } from '@react-three/drei'
import { RepeatWrapping } from 'three'
import type { City } from '../lib/data'

const tones:Record<City,string>={Taipei:'#373d3c','New Taipei':'#414744',Taoyuan:'#4b4942',Hsinchu:'#39413f',Taichung:'#4a453d',Tainan:'#50483d',Kaohsiung:'#3c4140'}

function Tower({x,z,h,tone}:{x:number;z:number;h:number;tone:string}){
  const floors=Math.floor(h/1.15)
  return <group position={[x,0,z]}>
    <mesh castShadow receiveShadow position-y={h/2}><boxGeometry args={[3.7,h,4.5]}/><meshPhysicalMaterial color={tone} roughness={.28} metalness={.55}/></mesh>
    <mesh position={[0,h/2,2.27]}><planeGeometry args={[3.15,h-.65]}/><meshPhysicalMaterial color="#8ca09c" roughness={.12} metalness={.7} clearcoat={.6}/></mesh>
    {Array.from({length:floors},(_,i)=><mesh key={i} position={[0,.7+i*1.15,2.3]}><boxGeometry args={[3.3,.035,.04]}/><meshBasicMaterial color={i%3===0?'#d9c99c':'#192726'}/></mesh>)}
    <mesh position={[0,h+.18,0]}><boxGeometry args={[2.8,.36,3.4]}/><meshStandardMaterial color="#222827" metalness={.75} roughness={.25}/></mesh>
  </group>
}

export function CityArchitecture({city}:{city:City}) {
  const seed=city.length
  return <group>{[-1,1].flatMap(side=>[-18,-12,-6,1,8,15].map((z,i)=><Tower key={`${side}-${z}`} x={side*(7.5+(i%2)*1.4)} z={z} h={5+((i*5+seed)%8)} tone={tones[city]}/>))}
    <group position={[-7.4,0,2]}><mesh position-y={2.1} castShadow><boxGeometry args={[5,4.2,5]}/><meshPhysicalMaterial color="#555a55" metalness={.45} roughness={.24}/></mesh><mesh position={[0,1.7,2.52]}><planeGeometry args={[3.6,2.3]}/><meshPhysicalMaterial color="#8ca19d" transmission={.18} roughness={.08}/></mesh><mesh position={[0,4.5,1]}><boxGeometry args={[5.7,.22,3.6]}/><meshStandardMaterial color="#a89570" metalness={.72}/></mesh></group>
  </group>
}

export function AirportTerminal({departures=false}:{departures?:boolean}) {
  const concrete=useTexture('/textures/concrete_wall_005_diff_1k.jpg');concrete.wrapS=concrete.wrapT=RepeatWrapping;concrete.repeat.set(4,1)
  return <group position={[0,0,-12]}>
    <mesh position={[0,3.8,0]} castShadow receiveShadow><boxGeometry args={[28,7.6,6]}/><meshStandardMaterial map={concrete} color={departures?'#d8d8d1':'#aeb7b4'} roughness={.67}/></mesh>
    <mesh position={[0,3.6,3.02]}><planeGeometry args={[25,5.5]}/><meshPhysicalMaterial color="#789696" metalness={.45} roughness={.08} transmission={.3} thickness={.2}/></mesh>
    {[-10,-5,0,5,10].map(x=><mesh key={x} position={[x,3.6,3.11]}><boxGeometry args={[.1,5.6,.1]}/><meshStandardMaterial color="#d4d0c3" metalness={.7}/></mesh>)}
    <mesh position={[0,6.5,5.1]} rotation-x={-.06} castShadow><boxGeometry args={[30,.24,7.2]}/><meshStandardMaterial color="#b6b8b2" metalness={.78} roughness={.22}/></mesh>
    {[-11,-6,-1,4,9].map(x=><mesh key={x} position={[x,3.1,4.1]}><cylinderGeometry args={[.1,.14,6.1,12]}/><meshStandardMaterial color="#c9c5b9" metalness={.72}/></mesh>)}
    <group position={[-7.5,5.15,3.18]}><mesh><boxGeometry args={[5.4,1,.12]}/><meshStandardMaterial color={departures?'#166d63':'#9c7c45'} emissive={departures?'#0a4039':'#4c3519'} emissiveIntensity={.45}/></mesh></group>
    {[-5,-3,-1,1,3,5].map(x=><mesh key={x} position={[x*1.45,.42,5]}><cylinderGeometry args={[.1,.16,.84,12]}/><meshStandardMaterial color="#ada99f" metalness={.6}/></mesh>)}
  </group>
}

export function HotelCurb(){return <group position={[0,0,-10]}><mesh position={[0,4.5,0]} castShadow><boxGeometry args={[20,9,6]}/><meshStandardMaterial color="#202423" metalness={.5} roughness={.32}/></mesh><mesh position={[0,4,3.03]}><planeGeometry args={[13,5.5]}/><meshPhysicalMaterial color="#657c79" metalness={.7} roughness={.08} transmission={.2}/></mesh><mesh position={[0,6,5.2]} castShadow><boxGeometry args={[14,.28,7]}/><meshStandardMaterial color="#b69a67" metalness={.8} roughness={.2}/></mesh>{[-5,0,5].map(x=><mesh key={x} position={[x,3,4]}><cylinderGeometry args={[.13,.13,6,16]}/><meshStandardMaterial color="#b69a67" metalness={.8}/></mesh>)}</group>}
