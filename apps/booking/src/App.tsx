import { useEffect, useMemo, useState } from 'react'
import { FleetScene } from './three/FleetScene'
import { createDemoRoute } from './lib/routing'
import { PLACES, SERVICES, VEHICLES, fmtTWD, vehicleFits, type ServiceId, type VehicleId } from './lib/data'
import { useStore, useTrip } from './store'
import { AboutWorld, BusinessWorld, HeroWorld } from './three/CinematicWorlds'

const COPY = {
  en: {
    nav: ['Book', 'Business', 'About'], bookRide: 'Book a ride', language: 'Language', menu: 'Menu',
    eyebrow: 'Private mobility · Taiwan', heroA: 'Movement,', heroB: 'beautifully managed.',
    heroCopy: 'Airport transfers, private journeys and executive mobility—coordinated with precision from curb to destination.',
    plan: 'Plan your journey', discover: 'Discover Fleet OS', availability: 'Operating across Taiwan',
    bookingEyebrow: 'Intelligent booking', bookingTitle: 'One calm flow. Every detail considered.', bookingCopy: 'Build your journey step by step while the world adapts around you.',
    steps: ['Service', 'Pickup', 'Destination', 'Date & time', 'Passengers & luggage', 'Vehicle class', 'Vehicle model', 'Options', 'Review'],
    selectService: 'Choose how you want to move', pickup: 'Where should we meet you?', destination: 'Where are you going?', schedule: 'When should we arrive?',
    travellers: 'Who and what is travelling?', vehicle: 'Choose your vehicle', review: 'Review your journey',
    next: 'Continue', back: 'Back', date: 'Date', time: 'Time', passengers: 'Passengers', luggage: 'Luggage', bags: 'bags', seats: 'seats',
    pickupLabel: 'Pickup', destinationLabel: 'Destination', estimate: 'Estimated fare', distance: 'Estimated journey', request: 'Prepare booking request',
    disclaimer: 'Prototype estimate · Availability and payment are confirmed by a connected booking provider.', selected: 'Selected', unavailable: 'Does not fit',
    world: ['Arrivals concourse', 'Departure transfer', 'Urban point-to-point', 'Private rental studio', 'Executive chauffeur'],
    worldSub: ['Terminal pickup · Taoyuan', 'City pickup · Airport drop-off', 'Taiwan city network', 'Self-drive collection', 'Business district pickup'],
    businessKicker: 'Fleet OS for business', businessTitle: 'Mobility infrastructure for people who cannot be late.',
    businessCopy: 'A single premium standard for executive travel, airport programmes, employee transport and group movement.',
    pillars: [['COMFORT', 'A quiet, considered cabin experience for every passenger.'], ['SPACE', 'The right vehicle and luggage capacity, matched before dispatch.'], ['SAFETY', 'Operational checks and journey status—presented clearly, never fabricated.'], ['INTELLIGENCE', 'Booking, routing and dispatch designed as one connected system.']],
    metricA: 'service design', metricB: 'operational view', metricC: 'journey support',
    aboutKicker: 'Built for motion', aboutTitle: 'Transportation should feel effortless. The intelligence behind it should not.',
    aboutCopy: 'Fleet OS is a premium transportation interface designed around reliability, transparent capacity and thoughtful human service. This preview uses representative city environments; exact geography appears only when verified provider data is connected.',
    cities: 'Taipei · New Taipei · Taoyuan · Hsinchu · Taichung · Tainan · Kaohsiung',
    ctaTitle: 'Your next journey, precisely arranged.', footer: 'Fleet OS · Taiwan', ready: 'Request prepared', close: 'Close', loading: 'Preparing vehicle world…', fallback: 'Interactive preview unavailable. Booking remains available.',
  },
  'zh-TW': {
    nav: ['預約', '企業服務', '關於我們'], bookRide: '開始預約', language: '語言', menu: '選單',
    eyebrow: '台灣 · 私人移動服務', heroA: '讓每次移動，', heroB: '都從容有序。', heroCopy: '從機場接送、私人行程到高階商務移動，以精準安排串聯上車地點與目的地。',
    plan: '規劃您的旅程', discover: '探索 Fleet OS', availability: '服務範圍遍及台灣',
    bookingEyebrow: '智慧預約', bookingTitle: '一套從容流程，兼顧每個細節。', bookingCopy: '循序建立行程，視覺情境會隨您的選擇即時變化。',
    steps: ['服務', '上車地點', '目的地', '日期時間', '乘客與行李', '車輛級別', '車款', '加購選項', '確認'], selectService: '選擇您的移動方式', pickup: '我們要在哪裡接您？', destination: '您要前往哪裡？', schedule: '希望何時出發？',
    travellers: '同行人數與行李', vehicle: '選擇您的車輛', review: '確認您的旅程', next: '繼續', back: '返回', date: '日期', time: '時間', passengers: '乘客', luggage: '行李', bags: '件行李', seats: '座位',
    pickupLabel: '上車地點', destinationLabel: '目的地', estimate: '預估車資', distance: '預估行程', request: '準備預約需求', disclaimer: '此為預覽估價 · 車輛供應與付款將由正式預約服務確認。', selected: '已選擇', unavailable: '空間不足',
    world: ['機場抵達接送區', '機場出發接送', '城市點對點', '私人租車展示間', '行政商務接送'], worldSub: ['桃園機場 · 航廈接送', '市區上車 · 機場送達', '台灣城市移動網絡', '自駕車輛取車', '商務區專車接送'],
    businessKicker: 'Fleet OS 企業移動', businessTitle: '為分秒必爭的團隊打造移動基礎。', businessCopy: '以一致的高品質標準，整合高階主管用車、機場接送方案、員工交通與團體移動。',
    pillars: [['舒適', '為每位乘客打造安靜、細緻的車室體驗。'], ['空間', '派車前即依人數與行李，媒合真正合適的車輛。'], ['安全', '清楚呈現營運檢核與行程狀態，不虛構即時資料。'], ['智慧', '讓預約、路線與調度成為一套相互連結的系統。']],
    metricA: '服務設計', metricB: '營運視野', metricC: '全程支援', aboutKicker: '為移動而生', aboutTitle: '交通體驗應該毫不費力，背後的智慧則必須縝密。',
    aboutCopy: 'Fleet OS 以可靠營運、透明乘載資訊與細緻人性服務為核心，打造高品質交通介面。本預覽採用城市情境示意；僅在串接驗證資料後呈現精確地理資訊。',
    cities: '台北 · 新北 · 桃園 · 新竹 · 台中 · 台南 · 高雄', ctaTitle: '下一段旅程，從精準安排開始。', footer: 'Fleet OS · 台灣', ready: '需求已準備完成', close: '關閉', loading: '正在準備車輛情境…', fallback: '互動預覽目前無法使用，您仍可繼續完成預約。',
  },
} as const
type Copy = (typeof COPY)[keyof typeof COPY]

