import { useEffect, useRef, type ReactNode } from 'react'
import { SERVICES, VEHICLES, fmtTWD, vehicleFits } from '../lib/data'
import { scrollToSection } from '../lib/scroll'
import { JOURNEY_STAGES, SHOWCASE, WHY_ITEMS } from '../lib/content'
import { useStore, useT, useTrip, type SectionId } from '../store'
import { PlaceSearch } from './PlaceSearch'

function Scene({ id, h, children, className = '' }: { id: SectionId; h: number; children: ReactNode; className?: string }) {
  return (
    <section data-section={id} id={id} className={`scene scene--${id} ${className}`} style={{ height: `${h}vh` }}>
      <div className="scene__sticky">{children}</div>
    </section>
  )
}

export function Hero() {
  const t = useT()
  return (
    <Scene id="hero" h={170}>
      <div className="hero">
        <p className="eyebrow hero__eyebrow">
          <span>FLEET OS</span> · {t('hero.kicker')}
        </p>
        <h1 className="hero__title">
          <span className="line">{t('hero.title1')}</span>
          <span className="line line--accent">{t('hero.title2')}</span>
        </h1>
        <p className="hero__sub">{t('hero.copy')}</p>
        <div className="hero__cta">
          <button className="btn btn--primary" onClick={() => scrollToSection('pickup')}>
            {t('hero.book')}
          </button>
          <button className="btn btn--ghost" onClick={() => scrollToSection('journey')}>
            {t('hero.explore')}
          </button>
        </div>
        <div className="hero__scroll" aria-hidden>
          <span />
          {t('hero.scroll')}
        </div>
      </div>
    </Scene>
  )
}

export function Pickup() {
  const t = useT()
  const b = useStore((s) => s.booking)
  const set = useStore((s) => s.setBooking)
  return (
    <Scene id="pickup" h={230}>
      <div className="story story--left">
        <p className="eyebrow">{t('book.pickupStep')}</p>
        <h2 className="story__title">{t('book.pickupTitle')}</h2>
        <div className="glass glass--panel">
          <fieldset className="service-picker">
            <legend>{t('book.service')}</legend>
            <div className="service-picker__options">
              {SERVICES.map((service) => (
                <button key={service.id} type="button" aria-pressed={b.service === service.id} className={b.service === service.id ? 'is-active' : ''} onClick={() => set({ service: service.id })}>
                  {service.name}
                </button>
              ))}
            </div>
            <small>{SERVICES.find((service) => service.id === b.service)?.note}</small>
          </fieldset>
          <PlaceSearch value={b.pickup} onChange={(p) => set({ pickup: p })} placeholder={t('book.pickupPlaceholder')} />
          <div className="glass__foot">
            <span>Airports · Stations · Hotels · Any address</span>
            <button className="btn btn--text" onClick={() => scrollToSection('destination')}>
              {t('book.next')} →
            </button>
          </div>
        </div>
      </div>
    </Scene>
  )
}

export function Destination() {
  const t = useT()
  const b = useStore((s) => s.booking)
  const set = useStore((s) => s.setBooking)
  const trip = useTrip()
  return (
    <Scene id="destination" h={230}>
      <div className="story story--right">
        <p className="eyebrow">{t('book.destinationStep')}</p>
        <h2 className="story__title">{t('book.destinationTitle')}</h2>
        <div className="glass glass--panel">
          <PlaceSearch value={b.destination} onChange={(p) => set({ destination: p })} placeholder={t('book.destinationPlaceholder')} tone="gold" />
          <div className="glass__foot">
            <span>
              {trip.km.toFixed(0)} km · ~{trip.duration} min
            </span>
            <button className="btn btn--text" onClick={() => scrollToSection('choose')}>
              {t('book.choose')} →
            </button>
          </div>
        </div>
      </div>
    </Scene>
  )
}

