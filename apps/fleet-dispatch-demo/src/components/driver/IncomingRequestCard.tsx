import { motion } from 'framer-motion'
import { CheckCircle2, Luggage, MapPin, Users, X, Zap } from 'lucide-react'
import type { Order } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { CountdownRing } from '../ui/CountdownRing'
import { ChannelBadge, OrderTypeBadge } from '../ui/OrderBadges'
import { Button } from '../ui/Button'
import { formatClock, formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

// The Driver App's live "incoming dispatch" moment — shown while an order is
// PENDING_DRIVER_RESPONSE for this driver. Accepting/declining here plugs
// straight into the same escalation ladder the Control Center is watching.
export function IncomingRequestCard({ order }: { order: Order }) {
  const { t, lang } = useLang()
  const respondToDispatch = useFleetStore((s) => s.respondToDispatch)
  const attempt = order.dispatchAttempts[order.dispatchAttempts.length - 1]
  if (!attempt) return null

  const isEscalated = attempt.stage === 2

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={`overflow-hidden rounded-2xl border p-4 shadow-xl ${
        isEscalated ? 'border-amber-400/40 bg-amber-400/[0.08]' : 'border-cyan-400/40 bg-cyan-400/[0.08]'
      }`}
      data-testid="incoming-request-card"
    >
      <div className="flex items-center justify-between">
        <motion.span
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${isEscalated ? 'text-amber-300' : 'text-cyan-300'}`}
        >
          <Zap className="h-3.5 w-3.5" /> {isEscalated ? t('driver.escalatedRequest') : t('driver.incomingRequest')}
        </motion.span>
        <CountdownRing sentAt={attempt.sentAt} respondBy={attempt.respondBy} tone={isEscalated ? 'amber' : 'cyan'} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {attempt.channels.map((c) => (
          <ChannelBadge key={c} channel={c} />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-white">{order.orderNo}</span>
        <OrderTypeBadge type={order.type} />
      </div>

      <div className="mt-2 space-y-1.5 rounded-xl bg-black/20 p-2.5 text-xs">
        <p className="flex items-start gap-1.5 text-slate-300">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" /> {lang === 'zh' ? order.pickup.nameZh : order.pickup.name}
        </p>
        <p className="flex items-start gap-1.5 text-slate-300">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-300" /> {lang === 'zh' ? order.dropoff.nameZh : order.dropoff.name}
        </p>
        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {order.passengers}
          </span>
          <span className="flex items-center gap-1">
            <Luggage className="h-3 w-3" /> {order.luggage}
          </span>
          <span>{formatClock(order.scheduledTime, lang)}</span>
          <span className="font-semibold text-slate-300">{formatTWD(order.priceEstimate)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => respondToDispatch(order.id, false)} data-testid="decline-request-button">
          <X className="h-4 w-4" /> {t('driver.decline')}
        </Button>
        <Button variant="success" onClick={() => respondToDispatch(order.id, true)} data-testid="accept-request-button">
          <CheckCircle2 className="h-4 w-4" /> {t('driver.accept')}
        </Button>
      </div>
    </motion.div>
  )
}
