import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { hourlyOrderDistribution } from '../../lib/capacity'

export function HourlyVolumeChart() {
  const orders = useFleetStore((s) => s.orders)

  const buckets = useMemo(() => hourlyOrderDistribution(orders.map((o) => o.scheduledTime)), [orders])
  const max = Math.max(1, ...buckets.map((b) => b.count))
  const peak = buckets.reduce((best, b) => (b.count > best.count ? b : best), buckets[0])
  const total = buckets.reduce((sum, b) => sum + b.count, 0)
  const currentHour = new Date().getHours()

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <BarChart3 className="h-3.5 w-3.5" /> Hourly Order Volume
        </p>
        <span className="text-[10px] text-slate-500">
          {total} total · peak {String(peak.hour).padStart(2, '0')}:00 ({peak.count})
        </span>
      </div>
      <div className="flex h-16 items-end gap-[3px] px-1">
        {buckets.map((b) => (
          <motion.div
            key={b.hour}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(4, (b.count / max) * 100)}%` }}
            transition={{ duration: 0.5, delay: b.hour * 0.01 }}
            className={`flex-1 rounded-t-sm ${
              b.hour === currentHour ? 'bg-gradient-to-t from-pink-400 to-amber-300' : b.hour === peak.hour ? 'bg-cyan-300' : 'bg-cyan-400/30'
            }`}
            title={`${b.hour}:00 — ${b.count} orders`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between px-1 text-[9px] text-slate-500">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
    </div>
  )
}
