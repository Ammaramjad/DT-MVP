import { useEffect, useState } from 'react'
import type { Copy } from '../../lib/experienceCopy'
import { useStore, useTrip } from '../../store'
import { BookingControls } from './BookingControls'
import { BookingProgress } from './BookingProgress'
import { SceneViewport } from './SceneViewport'
import type { BookingStep } from './bookingSteps'

function TripStatus({ copy }: { copy: Copy }) {
  const locale = useStore(state => state.locale)
  const reset = useStore(state => state.reset)
  const trip = useTrip()
  const [stage, setStage] = useState(0)
  const labels = locale === 'en' ? ['Booked','Matching driver','Driver approaching','Driver arrived','Pickup','Travelling','Arrived'] : ['已預約','媒合司機','司機前往中','司機已抵達','乘客上車','行程中','已抵達']
  useEffect(() => { const timer = window.setInterval(() => setStage(value => Math.min(labels.length - 1, value + 1)), 1800); return () => window.clearInterval(timer) }, [labels.length])
  return <aside className="trip-status" role="status" aria-live="polite"><header><span>DEMO JOURNEY · SIMULATED</span><button onClick={reset}>{copy.close}</button></header><h3>{labels[stage]}</h3><p>{trip.spec.name} · {trip.pickup?.area} → {trip.destination?.area}</p><ol>{labels.map((label,index) => <li className={index <= stage ? 'active' : ''} key={label}><i/>{label}</li>)}</ol></aside>
}

export function BookingExperience({ copy }: { copy: Copy }) {
  const [step, setStep] = useState<BookingStep>(0)
  const confirmed = useStore(state => state.confirmed)
  return <section className="booking-experience section-pad" id="book"><header className="editorial-heading"><span>BOOK / 09 CHAPTERS</span><h2>{copy.bookingTitle}</h2><p>{copy.bookingCopy}</p></header><div className="booking-stage"><BookingProgress step={step} onStep={setStep}/><SceneViewport step={step}/><BookingControls copy={copy} step={step} onStep={setStep}/></div>{confirmed && <TripStatus copy={copy}/>}</section>
}
