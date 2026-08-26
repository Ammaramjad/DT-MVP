import { motion } from 'framer-motion'
import { CheckCircle2, Luggage, MapPin, Users, X, Zap } from 'lucide-react'
import type { Order } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { CountdownRing } from '../ui/CountdownRing'
import { ChannelBadge, OrderTypeBadge } from '../ui/OrderBadges'
import { Button } from '../ui/Button'
import { formatClock, formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

/**
 * The Driver App's Uber-style full-screen incoming-ride sheet — replaces the
 * old inline card with a modal that takes over the whole screen the moment a
 * dispatch attempt targets this driver, no matter which tab they're on,
 * mirroring how the real Uber Driver app interrupts with a full takeover
 * sheet + countdown ring rather than a small notification. Wires straight
 * into the existing multi-channel dispatch/escalation store logic.
 */
export function IncomingRequestModal({ order }: { order: Order }) {
  const { t, lang } = useLang()
  const respondToDispatch = useFleetStore((s) => s.respondToDispatch)
  const attempt = order.dispatchAttempts[order.dispatchAttempts.length - 1]
  if (!attempt) return null

  const isEscalated = attempt.stage === 2

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1300] flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center"
      data-testid="incoming-request-modal"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className={`relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border-t sm:rounded-[28px] sm:border ${
          isEscalated ? 'border-amber-400/40 bg-slate-900' : 'border-cyan-400/40 bg-slate-900'
        }`}
      >
        <div className="flex flex-col items-center gap-3 px-6 pt-7">
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${isEscalated ? 'text-amber-300' : 'text-cyan-300'}`}
          >
            <Zap className="h-4 w-4" /> {isEscalated ? t('driver.escalatedRequest') : t('driver.incomingRequest')}
          </motion.span>
          <CountdownRing sentAt={attempt.sentAt} respondBy={attempt.respondBy} size={104} tone={isEscalated ? 'amber' : 'cyan'} />
          <div className="flex flex-wrap justify-center gap-1.5">
            {attempt.channels.map((c) => (
              <ChannelBadge key={c} channel={c} />
            ))}
          </div>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto px-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-base font-bold text-white">{order.orderNo}</span>
            <OrderTypeBadge type={order.type} />
          </div>

          <div className="mt-3 flex items-baseline justify-between rounded-xl bg-white/5 p-3.5">
            <span className="text-xs text-slate-400">{t('driver.estimatedFareLabel')}</span>
            <span className="text-2xl font-black text-emerald-300">{formatTWD(order.priceEstimate)}</span>
          </div>

          <div className="mt-3 space-y-2 rounded-xl bg-white/5 p-3.5 text-sm">
            <p className="flex items-start gap-2 text-slate-200">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /> {lang === 'zh' ? order.pickup.nameZh : order.pickup.name}
            </p>
            <p className="flex items-start gap-2 text-slate-200">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-pink-300" /> {lang === 'zh' ? order.dropoff.nameZh : order.dropoff.name}
            </p>
            <div className="flex items-center gap-4 border-t border-white/10 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {order.passengers}
              </span>
              <span className="flex items-center gap-1">
                <Luggage className="h-3.5 w-3.5" /> {order.luggage}
              </span>
              <span>{formatClock(order.scheduledTime, lang)}</span>
              <span className="ml-auto font-medium text-slate-300">{order.distanceKm.toFixed(1)} km</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/10 p-5">
          <Button variant="secondary" size="lg" onClick={() => respondToDispatch(order.id, false)} data-testid="decline-request-button">
            <X className="h-5 w-5" /> {t('driver.decline')}
          </Button>
          <Button variant="success" size="lg" onClick={() => respondToDispatch(order.id, true)} data-testid="accept-request-button">
            <CheckCircle2 className="h-5 w-5" /> {t('driver.accept')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
