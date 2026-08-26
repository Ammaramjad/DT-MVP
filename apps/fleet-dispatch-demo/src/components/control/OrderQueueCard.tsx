import { motion } from 'framer-motion'
import { AlertOctagon, FlaskConical, Luggage, Plane, User, Users, Wand2, X, Zap } from 'lucide-react'
import type { Order } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { OrderTypeBadge, StatusBadge, FlightBadge, TierBadge, ChannelBadge } from '../ui/OrderBadges'
import { Button } from '../ui/Button'
import { CountdownRing } from '../ui/CountdownRing'
import { DispatchLog } from './DispatchLog'
import { formatTWD, formatClock } from '../../lib/format'

export function OrderQueueCard({ order, focused, onFocus }: { order: Order; focused: boolean; onFocus: () => void }) {
  const drivers = useFleetStore((s) => s.drivers)
  const assignOrder = useFleetStore((s) => s.assignOrder)
  const cancelOrder = useFleetStore((s) => s.cancelOrder)
  const toggleDemoNoResponse = useFleetStore((s) => s.toggleDemoNoResponse)

  const assignedDriver = drivers.find((d) => d.id === order.driverId)
  const suggestedDriver = drivers.find((d) => d.id === order.suggestedDriverId)
  const pendingDriver = drivers.find((d) => d.id === order.pendingDriverId)
  const activeAttempt = order.dispatchAttempts[order.dispatchAttempts.length - 1]
  const lastUnresponsiveId = order.unresponsiveDriverIds[order.unresponsiveDriverIds.length - 1]
  const lastUnresponsiveDriver = drivers.find((d) => d.id === lastUnresponsiveId)
  const isFreshArrival = order.status === 'NEW' && Date.now() - order.createdAt < 3200

  return (
    <motion.div
      layout
      initial={isFreshArrival ? { opacity: 0, y: -28, scale: 0.92 } : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      onClick={onFocus}
      data-testid="order-card"
      data-order-no={order.orderNo}
      data-order-status={order.status}
      data-assigned-driver={assignedDriver?.name ?? ''}
      data-assigned-driver-id={assignedDriver?.id ?? ''}
      className={`relative cursor-pointer rounded-xl border p-3.5 transition ${
        focused ? 'border-cyan-400/50 bg-cyan-400/[0.06]' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
      }`}
    >
      {isFreshArrival && (
        <motion.span
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2.4, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-cyan-300"
          style={{ boxShadow: '0 0 24px rgba(34,211,238,0.55)' }}
        />
      )}
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

      {order.status === 'PENDING_DRIVER_RESPONSE' && pendingDriver && activeAttempt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`mt-2.5 flex items-center gap-3 rounded-xl border p-2.5 ${
            activeAttempt.stage === 2 ? 'border-amber-400/30 bg-amber-400/[0.06]' : 'border-cyan-400/30 bg-cyan-400/[0.06]'
          }`}
        >
          <CountdownRing sentAt={activeAttempt.sentAt} respondBy={activeAttempt.respondBy} tone={activeAttempt.stage === 2 ? 'amber' : 'cyan'} size={38} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-slate-200">
              {activeAttempt.stage === 2 ? 'Escalated — awaiting' : 'Notifying'} <span className="text-slate-100">{pendingDriver.name}</span>
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {activeAttempt.channels.map((c) => (
                <ChannelBadge key={c} channel={c} />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {order.status === 'NEW' && lastUnresponsiveDriver && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2.5 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/[0.08] px-2.5 py-2 text-[11px] text-red-300">
          <AlertOctagon className="h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-semibold">{lastUnresponsiveDriver.name}</span> was unresponsive on all channels — reassign to next available driver.
          </span>
        </motion.div>
      )}

      <DispatchLog attempts={order.dispatchAttempts} />

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
              <Zap className="h-3 w-3" /> {lastUnresponsiveDriver ? 'Reassign' : 'Assign'}
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

      {(order.status === 'NEW' || order.status === 'PENDING_DRIVER_RESPONSE') && (
        <button
          data-testid="demo-no-response-toggle"
          onClick={(e) => {
            e.stopPropagation()
            toggleDemoNoResponse(order.id)
          }}
          title="Demo: force this order's driver to never respond, so the full escalation ladder plays out live"
          className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10.5px] font-medium transition ${
            order.demoForceNoResponse
              ? 'border-red-400/40 bg-red-400/10 text-red-300'
              : 'border-white/5 bg-white/[0.02] text-slate-500 hover:text-slate-300'
          }`}
        >
          <FlaskConical className="h-3 w-3" />
          {order.demoForceNoResponse ? 'Demo: driver will NOT respond' : 'Demo: simulate driver not responding'}
        </button>
      )}
    </motion.div>
  )
}
