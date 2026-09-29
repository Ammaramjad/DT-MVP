import { useEffect, useRef, useState } from 'react'
import { scrollToSection } from '../lib/scroll'
import { scrollState, useStore, useT } from '../store'

const NAV = [
  { label: 'nav.book', to: 'pickup' },
  { label: 'nav.business', to: 'showcase' },
  { label: 'nav.about', to: 'why' },
] as const

export function Logo() {
  const t = useT()
  return (
    <a className="logo" href="#" onClick={(e) => { e.preventDefault(); scrollToSection('hero') }} aria-label={t('a11y.home')}>
      <svg viewBox="0 0 48 48" width="26" height="26" aria-hidden>
        <path d="M6 30 L30 6 L42 6 L18 30 Z" fill="currentColor" />
        <path d="M6 42 L22 26 L34 26 L18 42 Z" fill="#a7b6ff" />
      </svg>
      <span>FLEET OS</span>
    </a>
  )
}

export function Nav() {
  const t = useT()
  const active = useStore((s) => s.active)
  const locale = useStore((s) => s.locale)
  const setLocale = useStore((s) => s.setLocale)
  const [open, setOpen] = useState(false)
  const overScene = active !== 'hero'
  return (
    <header className={`nav ${overScene ? 'is-glass' : ''} ${open ? 'is-open' : ''}`}>
      <Logo />
      <nav className="nav__links" aria-label="Primary">
        {NAV.map((n) => (
          <a
            key={n.to}
            href={`#${n.to}`}
            className={active === n.to ? 'is-active' : ''}
            onClick={(e) => {
              e.preventDefault()
              setOpen(false)
              scrollToSection(n.to)
            }}
          >
            {t(n.label)}
          </a>
        ))}
      </nav>
      <div className="nav__actions">
        <label className="language"><span className="sr-only">{t('a11y.language')}</span><select value={locale} onChange={(e) => setLocale(e.target.value as 'en' | 'zh-TW')} aria-label={t('a11y.language')}><option value="en">EN</option><option value="zh-TW">繁中</option></select></label>
        <span className="nav__login" title="Reservations and account services require production integrations">{t('nav.demo')}</span>
        <button className="btn btn--primary btn--sm" onClick={() => scrollToSection('pickup')}>
          {t('nav.cta')}
        </button>
        <button className="nav__burger" aria-label={t('a11y.menu')} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <i />
          <i />
        </button>
      </div>
    </header>
  )
}

/** Dark wipe used when the camera cuts between worlds. */
export function CutOverlay() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      if (ref.current) ref.current.style.opacity = String(scrollState.cut)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div ref={ref} className="cut" aria-hidden />
}

export function Progress() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (ref.current) ref.current.style.transform = `scaleX(${Math.min(1, scrollState.y / Math.max(1, max))})`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div ref={ref} className="progress" aria-hidden />
}

export function Loader() {
  const ready = useStore((s) => s.ready)
  const webgl = useStore((s) => s.webgl)
  const [pct, setPct] = useState(0)
  const [gone, setGone] = useState(false)
  const done = useRef(false)
  useEffect(() => {
    done.current = ready || !webgl
  }, [ready, webgl])
  useEffect(() => {
    const start = performance.now()
    let doneAt = 0
    const id = setInterval(() => {
      const now = performance.now()
      const t = (now - start) / 1400
      if (!doneAt && (done.current || t > 4.5)) doneAt = now
      const base = Math.min(88, t * 100)
      const cur = doneAt ? Math.min(100, Math.max(base, 88 + ((now - doneAt) / 600) * 12)) : base
      setPct(cur)
      if (cur >= 100) clearInterval(id)
    }, 40)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (pct > 99.5) {
      const t = setTimeout(() => setGone(true), 700)
      return () => clearTimeout(t)
    }
  }, [pct])
  if (gone) return null
  return (
    <div className={`loader ${pct > 99.5 ? 'is-done' : ''}`} aria-hidden>
      <div className="loader__inner">
        <Logo />
        <div className="loader__count">{Math.round(pct)}</div>
        <div className="loader__bar">
          <i style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <p className="loader__hint">Preparing your journey</p>
      </div>
    </div>
  )
}

export function MobileBar() {
  const t = useT()
  const active = useStore((s) => s.active)
  const hidden = active === 'hero' || active === 'choose' || active === 'confirm'
  return (
    <div className={`mbar ${hidden ? 'is-hidden' : ''}`}>
      <button className="btn btn--primary" onClick={() => scrollToSection('pickup')}>
        {t('nav.cta')}
      </button>
    </div>
  )
}

/** Static poster shown when WebGL is unavailable or blocked. */
export function Fallback({ message }: { message?: string }) {
  return (
    <div className="fallback" role="status">
      <div className="fallback__grid" />
      <div className="fallback__glow" />
      <div className="fallback__road" />
      {message && <p className="fallback__message">{message}</p>}
    </div>
  )
}
