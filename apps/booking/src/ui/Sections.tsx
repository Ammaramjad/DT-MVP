import { useEffect, useRef, type ReactNode } from 'react'
import { VEHICLES, fmtTWD } from '../lib/data'
import { scrollToSection } from '../lib/scroll'
import { JOURNEY_STAGES, SHOWCASE, WHY_ITEMS } from '../lib/content'
import { useStore, useTrip, type SectionId } from '../store'
import { PlaceSearch } from './PlaceSearch'

function Scene({ id, h, children, className = '' }: { id: SectionId; h: number; children: ReactNode; className?: string }) {
  return (
    <section data-section={id} id={id} className={`scene scene--${id} ${className}`} style={{ height: `${h}vh` }}>
      <div className="scene__sticky">{children}</div>
    </section>
  )
}

export function Hero() {
  return (
    <Scene id="hero" h={170}>
      <div className="hero">
        <p className="eyebrow hero__eyebrow">
          <span>AURA</span> · Premium transportation
        </p>
        <h1 className="hero__title">
          <span className="line">Your Journey.</span>
          <span className="line line--accent">Reimagined.</span>
        </h1>
        <p className="hero__sub">Premium transportation, intelligently connected.</p>
        <div className="hero__cta">
          <button className="btn btn--primary" onClick={() => scrollToSection('pickup')}>
            Book your ride
          </button>
          <button className="btn btn--ghost" onClick={() => scrollToSection('journey')}>
            Explore the experience
          </button>
        </div>
        <div className="hero__scroll" aria-hidden>
          <span />
          Scroll to enter the city
        </div>
      </div>
    </Scene>
  )
}

export function Pickup() {
  const b = useStore((s) => s.booking)
  const set = useStore((s) => s.setBooking)
  return (
    <Scene id="pickup" h={230}>
      <div className="story story--left">
        <p className="eyebrow">01 — Pickup</p>
        <h2 className="story__title">Where should we pick you up?</h2>
        <div className="glass glass--panel">
          <PlaceSearch value={b.pickup} onChange={(p) => set({ pickup: p })} placeholder="Search a pickup point" />
          <div className="glass__foot">
            <span>Airports · Stations · Hotels · Any address</span>
            <button className="btn btn--text" onClick={() => scrollToSection('destination')}>
              Next →
            </button>
          </div>
        </div>
      </div>
    </Scene>
  )
}

export function Destination() {
  const b = useStore((s) => s.booking)
  const set = useStore((s) => s.setBooking)
  const trip = useTrip()
  return (
    <Scene id="destination" h={230}>
      <div className="story story--right">
        <p className="eyebrow">02 — Destination</p>
        <h2 className="story__title">Where are you going?</h2>
        <div className="glass glass--panel">
          <PlaceSearch value={b.destination} onChange={(p) => set({ destination: p })} placeholder="Search a destination" tone="gold" />
          <div className="glass__foot">
            <span>
              {trip.km.toFixed(0)} km · ~{trip.duration} min
            </span>
            <button className="btn btn--text" onClick={() => scrollToSection('choose')}>
              Choose a ride →
            </button>
          </div>
        </div>
      </div>
    </Scene>
  )
}

