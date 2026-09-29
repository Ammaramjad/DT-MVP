import { BOOKING_STEPS, canVisitStep, type BookingStep } from './bookingSteps'

export function BookingProgress({ step, onStep }: { step: BookingStep; onStep: (step: BookingStep) => void }) {
  return <nav className="booking-progress" aria-label="Booking progress">
    <div className="progress-summary"><span>STEP {step + 1} / {BOOKING_STEPS.length}</span><strong>{BOOKING_STEPS[step]}</strong><i style={{ '--progress': `${((step + 1) / BOOKING_STEPS.length) * 100}%` } as React.CSSProperties}/></div>
    <ol>{BOOKING_STEPS.map((label, index) => <li key={label}><button type="button" disabled={!canVisitStep(index, step)} aria-current={index === step ? 'step' : undefined} className={index === step ? 'active' : index < step ? 'complete' : ''} onClick={() => onStep(index as BookingStep)}><i>{index < step ? '✓' : String(index + 1).padStart(2,'0')}</i><span>{label}</span></button></li>)}</ol>
  </nav>
}
