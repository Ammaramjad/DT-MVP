import { useState } from 'react'
import { SERVICES, VEHICLES } from '../../lib/data'
import { SERVICE_NAMES, type Copy } from '../../lib/experienceCopy'
import { useStore } from '../../store'
import { AboutWorld, BusinessWorld } from '../../three/CinematicWorlds'

export function ServiceExplorer({ copy }: { copy: Copy }) {
  const locale = useStore(state => state.locale)
  return <section className="services-section section-pad" id="services">
    <header className="editorial-heading"><span>01 / SERVICES</span><h2>{copy.servicesTitle}</h2><p>{copy.servicesCopy}</p></header>
    <div className="service-lines">{SERVICES.map((service, index) => {
      const name = SERVICE_NAMES[service.id]
      return <a key={service.id} href="#book" onClick={() => useStore.getState().setBooking({ service: service.id })}>
        <span>0{index + 1}</span><h3>{locale === 'en' ? name.en : name.zh}</h3><p>{locale === 'en' ? name.detailEn : name.detailZh}</p><b>↗</b>
      </a>
    })}</div>
  </section>
}

export function ValueExperience() {
  return <section className="value-section section-pad">
    <div className="value-statement"><span>02 / WHY FLEET OS</span><h2>One calm interface.<br/><em>Every moving part.</em></h2></div>
    <div className="value-track"><article><b>01</b><h3>Precisely matched</h3><p>Passengers, luggage and service context determine the right vehicle—not a generic list.</p></article><article><b>02</b><h3>World-aware</h3><p>Your origin, destination and departure time reshape the journey before you confirm.</p></article><article><b>03</b><h3>Quietly accountable</h3><p>Transparent estimates, deterministic demo data and no invented live availability.</p></article></div>
  </section>
}

export function JourneyStory({ copy }: { copy: Copy }) {
  return <section className="journey-story section-pad"><span>03 / THE JOURNEY</span><h2>{copy.howTitle}</h2><div>{copy.howSteps.map((step, index) => <article key={step[0]}><strong>0{index + 1}</strong><i /><h3>{step[0]}</h3><p>{step[1]}</p></article>)}</div></section>
}

export function FleetShowcase() {
  const setBooking = useStore(state => state.setBooking)
  return <section className="fleet-showcase section-pad"><header><span>04 / FLEET</span><h2>Form follows<br/>your journey.</h2></header><div className="fleet-marquee">{VEHICLES.map(vehicle => <article key={vehicle.id}><span>{vehicle.seats} seats · {vehicle.luggage} bags</span><h3>{vehicle.name}</h3><p>{vehicle.model}</p><button onClick={() => setBooking({ vehicle: vehicle.id })} type="button">SELECT <b>↗</b></button></article>)}</div></section>
}

export function BusinessExperience({ copy }: { copy: Copy }) {
  const [mode, setMode] = useState(0)
  return <section className="business-experience" id="business"><div className="business-copy"><span>05 / {copy.businessKicker}</span><h2>{copy.businessTitle}</h2><p>{copy.businessCopy}</p><div role="tablist" aria-label="Business capabilities">{copy.pillars.map((pillar, index) => <button key={pillar[0]} role="tab" aria-selected={mode === index} onClick={() => setMode(index)}><span>0{index + 1}</span>{pillar[0]}</button>)}</div><article key={mode}><small>ACTIVE CAPABILITY</small><h3>{copy.pillars[mode][0]}</h3><p>{copy.pillars[mode][1]}</p></article></div><div className="business-canvas"><BusinessWorld mode={mode}/><span>LIVE SYSTEM VIEW · 0{mode + 1}</span></div></section>
}

export function IntelligenceExperience() {
  return <section className="intelligence section-pad"><div><span>06 / INTELLIGENCE</span><h2>Context,<br/>not complexity.</h2></div><div className="signal"><i/><i/><i/><i/><b>FLEET<br/>INTELLIGENCE</b></div><p>Every selection feeds one scene resolver: service, place, time, capacity, route, vehicle and trip state. The interface stays simple because the system underneath is not.</p></section>
}

export function AboutExperience({ copy }: { copy: Copy }) {
  return <><section className="about-experience section-pad" id="about"><div className="about-canvas"><AboutWorld/></div><span>07 / {copy.aboutKicker}</span><h2>{copy.aboutTitle}</h2><p>{copy.aboutCopy}</p><small>{copy.cities}</small></section><section className="final-cta section-pad"><span>FLEET OS / 2030</span><h2>{copy.ctaTitle}</h2><a className="action action-primary" href="#book">{copy.plan}<b>→</b></a></section></>
}
