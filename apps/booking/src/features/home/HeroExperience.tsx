import type { Copy } from '../../lib/experienceCopy'
import { HeroWorld } from '../../three/CinematicWorlds'

export function HeroExperience({ copy }: { copy: Copy }) {
  return <section className="hero-experience" id="top">
    <div className="hero-canvas"><HeroWorld /></div><div className="hero-vignette" />
    <div className="hero-editorial">
      <p className="eyebrow"><i />FLEET OS · TAIWAN</p>
      <h1>YOUR CITY.<br/><em>IN MOTION.</em></h1>
      <p>{copy.heroCopy}</p>
      <div><a className="action action-primary" href="#book">{copy.bookRide}<span>↗</span></a><a className="action action-quiet" href="#services">{copy.discover}<span>↓</span></a></div>
    </div>
    <div className="hero-status"><span>25.0330° N · 121.5654° E</span><b><i /> {copy.availability}</b><span>REAL-TIME 3D</span></div>
  </section>
}
