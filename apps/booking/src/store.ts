import { create } from 'zustand'
import { PLACES, VEHICLES, estimateDurationMin, estimateFare, haversineKm, vehicleFits, type Place, type ServiceId, type VehicleId } from './lib/data'
import { translate, type Locale, type TranslationKey } from './lib/i18n'

export type SectionId =
  | 'hero'
  | 'pickup'
  | 'destination'
  | 'choose'
  | 'confirm'
  | 'journey'
  | 'fleet'
  | 'why'
  | 'showcase'
  | 'outro'

export const SECTION_ORDER: SectionId[] = [
  'hero',
  'pickup',
  'destination',
  'choose',
  'confirm',
  'journey',
  'fleet',
  'why',
  'showcase',
  'outro',
]

export type Quality = 'high' | 'medium' | 'low'

/** Mutable, non-reactive scroll state read every frame by the 3D scene. */
export const scrollState = {
  /** per-section progress; <0 before, 0..1 inside, >1 after */
  p: Object.fromEntries(SECTION_ORDER.map((s) => [s, -1])) as Record<SectionId, number>,
  active: 'hero' as SectionId,
  velocity: 0,
  y: 0,
  /** normalized pointer -1..1 */
  mx: 0,
  my: 0,
  /** 0..1 amount of the "cut" fade overlay */
  cut: 0,
}

type Booking = {
  service: ServiceId
  pickup: Place | null
  destination: Place | null
  date: string
  time: string
  passengers: number
  luggage: number
  vehicle: VehicleId
  options: string[]
}

type State = {
  ready: boolean
  quality: Quality
  webgl: boolean
  isMobile: boolean
  active: SectionId
  booking: Booking
  hovered: VehicleId | null
  confirmed: boolean
  journeyStage: number
  showcaseIndex: number
  locale: Locale
  setReady: (v: boolean) => void
  setQuality: (q: Quality) => void
  setActive: (s: SectionId) => void
  setBooking: (b: Partial<Booking>) => void
  setHovered: (v: VehicleId | null) => void
  confirm: () => void
  reset: () => void
  setJourneyStage: (n: number) => void
  setShowcaseIndex: (n: number) => void
  setLocale: (locale: Locale) => void
}

function detect() {
  const ua = navigator.userAgent
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.matchMedia('(pointer: coarse)').matches
  const cores = navigator.hardwareConcurrency || 4
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  let quality: Quality = 'high'
  if (isMobile || cores <= 4 || mem <= 4) quality = 'medium'
  if ((isMobile && cores <= 4) || mem <= 2) quality = 'low'
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) quality = 'low'
  let webgl = false
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
    webgl = !!gl
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info')
      const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ''
      if (/swiftshader|llvmpipe|software|mesa offscreen/i.test(renderer)) quality = 'low'
    }
  } catch {
    webgl = false
  }
  const params = new URLSearchParams(location.search)
  const forced = params.get('q')
  if (forced === 'low' || forced === 'medium' || forced === 'high') quality = forced
  if (params.get('gl') === '0') webgl = false
  return { isMobile, quality, webgl }
}

const today = new Date()
const pad = (n: number) => String(n).padStart(2, '0')

export const useStore = create<State>((set) => ({
  ready: false,
  ...detect(),
  active: 'hero',
  booking: {
    service: 'airport-to-location',
    pickup: PLACES[0],
    destination: PLACES[3],
    date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate() + 1)}`,
    time: '09:30',
    passengers: 2,
    luggage: 2,
    vehicle: 'comfort',
    options: [],
  },
  hovered: null,
  confirmed: false,
  journeyStage: 0,
  showcaseIndex: 0,
  locale: (localStorage.getItem('fleet-os-locale') === 'zh-TW' ? 'zh-TW' : 'en'),
  setReady: (ready) => set({ ready }),
  setQuality: (quality) => set({ quality }),
  setActive: (active) => set({ active }),
  setBooking: (patch) => set((s) => {
    const booking = { ...s.booking, ...patch }
    const selected = VEHICLES.find((vehicle) => vehicle.id === booking.vehicle)
    if (!selected || !vehicleFits(selected, booking.passengers, booking.luggage)) {
      const compatible = VEHICLES.find((vehicle) => vehicleFits(vehicle, booking.passengers, booking.luggage))
      if (compatible) booking.vehicle = compatible.id
    }
    return { booking, confirmed: false }
  }),
  setHovered: (hovered) => set({ hovered }),
  confirm: () => set({ confirmed: true }),
  reset: () => set({ confirmed: false }),
  setJourneyStage: (journeyStage) => set({ journeyStage }),
  setShowcaseIndex: (showcaseIndex) => set({ showcaseIndex }),
  setLocale: (locale) => {
    localStorage.setItem('fleet-os-locale', locale)
    document.documentElement.lang = locale
    set({ locale })
  },
}))

export function useT() {
  const locale = useStore((s) => s.locale)
  return (key: TranslationKey) => translate(locale, key)
}

export function useTrip() {
  const b = useStore((s) => s.booking)
  const v = VEHICLES.find((x) => x.id === b.vehicle) ?? VEHICLES[1]
  const km = b.pickup && b.destination ? haversineKm(b.pickup, b.destination) : 0
  return {
    ...b,
    spec: v,
    km,
    fare: estimateFare(v, km),
    duration: estimateDurationMin(km),
    fareFor: (id: VehicleId) => estimateFare(VEHICLES.find((x) => x.id === id) ?? v, km),
  }
}
