import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { SECTION_ORDER, scrollState, useStore, type SectionId } from '../store'
import { JOURNEY_STAGES, SHOWCASE } from './content'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null
const bounds: Record<string, { top: number; height: number }> = {}

/** Sections whose boundary is a hard "cut" between different 3D worlds. */
const CUTS: SectionId[] = ['fleet', 'why', 'showcase']

function measure() {
  for (const id of SECTION_ORDER) {
    const el = document.querySelector<HTMLElement>(`[data-section="${id}"]`)
    if (!el) continue
    const r = el.getBoundingClientRect()
    bounds[id] = { top: r.top + window.scrollY, height: r.height }
  }
}

function update(y: number) {
  const vh = window.innerHeight
  let active: SectionId = 'hero'
  let cut = 0
  for (const id of SECTION_ORDER) {
    const b = bounds[id]
    if (!b) continue
    const span = Math.max(1, b.height - vh)
    const raw = (y - b.top) / span
    scrollState.p[id] = Math.max(-1, Math.min(2, raw))
    if (y >= b.top - vh * 0.5) active = id
    if (CUTS.includes(id)) {
      const d = Math.abs(y - b.top) / (vh * 0.35)
      cut = Math.max(cut, Math.max(0, 1 - d))
    }
    const el = document.querySelector<HTMLElement>(`[data-section="${id}"]`)
    if (el) el.style.setProperty('--p', Math.max(0, Math.min(1, raw)).toFixed(4))
  }
  scrollState.cut = cut
  scrollState.y = y
  const store = useStore.getState()
  if (scrollState.active !== active) {
    scrollState.active = active
    store.setActive(active)
  }
  // Story copy is derived from the same progress the 3D scene reads, so text
  // and scene always agree (and keep working on the CSS fallback).
  const pj = scrollState.p.journey
  let stage = 0
  for (let i = 0; i < JOURNEY_STAGES.length; i++) if (pj >= JOURNEY_STAGES[i].t - 0.02) stage = i
  if (store.journeyStage !== stage) store.setJourneyStage(stage)
  const ps = Math.max(0, Math.min(1, scrollState.p.showcase))
  const idx = Math.min(SHOWCASE.length - 1, Math.floor(ps * SHOWCASE.length))
  if (store.showcaseIndex !== idx) store.setShowcaseIndex(idx)
}

export function initScroll() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  measure()
  update(window.scrollY)

  if (!reduced) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, syncTouch: false })
    lenis.on('scroll', (e: { scroll: number; velocity: number }) => {
      scrollState.velocity = e.velocity
      update(e.scroll)
      ScrollTrigger.update()
    })
    gsap.ticker.add((t) => lenis?.raf(t * 1000))
    gsap.ticker.lagSmoothing(0)
  } else {
    window.addEventListener('scroll', () => update(window.scrollY), { passive: true })
  }

  const onResize = () => {
    measure()
    update(lenis ? lenis.scroll : window.scrollY)
  }
  window.addEventListener('resize', onResize)
  ScrollTrigger.addEventListener('refresh', onResize)
  setTimeout(onResize, 300)

  const onMove = (e: PointerEvent) => {
    scrollState.mx = (e.clientX / window.innerWidth) * 2 - 1
    scrollState.my = (e.clientY / window.innerHeight) * 2 - 1
  }
  window.addEventListener('pointermove', onMove, { passive: true })

  return () => {
    lenis?.destroy()
    lenis = null
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointermove', onMove)
  }
}

/** Section progress at which each section's UI is fully revealed (matches styles.css). */
const LANDING: Partial<Record<SectionId, number>> = {
  pickup: 0.55,
  destination: 0.55,
  choose: 0.6,
  confirm: 0.55,
  journey: 0.15,
  fleet: 0.25,
  why: 0.25,
  showcase: 0.15,
  outro: 0.4,
}

export function scrollToSection(id: SectionId, progress = LANDING[id] ?? 0) {
  const el = document.querySelector<HTMLElement>(`[data-section="${id}"]`)
  if (!el) return
  measure()
  const b = bounds[id]
  const top = b ? b.top + Math.max(0, b.height - window.innerHeight) * progress : el.offsetTop
  if (lenis) lenis.scrollTo(top, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) })
  else window.scrollTo({ top, behavior: 'smooth' })
}

export function scrollBy(delta: number) {
  const target = (lenis ? lenis.scroll : window.scrollY) + delta
  if (lenis) lenis.scrollTo(target, { duration: 1.2 })
  else window.scrollTo({ top: target, behavior: 'smooth' })
}

export function stopScroll(v: boolean) {
  if (!lenis) return
  if (v) lenis.stop()
  else lenis.start()
}

export { gsap, ScrollTrigger }
