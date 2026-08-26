import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { OrderStatus } from '../../types'

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'NEW', label: 'Order Placed' },
  { key: 'ASSIGNED', label: 'Driver Assigned' },
  { key: 'EN_ROUTE_TO_PICKUP', label: 'En Route' },
  { key: 'ARRIVED_AT_PICKUP', label: 'Arrived' },
  { key: 'IN_TRANSIT', label: 'In Transit' },
  { key: 'COMPLETED', label: 'Completed' },
]

export function StatusStepper({ status }: { status: OrderStatus }) {
  const normalized = status === 'PENDING_DRIVER_RESPONSE' ? 'NEW' : status
  const effectiveIndex = STEPS.findIndex((s) => s.key === normalized || (s.key === 'IN_TRANSIT' && normalized === 'PICKED_UP'))
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
                {step.label}
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
