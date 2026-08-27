import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Accessibility, Baby, CheckCircle2, Dog, Luggage, MapPin, MessageSquareText, Star, Users, X, Zap } from 'lucide-react'
import type { DeclineReason, Order } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { CountdownRing } from '../ui/CountdownRing'
import { ChannelBadge, OrderTypeBadge, SourceBadge } from '../ui/OrderBadges'
import { Button } from '../ui/Button'
import { formatClock, formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

const DECLINE_REASONS: DeclineReason[] = ['TOO_FAR', 'LOW_FARE', 'VEHICLE_MISMATCH', 'OFF_SHIFT', 'OTHER']

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
  const [showDeclineReasons, setShowDeclineReasons] = useState(false)
  const attempt = order.dispatchAttempts[order.dispatchAttempts.length - 1]
  if (!attempt) return null

  const isEscalated = attempt.stage === 2
  const passengerRating = 4.3 + (order.orderNo.length % 7) * 0.1

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
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-base font-bold text-white">{order.orderNo}</span>
            <div className="flex items-center gap-1.5">
              <SourceBadge channel={order.channel} />
              <OrderTypeBadge type={order.type} />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 p-3.5">
            <span className="flex items-center gap-1.5 text-xs text-slate-300">
              <Users className="h-3.5 w-3.5" /> {order.customer.name}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-300">
              <Star className="h-3.5 w-3.5 fill-amber-300" /> {passengerRating.toFixed(1)}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between rounded-xl bg-white/5 p-3.5">
            <span className="text-xs text-slate-400">{t('driver.expectedEarnings')}</span>
            <span className="text-2xl font-black text-emerald-300" data-testid="incoming-request-expected-earnings">
              {formatTWD(order.fareBreakdown.supplierPrice)}
            </span>
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
            <div className="flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2 text-xs text-slate-400">
              <span className="rounded-md bg-cyan-400/10 px-2 py-1 font-medium text-cyan-300" data-testid="incoming-request-service-class">
                {t(`vehicle.category.${order.vehicleCategory}`)}
              </span>
              {order.flightNumber && <span className="rounded-md bg-white/5 px-2 py-1 font-medium text-slate-300">{order.flightNumber}</span>}
            </div>
            {(order.passengerRequirements.childSeat || order.passengerRequirements.wheelchair || order.passengerRequirements.pet || order.passengerRequirements.specialAssistance) && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2" data-testid="incoming-request-special-requirements">
                {order.passengerRequirements.childSeat && (
                  <span className="flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-1 text-[11px] font-medium text-amber-300">
                    <Baby className="h-3 w-3" /> {t('driver.requirement.childSeat')}
                  </span>
                )}
                {order.passengerRequirements.wheelchair && (
                  <span className="flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-1 text-[11px] font-medium text-amber-300">
                    <Accessibility className="h-3 w-3" /> {t('driver.requirement.wheelchair')}
                  </span>
                )}
                {order.passengerRequirements.pet && (
                  <span className="flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-1 text-[11px] font-medium text-amber-300">
                    <Dog className="h-3 w-3" /> {t('driver.requirement.pet')}
                  </span>
                )}
                {order.passengerRequirements.specialAssistance && (
                  <span className="flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-1 text-[11px] font-medium text-amber-300">
                    {order.passengerRequirements.specialAssistance}
                  </span>
                )}
              </div>
            )}
          </div>

          {order.notes && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-200">
              <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {order.notes}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-5">
          <AnimatePresence mode="wait">
            {showDeclineReasons ? (
              <motion.div key="reasons" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} data-testid="decline-reason-picker">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('driver.declineReasonPrompt')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {DECLINE_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => respondToDispatch(order.id, false, reason)}
                      data-testid={`decline-reason-${reason.toLowerCase()}`}
                      className="rounded-lg bg-white/5 px-2.5 py-2 text-[11px] font-medium text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
                    >
                      {t(`driver.declineReason.${reason}`)}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowDeclineReasons(false)} className="mt-2.5 w-full text-center text-[11px] text-slate-400 hover:text-slate-300">
                  {t('driver.declineReasonCancel')}
                </button>
              </motion.div>
            ) : (
              <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
                <Button variant="secondary" size="lg" onClick={() => setShowDeclineReasons(true)} data-testid="decline-request-button">
                  <X className="h-5 w-5" /> {t('driver.decline')}
                </Button>
                <Button variant="success" size="lg" onClick={() => respondToDispatch(order.id, true)} data-testid="accept-request-button">
                  <CheckCircle2 className="h-5 w-5" /> {t('driver.accept')}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
