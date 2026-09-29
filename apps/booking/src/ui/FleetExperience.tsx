import { useEffect, useMemo, useState } from 'react'
import { FleetScene } from '../three/FleetScene'
import { createDemoRoute } from '../lib/routing'
import { PLACES, SERVICES, VEHICLES, fmtTWD, vehicleFits, type VehicleId } from '../lib/data'
import { useStore, useTrip } from '../store'
import { AboutWorld, BusinessWorld, HeroWorld } from '../three/CinematicWorlds'

import { COPY, SERVICE_NAMES, type Copy } from '../lib/experienceCopy'
function Header({ c }: { c: Copy }) {
  const locale = useStore(s => s.locale); const setLocale = useStore(s => s.setLocale); const [open, setOpen] = useState(false)
  return <header className="topbar"><a href="#top" className="brand" aria-label="Fleet OS"><span className="brand-mark"><i /><i /></span><b>FLEET OS</b></a>
    <nav className={open ? 'is-open' : ''}>{c.nav.map((n, i) => <a key={n} href={['#book', '#business', '#about'][i]} onClick={() => setOpen(false)}>{n}</a>)}</nav>
    <div className="top-actions"><label className="locale"><span>{c.language}</span><select value={locale} onChange={e => setLocale(e.target.value as 'en' | 'zh-TW')}><option value="en">EN</option><option value="zh-TW">繁中</option></select></label><a href="#book" className="button button-dark">{c.bookRide}<span>↗</span></a><button className="menu" aria-label={c.menu} onClick={() => setOpen(!open)}><i /><i /></button></div>
  </header>
}

function Hero({ c }: { c: Copy }) {
  return <section className="hero hero-2030" id="top"><div className="hero-world"><HeroWorld/></div><div className="hero-shade"/><div className="hero-copy"><p className="kicker"><i />{c.eyebrow}</p><h1>{c.heroA}<br/><em>{c.heroB}</em></h1><p className="lead">{c.heroCopy}</p><div className="hero-actions"><a className="button button-accent" href="#book">{c.bookRide}<span>↗</span></a></div></div>
    <div className="hero-caption"><span>25.0330° N</span><b>{c.availability}</b><span>INTERACTIVE / DRAG</span></div>
  </section>
}

function StepContent({ c, step, setStep }: { c: Copy; step: number; setStep: (n:number)=>void }) {
  const b = useStore(s=>s.booking), set = useStore(s=>s.setBooking), trip = useTrip(), locale=useStore(s=>s.locale)
  const title=[c.selectService,c.pickup,c.destination,c.schedule,c.travellers,c.vehicle,c.vehicle,locale==='en'?'Journey options':'行程選項',c.review][step]
  const next=()=>setStep(Math.min(8,step+1)); const back=()=>setStep(Math.max(0,step-1))
  return <div className="booking-panel"><div className="panel-head"><span>{String(step+1).padStart(2,'0')} / 09</span><h3>{title}</h3></div>
    <div className="panel-body">
      {step===0&&<div className="service-list">{SERVICES.map(s=>{const n=SERVICE_NAMES[s.id];return <button key={s.id} className={b.service===s.id?'active':''} onClick={()=>set({service:s.id})}><i/><span><b>{locale==='en'?n.en:n.zh}</b><small>{locale==='en'?n.detailEn:n.detailZh}</small></span><em>↗</em></button>})}</div>}
      {(step===1||step===2)&&<div className="place-list">{PLACES.slice(step===1?0:2,step===1?6:9).map(p=><button className={(step===1?b.pickup:b.destination)?.id===p.id?'active':''} key={p.id} onClick={()=>set(step===1?{pickup:p}:{destination:p})}><i/><span><b>{p.name}</b><small>{p.area}</small></span><em>→</em></button>)}</div>}
      {step===3&&<div className="schedule-grid"><label><span>{c.date}</span><input type="date" value={b.date} onChange={e=>set({date:e.target.value})}/></label><label><span>{c.time}</span><input type="time" value={b.time} onChange={e=>set({time:e.target.value})}/></label></div>}
      {step===4&&<div className="counters">{[['passengers',c.passengers,1,8],['luggage',c.luggage,0,8]].map(([key,label,min,max])=>{const value=b[key as 'passengers'|'luggage'];return <div key={key as string}><span>{label}</span><button onClick={()=>set({[key as string]:Math.max(min as number,value-1)})}>−</button><b>{value}</b><button onClick={()=>set({[key as string]:Math.min(max as number,value+1)})}>+</button></div>})}</div>}
      {(step===5||step===6)&&<div className="vehicle-list">{VEHICLES.map(v=>{const fits=vehicleFits(v,b.passengers,b.luggage);return <button key={v.id} disabled={!fits} className={b.vehicle===v.id?'active':''} onClick={()=>set({vehicle:v.id as VehicleId})}><span><b>{v.name}</b><small>{v.model}</small></span><span className="vehicle-cap">{v.seats} {c.seats} · {v.luggage} {c.bags}<strong>{fits?fmtTWD(trip.fareFor(v.id)):c.unavailable}</strong></span></button>})}</div>}
      {step===7&&<div className="options-list"><label><input type="checkbox"/> {locale==='en'?'Meet & greet at pickup':'上車地點迎賓服務'}</label><label><input type="checkbox"/> {locale==='en'?'Quiet ride preference':'偏好安靜乘車'}</label><label><input type="checkbox"/> {locale==='en'?'Child seat request':'兒童安全座椅需求'}</label></div>}
      {step===8&&<div className="review-card"><div><span>{c.pickupLabel}</span><b>{b.pickup?.name}</b></div><div><span>{c.destinationLabel}</span><b>{b.destination?.name}</b></div><div><span>{c.date}</span><b>{b.date} · {b.time}</b></div><div><span>{c.vehicle}</span><b>{trip.spec.name} · {b.passengers} {c.passengers.toLowerCase()}</b></div><div className="review-price"><span>{c.estimate}</span><b>{fmtTWD(trip.fare)}</b><small>{trip.km.toFixed(0)} km · {trip.duration} min</small></div><p>{c.disclaimer}</p></div>}
    </div><div className="panel-foot">{step>0?<button className="back" onClick={back}>← {c.back}</button>:<span/>}<button className="button button-accent" onClick={step===8?()=>useStore.getState().confirm():next}>{step===8?c.request:c.next}<span>→</span></button></div>
  </div>
}

