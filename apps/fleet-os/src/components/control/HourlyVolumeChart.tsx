import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, Clock, MapPin, X, Sparkles } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { hourlyOrderDistribution } from '../../lib/capacity'
import { useLang } from '../../i18n'
import { formatClock, formatTWD } from '../../lib/format'

export function HourlyVolumeChart() {
  const { t, lang } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)

  const buckets = useMemo(() => hourlyOrderDistribution(orders.map((o) => o.scheduledTime)), [orders])
  const max = Math.max(1, ...buckets.map((b) => b.count))
  const peak = buckets.reduce((best, b) => (b.count > best.count ? b : best), buckets[0])
  const currentHour = new Date().getHours()

  // Breakdown orders in selected hour window
  const selectedHourOrders = useMemo(() => {
    if (selectedHour === null) return []
    return orders.filter((o) => {
      const orderHour = new Date(o.scheduledTime).getHours()
      return orderHour === selectedHour
    })
  }, [orders, selectedHour])

  // Hub breakdown in selected hour
  const hubBreakdown = useMemo(() => {
    if (selectedHour === null) return []
    const counts: Record<string, { name: string; nameZh: string; count: number; isAirport: boolean }> = {}
    selectedHourOrders.forEach((o) => {
      const p = o.pickup
      if (!counts[p.id]) {
        counts[p.id] = { name: p.name, nameZh: p.nameZh, count: 0, isAirport: p.isAirport }
      }
      counts[p.id].count++
    })
    return Object.values(counts).sort((a, b) => b.count - a.count)
  }, [selectedHourOrders, selectedHour])

  const hourString = selectedHour !== null ? `${String(selectedHour).padStart(2, '0')}:00 - ${String((selectedHour + 1) % 24).padStart(2, '0')}:00` : ''

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <BarChart3 className="h-3.5 w-3.5" /> {t('control.hourlyTitle')}
        </p>
        <span className="text-[10px] text-cyan-400 flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          <span>{lang === 'zh' ? '點擊任一長條柱查看該小時旅運' : 'Click bar for hourly breakdown'}</span>
        </span>
      </div>

      <div className="flex h-16 items-end gap-[3px] px-1" data-testid="hourly-volume-bars">
        {buckets.map((b) => {
          const isSelected = selectedHour === b.hour
          return (
            <motion.button
              key={b.hour}
              type="button"
              data-testid={`hourly-bar-${b.hour}`}
              onClick={() => setSelectedHour(selectedHour === b.hour ? null : b.hour)}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(6, (b.count / max) * 100)}%` }}
              transition={{ duration: 0.5, delay: b.hour * 0.01 }}
              whileHover={{ scaleY: 1.15 }}
              className={`flex-1 rounded-t-sm transition cursor-pointer relative ${
                isSelected
                  ? 'bg-cyan-200 ring-2 ring-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.8)]'
                  : b.hour === currentHour
                  ? 'bg-gradient-to-t from-pink-400 to-amber-300'
                  : b.hour === peak.hour
                  ? 'bg-cyan-300'
                  : 'bg-cyan-400/30 hover:bg-cyan-400/60'
              }`}
              title={`${b.hour}:00 — ${b.count} orders (點擊查看明細)`}
            />
          )
        })}
      </div>

      <div className="mt-1 flex justify-between px-1 text-[9px] text-slate-500">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>

      {/* Selected Hour Breakdown Drawer */}
      <AnimatePresence>
        {selectedHour !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-3 overflow-hidden rounded-2xl border border-cyan-400/30 bg-slate-900/95 p-3.5 shadow-xl text-white"
            data-testid="hourly-breakdown-card"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white">
                  {hourString} · {selectedHourOrders.length} {lang === 'zh' ? '筆旅運訂單' : 'trips'}
                </h4>
                {selectedHour === peak.hour && (
                  <span className="rounded-full bg-pink-500/20 px-2 py-0.2 text-[9px] font-bold text-pink-300 border border-pink-400/40">
                    {lang === 'zh' ? '全日最高峰' : 'DAILY PEAK'}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedHour(null)}
                data-testid="close-hourly-breakdown"
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Hubs breakdown */}
            <div className="mt-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {lang === 'zh' ? '主要上車熱點 (Pickup Hubs)' : 'Top Pickup Hubs'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {hubBreakdown.slice(0, 4).map((hub) => (
                  <span
                    key={hub.name}
                    className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-[10.5px] text-slate-200"
                  >
                    <MapPin className={`h-3 w-3 ${hub.isAirport ? 'text-amber-400' : 'text-cyan-400'}`} />
                    <span>{lang === 'zh' ? hub.nameZh : hub.name}</span>
                    <span className="font-bold text-cyan-300 font-mono">({hub.count})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Orders preview */}
            <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {selectedHourOrders.slice(0, 4).map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-2 border border-white/5 text-[11px]">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-bold text-cyan-300">{o.orderNo}</span>
                    <span className="text-slate-300 truncate max-w-[140px]">
                      {(lang === 'zh' ? o.pickup.nameZh : o.pickup.name)} ➔ {(lang === 'zh' ? o.dropoff.nameZh : o.dropoff.name)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-400">{formatClock(o.scheduledTime, lang)}</span>
                    <span className="font-bold text-emerald-400 font-mono text-[10.5px]">{formatTWD(o.priceEstimate)}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