const SERVICE_NAMES: Record<ServiceId, { en: string; zh: string; detailEn: string; detailZh: string }> = {
  'airport-to-location': { en: 'Airport to location', zh: '機場至目的地', detailEn: 'Meet-and-greet terminal pickup', detailZh: '航廈接機與迎賓服務' },
  'location-to-airport': { en: 'Location to airport', zh: '地點至機場', detailEn: 'Timed departure with airport buffer', detailZh: '預留機場報到時間' },
  'location-to-location': { en: 'City journey', zh: '城市點對點', detailEn: 'Private door-to-door transfer', detailZh: '私人門到門接送' },
  'self-drive': { en: 'Self-drive rental', zh: '自駕租車', detailEn: 'Premium vehicle collection', detailZh: '高品質車輛取車服務' },
  'chauffeur': { en: 'Professional chauffeur', zh: '專業司機服務', detailEn: 'Executive vehicle and driver', detailZh: '行政車輛與專業司機' },
}



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

export default function App() {
  const locale=useStore(s=>s.locale); const c=COPY[locale]
  useEffect(()=>{document.documentElement.lang=locale;document.title=locale==='en'?'Fleet OS — Private mobility, precisely managed':'Fleet OS — 精準管理每段移動'},[locale])
  return <><Header c={c}/><main><Hero c={c}/><Booking c={c}/><Business c={c}/><About c={c}/></main></>
}
