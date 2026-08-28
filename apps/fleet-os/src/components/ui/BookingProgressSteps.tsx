import { Check } from 'lucide-react'
import clsx from 'clsx'

/**
 * The 3-step progress header for the Customer App booking flow — modeled on
 * 機場快綫 Airport Express's "Step 1: Fare Estimate → Step 2: Payment Method
 * → Step 3: Booking Confirmation" flow (see BookingPanel.tsx). Purely a
 * visual/navigational aid; each step's own validation still gates whether a
 * customer can move forward.
 */
export function BookingProgressSteps({ step, labels }: { step: 1 | 2 | 3; labels: [string, string, string] }) {
  return (
    <div className="mx-auto mb-5 flex max-w-6xl items-center justify-center px-4 sm:px-6" data-testid="booking-progress-steps">
      {[1, 2, 3].map((n, i) => (
        <div key={n} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              data-testid={`booking-step-dot-${n}`}
              data-active={step === n}
              data-complete={step > n}
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition',
                step > n ? 'bg-emerald-500 text-white' : step === n ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' : 'bg-slate-100 text-slate-400',
              )}
            >
              {step > n ? <Check className="h-4 w-4" /> : n}
            </div>
            <span className={clsx('text-[11px] font-medium', step === n ? 'text-blue-600' : step > n ? 'text-emerald-600' : 'text-slate-400')}>
              {labels[i]}
            </span>
          </div>
          {n < 3 && <div className={clsx('mx-2 mb-4 h-0.5 w-10 sm:w-20', step > n ? 'bg-emerald-400' : 'bg-slate-200')} />}
        </div>
      ))}
    </div>
  )
}