export function Choose() {
  const t = useT()
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
          <p className="eyebrow">{t('book.vehicleStep')}</p>
          <h2 className="story__title">{t('book.vehicleTitle')}</h2>
          <p className="story__hint">{t('book.vehicleHint')}</p>
        </div>
        <div className="glass tripbar">
          <label>
            <span>{t('book.date')}</span>
            <input type="date" value={b.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <label>
            <span>{t('book.time')}</span>
            <input type="time" value={b.time} onChange={(e) => set({ time: e.target.value })} />
          </label>
          <label>
            <span>{t('book.passengers')}</span>
            <div className="stepper">
              <button aria-label="Fewer passengers" onClick={() => set({ passengers: Math.max(1, b.passengers - 1) })}>
                −
              </button>
              <b>{b.passengers}</b>
              <button aria-label="More passengers" onClick={() => set({ passengers: Math.min(8, b.passengers + 1) })}>
                +
              </button>
            </div>
          </label>
          <label>
            <span>{t('book.luggage')}</span>
            <div className="stepper">
              <button aria-label="Fewer bags" onClick={() => set({ luggage: Math.max(0, b.luggage - 1) })}>−</button>
              <b>{b.luggage}</b>
              <button aria-label="More bags" onClick={() => set({ luggage: Math.min(8, b.luggage + 1) })}>+</button>
            </div>
          </label>
          <div className="tripbar__fare">
            <span>{t('book.estimate')}</span>
            <b>{fmtTWD(trip.fare)}</b>
          </div>
        </div>
        <div className="chips" role="tablist" aria-label="Vehicle category">
          {VEHICLES.map((v) => (
            <button key={v.id} role="tab" aria-selected={b.vehicle === v.id} disabled={!vehicleFits(v, b.passengers, b.luggage)} aria-describedby={`capacity-${v.id}`} className={`chip ${b.vehicle === v.id ? 'is-active' : ''}`} onClick={() => set({ vehicle: v.id })}>
              {v.name}
              <small>{fmtTWD(trip.fareFor(v.id))}</small>
              <span id={`capacity-${v.id}`} className="sr-only">{vehicleFits(v, b.passengers, b.luggage) ? `${v.seats} passengers and ${v.luggage} bags` : `Unavailable: supports up to ${v.seats} passengers and ${v.luggage} bags`}</span>
            </button>
          ))}
        </div>
        {domCard && (
          <div className="glass ridecard" key={spec.id}>
            <div className="ridecard__head">
              <span className="ridecard__name">{spec.name}<small>{spec.model}</small></span>
              <span className="ridecard__price">{fmtTWD(trip.fare)}</span>
            </div>
            <div className="ridecard__meta">
              <span>{spec.seats} {t('book.seats')}</span>
              <span>{spec.luggage} {t('book.bags')}</span>
              <span>{t('book.eta')} {spec.etaMin} min</span>
            </div>
            <button className="btn btn--primary" onClick={() => scrollToSection('confirm')}>
              {t('book.select')}
            </button>
          </div>
        )}
      </div>
    </Scene>
  )
}

export function Confirm() {
  const t = useT()
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
          <p className="eyebrow">{t('review.step')}</p>
          <h2 className="story__title">{confirmed ? t('review.ready') : t('review.title')}</h2>
          <div className="confirm__route">
            <div>
              <small>{t('review.pickup')}</small>
              <b>{trip.pickup?.name}</b>
            </div>
            <i className="confirm__arrow" aria-hidden />
            <div>
              <small>{t('review.destination')}</small>
              <b>{trip.destination?.name}</b>
            </div>
          </div>
          <dl className="confirm__grid">
            <div>
              <dt>{t('review.when')}</dt>
              <dd>{when}</dd>
            </div>
            <div>
              <dt>{t('review.vehicle')}</dt>
              <dd>{trip.spec.name} · {trip.spec.model}</dd>
            </div>
            <div>
              <dt>{t('review.service')}</dt>
              <dd>{SERVICES.find((service) => service.id === trip.service)?.name}</dd>
            </div>
            <div>
              <dt>{t('book.passengers')}</dt>
              <dd>{trip.passengers} · {trip.luggage} bags</dd>
            </div>
            <div>
              <dt>{t('review.distance')}</dt>
              <dd>
                {trip.km.toFixed(0)} km · {trip.duration} min
              </dd>
            </div>
            <div className="confirm__fare">
              <dt>{t('book.estimate')}</dt>
              <dd>{fmtTWD(trip.fare)}</dd>
            </div>
          </dl>
          {!confirmed ? (
            <div className="confirm__actions">
              <button className="btn btn--text" onClick={() => scrollToSection('choose')}>
                ← {t('review.change')}
              </button>
              <button
                className="btn btn--primary btn--lg"
                onClick={() => {
                  confirm()
                  setTimeout(() => scrollToSection('journey'), 500)
                }}
              >
                {t('review.prepare')}
              </button>
            </div>
          ) : (
            <div className="confirm__actions">
              <span className="confirm__ok">{t('review.disclaimer')}</span>
              <button className="btn btn--ghost" onClick={reset}>
                {t('review.new')}
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
        <p className="eyebrow">06 — Fleet simulation</p>
        <h2 className="story__title">A connected network.</h2>
        <p className="story__hint">Explore demonstration vehicles, drivers, and ETAs. This is not live availability.</p>
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
  const t = useT()
  return (
    <Scene id="why" h={230}>
      <div className="story story--center story--top">
        <p className="eyebrow">{t('about.kicker')}</p>
        <h2 className="story__title">{t('about.title')}</h2>
        <p className="story__hint editorial-copy">{t('about.copy')}</p><ul className="why__list" aria-label="Reasons">
          {WHY_ITEMS.map((w) => (
            <li key={w.key}>{w.title}</li>
          ))}
        </ul>
      </div>
    </Scene>
  )
}

export function Showcase() {
  const t = useT()
  const idx = useStore((s) => s.showcaseIndex)
  const cur = SHOWCASE[idx]
  return (
    <Scene id="showcase" h={420}>
      <div className="showcase">
        <div className="showcase__head">
          <p className="eyebrow">{t('business.kicker')}</p>
        </div>
        <div className="showcase__copy" key={cur.key}><p className="business-intro">{t('business.copy')}</p>
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
  const t = useT()
  return (
    <Scene id="outro" h={130} className="scene--outro">
      <footer className="outro">
        <h2 className="outro__title">{t('outro.title')}</h2>
        <button className="btn btn--primary btn--lg" onClick={() => scrollToSection('pickup')}>
          {t('hero.book')}
        </button>
        <div className="outro__foot">
          <span>© {new Date().getFullYear()} Fleet OS · Taipei</span>
          <span>{t('hero.copy')}</span>
        </div>
      </footer>
    </Scene>
  )
}
