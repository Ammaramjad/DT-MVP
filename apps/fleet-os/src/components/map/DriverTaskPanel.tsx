import { AlertOctagon, Star, X } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { TierBadge, StatusBadge, OrderTypeBadge } from '../ui/OrderBadges'
import { StatusHistoryTimeline } from '../control/StatusHistoryTimeline'
import { DispatchLog } from '../control/DispatchLog'
import { formatTWD, driverStatusLabel } from '../../lib/format'
import { useLang } from '../../i18n'

/** Click-through driver detail shown from the Fleet Map legend/marker click
 * — the current job's full task chain (status history + dispatch log), so
 * ops can verify what a specific driver is doing right now without leaving
 * the map. Mirrors the reference site's "click a driver icon to see their
 * current task chain." */
export function DriverTaskPanel({ driverId, onClose }: { driverId: string; onClose: () => void }) {
  const { t, lang } = useLang()
  const driver = useFleetStore((s) => s.drivers.find((d) => d.id === driverId))
  const order = useFleetStore((s) => s.orders.find((o) => o.driverId === driverId && !['COMPLETED', 'CANCELLED'].includes(o.status)))

  if (!driver) return null
  const isFlagged = !!driver.unresponsiveFlagUntil && driver.unresponsiveFlagUntil > Date.now()

  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl p-3" data-testid="driver-task-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{driver.avatarEmoji}</span>
          <div>
            <p className="text-xs font-semibold text-slate-100">{lang === 'zh' ? driver.nameZh : driver.name}</p>
            <p className="text-[10.5px] text-slate-500">{driver.phone}</p>
          </div>
        </div>
        <button onClick={onClose} data-testid="driver-task-panel-close" className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 hover:bg-white/10 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <TierBadge tier={driver.tier} />
        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10.5px] text-slate-300">{driverStatusLabel(driver.status, lang)}</span>
        <span className="flex items-center gap-0.5 text-[10.5px] text-amber-300">
          <Star className="h-2.5 w-2.5" /> {driver.rating.toFixed(1)}
        </span>
        {isFlagged && (
          <span className="flex items-center gap-1 rounded-full bg-red-400/15 px-2 py-0.5 text-[10.5px] text-red-300">
            <AlertOctagon className="h-2.5 w-2.5" /> {t('fleetos.map.unresponsive')}
          </span>
        )}
      </div>

      <div className="mt-3 flex-1 overflow-y-auto">
        {order ? (
          <div className="rounded-xl bg-white/[0.02] p-2.5" data-testid="driver-task-panel-order">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-100">{order.orderNo}</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <OrderTypeBadge type={order.type} />
            </div>
            <p className="mt-2 truncate text-[11px] text-slate-400">
              {lang === 'zh' ? order.pickup.nameZh : order.pickup.name} → {lang === 'zh' ? order.dropoff.nameZh : order.dropoff.name}
            </p>
            <p className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>{order.customer.name}</span>
              <span className="font-semibold text-slate-300">{formatTWD(order.priceEstimate)}</span>
            </p>
            <DispatchLog attempts={order.dispatchAttempts} />
            <StatusHistoryTimeline history={order.statusHistory} />
          </div>
        ) : (
          <p className="rounded-xl bg-white/[0.02] p-4 text-center text-[11px] text-slate-500" data-testid="driver-task-panel-no-job">
            {t('fleetos.map.noActiveJob')}
          </p>
        )}
      </div>
    </div>
  )
}