export function Choose() {
  const b = useStore((s) => s.booking)
  const set = useStore((s) => s.setBooking)
  const isMobile = useStore((s) => s.isMobile)
  const webgl = useStore((s) => s.webgl)
  const trip = useTrip()
  const spec = VEHICLES.find((v) => v.id === b.vehicle) ?? VEHICLES[0]
  const domCard = isMobile || !webgl
  const touch = useRef<{ x: number; y: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Mobile: swipe horizontally over the section to change vehicle.
  useEffect(() => {
    if (!isMobile || !ref.current) return
    const el = ref.current
    const start = (e: TouchEvent) => {
      touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    const end = (e: TouchEvent) => {
      if (!touch.current) return
      const dx = e.changedTouches[0].clientX - touch.current.x
      const dy = e.changedTouches[0].clientY - touch.current.y
      touch.current = null
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
      const i = VEHICLES.findIndex((v) => v.id === b.vehicle)
      const n = Math.max(0, Math.min(VEHICLES.length - 1, i + (dx < 0 ? 1 : -1)))
      set({ vehicle: VEHICLES[n].id })
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchend', end, { passive: true })
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchend', end)
    }
  }, [isMobile, b.vehicle, set])

  return (
    <Scene id="choose" h={320}>
      <div ref={ref} className="choose">
        <div className="choose__head">
          <p className="eyebrow">03 — Choose your ride</p>
          <h2 className="story__title">Choose your ride</h2>
          <p className="story__hint">{isMobile ? 'Swipe to browse. Tap a vehicle for details.' : 'Hover a vehicle to see price, capacity and ETA. Click to select.'}</p>
        </div>
        <div className="glass tripbar">
          <label>
            <span>Date</span>
            <input type="date" value={b.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <label>
            <span>Time</span>
            <input type="time" value={b.time} onChange={(e) => set({ time: e.target.value })} />
          </label>
          <label>
            <span>Passengers</span>
            <div className="stepper">
              <button aria-label="Fewer passengers" onClick={() => set({ passengers: Math.max(1, b.passengers - 1) })}>
                −
              </button>
              <b>{b.passengers}</b>
              <button aria-label="More passengers" onClick={() => set({ passengers: Math.min(7, b.passengers + 1) })}>
                +
              </button>
            </div>
          </label>
          <div className="tripbar__fare">
            <span>Estimated fare</span>
            <b>{fmtTWD(trip.fare)}</b>
          </div>
        </div>
        <div className="chips" role="tablist" aria-label="Vehicle category">
          {VEHICLES.map((v) => (
            <button key={v.id} role="tab" aria-selected={b.vehicle === v.id} className={`chip ${b.vehicle === v.id ? 'is-active' : ''} ${v.seats < b.passengers ? 'is-small' : ''}`} onClick={() => set({ vehicle: v.id })}>
              {v.name}
              <small>{fmtTWD(trip.fareFor(v.id))}</small>
            </button>
          ))}
        </div>
        {domCard && (
          <div className="glass ridecard" key={spec.id}>
            <div className="ridecard__head">
              <span className="ridecard__name">{spec.name}</span>
              <span className="ridecard__price">{fmtTWD(trip.fare)}</span>
            </div>
            <div className="ridecard__meta">
              <span>{spec.seats} seats</span>
              <span>{spec.luggage} bags</span>
              <span>ETA {spec.etaMin} min</span>
            </div>
            <button className="btn btn--primary" onClick={() => scrollToSection('confirm')}>
              Book this ride
            </button>
          </div>
        )}
      </div>
    </Scene>
  )
}

export function Confirm() {
  const trip = useTrip()
  const confirmed = useStore((s) => s.confirmed)
  const confirm = useStore((s) => s.confirm)
  const reset = useStore((s) => s.reset)
  const dt = new Date(`${trip.date}T${trip.time}`)
  const when = isNaN(dt.getTime()) ? `${trip.date} ${trip.time}` : dt.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return (
    <Scene id="confirm" h={190}>
      <div className="confirm">
        <div className={`glass confirm__card ${confirmed ? 'is-confirmed' : ''}`}>
          <p className="eyebrow">04 — {confirmed ? 'Confirmed' : 'Confirm your journey'}</p>
          <h2 className="story__title">{confirmed ? 'Your journey begins.' : 'Confirm your journey'}</h2>
          <div className="confirm__route">
            <div>
              <small>Pickup</small>
              <b>{trip.pickup?.name}</b>
            </div>
            <i className="confirm__arrow" aria-hidden />
            <div>
              <small>Destination</small>
              <b>{trip.destination?.name}</b>
            </div>
          </div>
          <dl className="confirm__grid">
            <div>
              <dt>When</dt>
              <dd>{when}</dd>
            </div>
            <div>
              <dt>Vehicle</dt>
              <dd>{trip.spec.name}</dd>
            </div>
            <div>
              <dt>Passengers</dt>
              <dd>{trip.passengers}</dd>
            </div>
            <div>
              <dt>Distance</dt>
              <dd>
                {trip.km.toFixed(0)} km · {trip.duration} min
              </dd>
            </div>
            <div className="confirm__fare">
              <dt>Estimated fare</dt>
              <dd>{fmtTWD(trip.fare)}</dd>
            </div>
          </dl>
          {!confirmed ? (
            <div className="confirm__actions">
              <button className="btn btn--text" onClick={() => scrollToSection('choose')}>
                ← Change ride
              </button>
              <button
                className="btn btn--primary btn--lg"
                onClick={() => {
                  confirm()
                  setTimeout(() => scrollToSection('journey'), 500)
                }}
              >
                Confirm booking
              </button>
            </div>
          ) : (
            <div className="confirm__actions">
              <span className="confirm__ok">Driver matched · Reference AU-{(trip.fare * 7919).toString(36).toUpperCase().slice(0, 6)}</span>
              <button className="btn btn--ghost" onClick={reset}>
                New booking
              </button>
            </div>
          )}
        </div>
      </div>
    </Scene>
  )
}

export function Journey() {
  const stage = useStore((s) => s.journeyStage)
  const cur = JOURNEY_STAGES[stage] ?? JOURNEY_STAGES[0]
  return (
    <Scene id="journey" h={480}>
      <div className="journey">
        <div className="journey__head">
          <p className="eyebrow">05 — From request to arrival</p>
          <h2 className="story__title story__title--live" key={cur.key}>
            {cur.line}
          </h2>
          <p className="story__hint" key={`${cur.key}-c`}>
            {cur.copy}
          </p>
        </div>
        <ol className="stages">
          {JOURNEY_STAGES.map((s, i) => (
            <li key={s.key} className={i < stage ? 'is-done' : i === stage ? 'is-active' : ''}>
              <i />
              <span>{s.title}</span>
            </li>
          ))}
        </ol>
      </div>
    </Scene>
  )
}

export function Fleet() {
  return (
    <Scene id="fleet" h={230}>
      <div className="story story--left story--top">
        <p className="eyebrow">06 — Live fleet</p>
        <h2 className="story__title">A living network.</h2>
        <p className="story__hint">Hover any vehicle to meet the driver, see the car and its ETA.</p>
        <div className="legend">
          <span>
            <i className="is-available" /> Available
          </span>
          <span>
            <i className="is-enroute" /> En route
          </span>
          <span>
            <i className="is-ontrip" /> On trip
          </span>
        </div>
      </div>
    </Scene>
  )
}

export function Why() {
  return (
    <Scene id="why" h={230}>
      <div className="story story--center story--top">
        <p className="eyebrow">07 — Why AURA</p>
        <h2 className="story__title">Built around you.</h2>
        <ul className="why__list" aria-label="Reasons">
          {WHY_ITEMS.map((w) => (
            <li key={w.key}>{w.title}</li>
          ))}
        </ul>
      </div>
    </Scene>
  )
}

export function Showcase() {
  const idx = useStore((s) => s.showcaseIndex)
  const cur = SHOWCASE[idx]
  return (
    <Scene id="showcase" h={420}>
      <div className="showcase">
        <div className="showcase__head">
          <p className="eyebrow">08 — Premium showcase</p>
        </div>
        <div className="showcase__copy" key={cur.key}>
          <span className="showcase__idx">
            {String(idx + 1).padStart(2, '0')} / {String(SHOWCASE.length).padStart(2, '0')}
          </span>
          <h2 className="story__title">{cur.title}</h2>
          <p className="story__hint">{cur.copy}</p>
        </div>
        <ol className="showcase__dots" aria-hidden>
          {SHOWCASE.map((s, i) => (
            <li key={s.key} className={i === idx ? 'is-active' : ''} />
          ))}
        </ol>
      </div>
    </Scene>
  )
}

export function Outro() {
  return (
    <Scene id="outro" h={130} className="scene--outro">
      <footer className="outro">
        <h2 className="outro__title">Ready when you are.</h2>
        <button className="btn btn--primary btn--lg" onClick={() => scrollToSection('pickup')}>
          Book your ride
        </button>
        <div className="outro__foot">
          <span>© {new Date().getFullYear()} AURA Mobility · Taipei</span>
          <span>Premium transportation, intelligently connected.</span>
        </div>
      </footer>
    </Scene>
  )
}
