import { motion } from 'framer-motion'
import { Luggage, Plane, User, Users, Wand2, X, Zap } from 'lucide-react'
import type { Order } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { OrderTypeBadge, StatusBadge, FlightBadge, TierBadge } from '../ui/OrderBadges'
import { Button } from '../ui/Button'
import { formatTWD, formatClock } from '../../lib/format'

export function OrderQueueCard({ order, focused, onFocus }: { order: Order; focused: boolean; onFocus: () => void }) {
  const drivers = useFleetStore((s) => s.drivers)
  const assignOrder = useFleetStore((s) => s.assignOrder)
  const cancelOrder = useFleetStore((s) => s.cancelOrder)

  const assignedDriver = drivers.find((d) => d.id === order.driverId)
  const suggestedDriver = drivers.find((d) => d.id === order.suggestedDriverId)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onClick={onFocus}
      data-testid="order-card"
      data-order-no={order.orderNo}
      data-order-status={order.status}
      data-assigned-driver={assignedDriver?.name ?? ''}
      data-assigned-driver-id={assignedDriver?.id ?? ''}
      className={`cursor-pointer rounded-xl border p-3.5 transition ${
        focused ? 'border-cyan-400/50 bg-cyan-400/[0.06]' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-white">{order.orderNo}</span>
          <span className="text-[11px] text-slate-500">{order.channel}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <OrderTypeBadge type={order.type} />
        {order.flightInfo && <FlightBadge status={order.flightInfo.status} />}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-300">
        <span className="truncate">{order.pickup.name}</span>
        <span className="text-slate-600">→</span>
        <span className="truncate">{order.dropoff.name}</span>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" /> {order.customer.name}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" /> {order.passengers}
        </span>
        <span className="flex items-center gap-1">
          <Luggage className="h-3 w-3" /> {order.luggage}
        </span>
        <span>{formatClock(order.scheduledTime)}</span>
        <span className="font-semibold text-slate-300">{formatTWD(order.priceEstimate)}</span>
      </div>

      {order.flightInfo && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/[0.03] px-2 py-1.5 text-[11px] text-slate-400">
          <Plane className="h-3 w-3 text-cyan-300" />
          {order.flightInfo.flightNumber} · Gate {order.flightInfo.gate}
          {order.flightInfo.delayMinutes > 0 && <span className="text-amber-300">+{order.flightInfo.delayMinutes}m</span>}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2.5">
        {order.status === 'NEW' && suggestedDriver ? (
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Wand2 className="h-3 w-3 text-purple-300" />
              Suggested: <span className="font-medium text-slate-200">{suggestedDriver.name}</span>
              <TierBadge tier={suggestedDriver.tier} />
            </div>
            <Button
              size="sm"
              data-testid="assign-button"
              onClick={(e) => {
                e.stopPropagation()
                assignOrder(order.id)
              }}
            >
              <Zap className="h-3 w-3" /> Assign
            </Button>
          </div>
        ) : order.status === 'NEW' ? (
          <span className="text-[11px] text-red-400">No available driver — waiting for one to free up.</span>
        ) : assignedDriver ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            Driver: <span className="font-medium text-slate-200">{assignedDriver.name}</span>
            <TierBadge tier={assignedDriver.tier} />
          </div>
        ) : (
          <span className="text-[11px] text-slate-500">—</span>
        )}

        {(order.status === 'NEW' || order.status === 'ASSIGNED') && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              cancelOrder(order.id)
            }}
            className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400"
            title="Cancel order"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}
