import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { OrderStatus } from '../../types'
import { useLang } from '../../i18n'

const STEPS: { key: OrderStatus; labelKey: string }[] = [
  { key: 'CONFIRMED', labelKey: 'stepper.orderPlaced' },
  { key: 'ASSIGNED', labelKey: 'stepper.driverAssigned' },
  { key: 'DRIVER_EN_ROUTE', labelKey: 'stepper.enRoute' },
  { key: 'ARRIVED', labelKey: 'stepper.arrived' },
  { key: 'PASSENGER_ONBOARD', labelKey: 'stepper.inTransit' },
  { key: 'COMPLETED', labelKey: 'stepper.completed' },
]

const PRE_CONFIRMED_STATUSES = new Set<OrderStatus>(['DRAFT', 'PENDING_PAYMENT', 'PAID', 'SUPPLIER_PENDING', 'DRIVER_MATCHING'])

export function StatusStepper({ status }: { status: OrderStatus }) {
  const { t } = useLang()
  const normalized = PRE_CONFIRMED_STATUSES.has(status) ? 'CONFIRMED' : status
  const effectiveIndex = STEPS.findIndex((s) => s.key === normalized)
  const currentIndex = effectiveIndex === -1 ? 0 : effectiveIndex

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                animate={{
                  scale: active ? 1.15 : 1,
                  backgroundColor: done || active ? '#0ea5e9' : '#e2e8f0',
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm"
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <span className="text-[11px] font-bold">{i + 1}</span>}
              </motion.div>
              <span className={`w-16 text-center text-[10px] ${active ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
                {t(step.labelKey)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="mx-1 h-0.5 flex-1 overflow-hidden rounded bg-slate-200">
                <motion.div
                  className="h-full bg-sky-400"
                  animate={{ width: i < currentIndex ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