function Booking({ c }: { c: Copy }) {
  const [step,setStep]=useState(0), service=useStore(s=>s.booking.service), confirmed=useStore(s=>s.confirmed), reset=useStore(s=>s.reset)
  const index=SERVICES.findIndex(s=>s.id===service), booking=useStore(s=>s.booking), trip=useTrip()
  const route=useMemo(()=>createDemoRoute(booking.pickup??PLACES[0],booking.destination??PLACES[3]),[booking.pickup,booking.destination])
  return <section className="booking" id="book"><div className="section-intro"><p className="kicker"><i/>{c.bookingEyebrow}</p><h2>{c.bookingTitle}</h2><p>{c.bookingCopy}</p></div>
    <div className="booking-shell"><aside className="step-rail">{c.steps.map((s,i)=><button className={i===step?'active':i<step?'done':''} onClick={()=>i<=step&&setStep(i)} key={s}><i>{i<step?'✓':i+1}</i><span>{s}</span></button>)}</aside>
      <div className="world"><div className="world-meta"><span>LIVE SCENE · 0{index+1}</span><h3>{c.world[index]}</h3><p>{c.worldSub[index]}</p></div><FleetScene service={service} pickup={booking.pickup??PLACES[0]} vehicle={booking.vehicle} route={route} phase={step>=8?'route':'service'} progress={step>=8?.72:0}/><div className="world-controls"><span>360°</span><small>DRAG TO EXPLORE</small></div></div>
      <StepContent c={c} step={step} setStep={setStep}/></div>
    {confirmed&&<TripLifecycle c={c} routeId={route.routeId} vehicle={trip.spec.name} onClose={reset}/>}
  </section>
}

function TripLifecycle({c,routeId,vehicle,onClose}:{c:Copy;routeId:string;vehicle:string;onClose:()=>void}) {
  const locale=useStore(s=>s.locale), [stage,setStage]=useState(0)
  const labels=locale==='en'?['Booked','Matching driver','Driver approach','Driver arrived','Pickup','Travelling','Arrived']:['已預約','媒合司機','司機前往中','司機已抵達','乘客上車','行程中','已抵達']
  useEffect(()=>{const timer=setInterval(()=>setStage(x=>Math.min(6,x+1)),1800);return()=>clearInterval(timer)},[])
  return <div className="trip-lifecycle" role="status"><header><span>{locale==='en'?'DEMO JOURNEY · SIMULATED':'示範行程 · 模擬資料'}</span><button onClick={onClose}>{c.close}</button></header><b>{labels[stage]}</b><small>{vehicle} · {routeId}</small><ol>{labels.map((x,i)=><li className={i<=stage?'active':''} key={x}><i/>{x}</li>)}</ol></div>
}

function Business({c}:{c:Copy}) { const [mode,setMode]=useState(0); return <section className="business business-2030" id="business"><div className="business-editorial"><p className="kicker light"><i/>{c.businessKicker}</p><h2>{c.businessTitle}</h2><p>{c.businessCopy}</p><div className="business-tabs" role="tablist">{c.pillars.map((p,i)=><button role="tab" aria-selected={mode===i} className={mode===i?'active':''} onClick={()=>setMode(i)} key={p[0]}><span>0{i+1}</span><b>{p[0]}</b></button>)}</div><div className="business-statement" key={mode}><span>0{mode+1} / 04</span><h3>{c.pillars[mode][0]}</h3><p>{c.pillars[mode][1]}</p></div></div><div className="business-world"><BusinessWorld mode={mode}/><span className="scene-tag">3D / {c.pillars[mode][0]}</span></div></section> }

function About({c}:{c:Copy}) { return <><section className="about about-2030" id="about"><div className="about-world"><AboutWorld/></div><div className="about-index">F—OS<br/>2030</div><div><p className="kicker"><i/>{c.aboutKicker}</p><h2>{c.aboutTitle}</h2></div><div className="about-copy"><p>{c.aboutCopy}</p><span>{c.cities}</span></div></section><section className="closing"><span>FLEET OS / TAIWAN</span><h2>{c.ctaTitle}</h2><a href="#book" className="button button-accent">{c.plan}<span>→</span></a><footer><b>FLEET OS</b><span>© {new Date().getFullYear()} {c.footer}</span></footer></section></> }

export default function FleetExperience() {
  const locale=useStore(s=>s.locale); const c=COPY[locale]
  useEffect(()=>{document.documentElement.lang=locale;document.title=locale==='en'?'Fleet OS — Private mobility, precisely managed':'Fleet OS — 精準管理每段移動'},[locale])
  return <><Header c={c}/><main><Hero c={c}/><Booking c={c}/><Business c={c}/><About c={c}/></main></>
}
