import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Car, Check, Copy, KeyRound, ListTree, Luggage, MessageCircle, MonitorSmartphone, Phone, Plane, QrCode, ShieldAlert, ShieldCheck, Siren, Star, UserRound, Users, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { CustomerProfile, Driver, Order, Vehicle } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { StatusStepper } from '../ui/StatusStepper'
import { OrderTypeBadge, FlightBadge, ChannelBadge, UrgencyBadge } from '../ui/OrderBadges'
import { CountdownRing } from '../ui/CountdownRing'
import { RouteMapView } from '../map/RouteMapView'
import { BookingHistoryCard } from './BookingHistoryCard'
import { VehicleCard } from '../vehicles/VehicleCard'
import { FareBreakdownCard } from '../vehicles/FareBreakdownCard'
import { formatClock, formatRelative, formatTWD, orderStatusLabel, ticksToMinutesLabel } from '../../lib/format'
import { remainingDistanceKm } from '../../lib/geo'
import { isDriverInfoRevealed, isVehicleSubstituted } from '../../lib/selectors'
import { useLang } from '../../i18n'

/** The Customer App's "Activity" tab — a polished Uber/55688-style live
 * tracking card (driver photo/rating/vehicle, live ETA, call + message
 * actions, live map, e-Voucher) for whichever order is selected, plus the
 * existing "My Bookings" history analytics underneath. */
export function ActivityScreen({
  order,
  orders,
  onSelectOrder,
  driver,
  vehicle,
  vehicles = [],
  profile,
  liveOrders,
  onGoToSafety,
}: {
  order: Order
  orders: Order[]
  onSelectOrder: (id: string) => void
  driver: Driver | undefined
  vehicle: Vehicle | undefined
  vehicles?: Vehicle[]
  profile: CustomerProfile | null
  liveOrders: Order[]
  onGoToSafety?: () => void
}) {
  const { t, lang } = useLang()
  const requestCancellation = useFleetStore((s) => s.requestCancellation)
  const revealDriverInfoNow = useFleetStore((s) => s.revealDriverInfoNow)
  const [copied, setCopied] = useState(false)
  const [messaged, setMessaged] = useState(false)
  const [showVoucher, setShowVoucher] = useState(false)
  const [cancelRequested, setCancelRequested] = useState(false)

  const driverRevealed = isDriverInfoRevealed(order)
  const substituted = isVehicleSubstituted(order, vehicles)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    if (!messaged) return
    const timer = window.setTimeout(() => setMessaged(false), 1800)
    return () => window.clearTimeout(timer)
  }, [messaged])

  const isDispatched = !['NEW', 'DRIVER_MATCHING', 'CANCELLED'].includes(order.status)
  const isDone = order.status === 'COMPLETED'
  const isCancelled = order.status === 'CANCELLED'
  const isPendingDriver = order.status === 'DRIVER_MATCHING'
  const activeAttempt = order.dispatchAttempts[order.dispatchAttempts.length - 1]
  const isEmergencyActive = order.incidentReportedAt !== undefined && order.emergencyStatus !== 'RESOLVED'
  const isRescueDispatched = order.emergencyStatus === 'RESCUE_DISPATCHED' || order.emergencyStatus === 'RESCUE_EN_ROUTE' || order.emergencyStatus === 'RESCUE_ARRIVED'
  const rescueDriver = useFleetStore((s) => s.drivers).find((d) => d.id === order.rescueDriverId)
  const rescueVehicle = useFleetStore((s) => s.vehicles).find((v) => v.id === rescueDriver?.vehicleId)

  const activeLeg =
    order.status === 'DRIVER_EN_ROUTE' || order.status === 'ASSIGNED' || order.status === 'CONFIRMED' ? order.routeToPickup : order.routeToDropoff
  const remainingKm = activeLeg ? remainingDistanceKm(activeLeg, order.legProgress) : order.distanceKm
  const remainingTicks = activeLeg ? activeLeg.durationTicks * (1 - order.legProgress) : 0

  const pickupName = lang === 'zh' ? order.pickup.nameZh : order.pickup.name
  const dropoffName = lang === 'zh' ? order.dropoff.nameZh : order.dropoff.name
  const sortedOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6" data-testid="customer-activity-screen">
      <div>
        <h1 className="text-xl font-bold text-white">{t('customer.activity.title')}</h1>
        <p className="text-xs text-slate-400">{t('customer.activity.subtitle')}</p>
      </div>

      <select
        value={order.id}
        onChange={(e) => onSelectOrder(e.target.value)}
        data-testid="customer-order-select"
        className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg outline-none focus:border-cyan-400/50"
      >
        {sortedOrders.map((o) => (
          <option key={o.id} value={o.id} className="bg-slate-900 text-white">
            {o.orderNo} · {o.customer.name} · {orderStatusLabel(o.status, lang)}
          </option>
        ))}
      </select>

      <div className="glass-panel-glow rounded-3xl p-5 shadow-2xl" data-testid="customer-current-trip">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-cyan-400">{t('customer.activity.currentTrip')}</p>
            <p className="font-mono text-base font-bold text-white">{order.orderNo}</p>
            <p className="text-xs text-slate-400">{t('customer.scheduled', { clock: formatClock(order.scheduledTime, lang) })}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <OrderTypeBadge type={order.type} />
            <UrgencyBadge urgency={order.bookingUrgency} />
          </div>
        </div>

        {/* Calming, reassuring Emergency Reassurance Card */}
        {isEmergencyActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 overflow-hidden rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 shadow-xl ring-1 ring-rose-500/20"
            data-testid="customer-emergency-reassurance-card"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/40">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  {t('customer.emergency.incidentNoticeTitle')}
                </p>
                <p className="mt-1 text-sm font-semibold text-white leading-snug">
                  {t('customer.emergency.reassuranceMessage')}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {t('customer.emergency.originalDriverIncidentNote', {
                    driver: driver ? `${lang === 'zh' ? driver.nameZh : driver.name}` : '司機',
                    type: order.incidentType ? t(`driver.emergency.type${order.incidentType === 'MEDICAL_EMERGENCY' ? 'Medical' : order.incidentType === 'BREAKDOWN' ? 'Breakdown' : order.incidentType === 'ROAD_BLOCK' ? 'RoadBlock' : 'Accident'}`) : '',
                  })}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-rose-500/20 pt-3">
              <button
                onClick={onGoToSafety}
                data-testid="customer-emergency-hotline-btn"
                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/10 p-2 text-center text-[11px] font-semibold text-rose-300 ring-1 ring-white/10 hover:bg-rose-500/20"
              >
                <Phone className="h-4 w-4 text-rose-400" />
                <span>{t('customer.emergency.callHotline')}</span>
              </button>

              <button
                onClick={() => setCopied(true)}
                data-testid="customer-emergency-share-btn"
                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/10 p-2 text-center text-[11px] font-semibold text-slate-200 ring-1 ring-white/10 hover:bg-white/15"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
                <span>{copied ? t('customer.emergency.statusShared') : t('customer.emergency.shareStatus')}</span>
              </button>

              <button
                onClick={onGoToSafety}
                data-testid="customer-emergency-sos-btn"
                className="flex flex-col items-center justify-center gap-1 rounded-xl bg-rose-600 p-2 text-center text-[11px] font-bold text-white shadow-md shadow-rose-600/40 hover:bg-rose-500"
              >
                <Siren className="h-4 w-4" />
                <span>{t('customer.emergency.emergencySos')}</span>
              </button>
            </div>

            {/* Replacement Driver Details (Once Dispatched) */}
            {isRescueDispatched && rescueDriver && (
              <div className="mt-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3" data-testid="customer-rescue-driver-card">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-300">
                  ✓ {t('customer.emergency.replacementDriverEnRoute')}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-2xl shadow-inner">
                    {rescueDriver.avatarEmoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">
                      {lang === 'zh' ? rescueDriver.nameZh : rescueDriver.name}{' '}
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                        {t('customer.emergency.rescueDriverBadge')}
                      </span>
                    </p>
                    <p className="text-xs text-slate-300">
                      {rescueVehicle?.plate} · <Star className="inline h-3 w-3 fill-amber-300 text-amber-300" /> {rescueDriver.rating.toFixed(1)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm hover:bg-emerald-400"
                      aria-label={t('customer.activity.callDriver')}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {isCancelled ? (
          <div className="mt-4 rounded-xl bg-rose-500/15 border border-rose-500/30 p-4 text-center text-sm font-semibold text-rose-300">{t('customer.cancelled')}</div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <StatusStepper status={order.status} />
          </div>
        )}

        {order.status === 'CONFIRMED' && (
          <div className="mt-4 rounded-xl bg-amber-500/15 border border-amber-500/30 p-4 text-center text-xs font-semibold text-amber-300">{t('customer.orderReceived')}</div>
        )}

        {isPendingDriver && activeAttempt && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-3 rounded-2xl bg-cyan-950/40 border border-cyan-400/20 p-4">
            <CountdownRing sentAt={activeAttempt.sentAt} respondBy={activeAttempt.respondBy} tone={activeAttempt.stage === 2 ? 'amber' : 'cyan'} />
            <div className="flex-1">
              <p className="text-xs font-semibold text-cyan-200">{activeAttempt.stage === 2 ? t('customer.stillConfirming') : t('customer.contactingDriver')}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {activeAttempt.channels.map((c) => (
                  <ChannelBadge key={c} channel={c} compact />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {isDispatched && driver && driverRevealed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4" data-testid="customer-driver-revealed-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-inner">{driver.avatarEmoji}</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">
                  {lang === 'zh' ? driver.nameZh : driver.name} <span className="text-slate-400 font-normal">· {lang === 'zh' ? driver.name : driver.nameZh}</span>
                </p>
                <p className="text-xs text-slate-300">
                  {vehicle?.plate} · <Star className="inline h-3 w-3 fill-amber-300 text-amber-300" /> {driver.rating.toFixed(1)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMessaged(true)}
                  data-testid="customer-message-driver"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-200 shadow-sm ring-1 ring-white/15 hover:bg-white/20"
                  aria-label={t('customer.activity.messageDriver')}
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 hover:bg-cyan-400 font-bold"
                  aria-label={t('customer.activity.callDriver')}
                >
                  <Phone className="h-4 w-4" />
                </button>
              </div>
            </div>
            <AnimatePresence>
              {messaged && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-[11px] font-semibold text-emerald-400"
                >
                  ✓ {t('customer.activity.messageSent')}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {isDispatched && driver && !driverRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            data-testid="customer-driver-not-revealed-card"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <UserRound className="h-4 w-4 text-cyan-400" /> {t('trips.driverNotRevealedYet')}
            </span>
            <button onClick={() => revealDriverInfoNow(order.id)} data-testid="customer-reveal-driver-now" className="text-[11px] font-bold text-cyan-300 hover:underline">
              {t('trips.revealNowDemo')}
            </button>
          </motion.div>
        )}

        {substituted && !isDone && !isCancelled && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3.5 py-2.5 text-[11px] text-amber-200" data-testid="customer-vehicle-substituted-notice">
            <Car className="h-4 w-4 shrink-0 text-amber-300" /> {t('trips.vehicleSubstituted')}
          </div>
        )}

        {isDispatched && !isDone && !isCancelled && (
          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            <div className="flex items-center justify-between rounded-2xl border border-cyan-400/30 bg-cyan-950/40 p-3">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300">
                <KeyRound className="h-3.5 w-3.5" /> {t('customer.activity.pickupPin')}
              </span>
              <span className="font-mono text-base font-black tracking-widest text-white" data-testid="customer-pickup-pin">
                {order.pickupPin}
              </span>
            </div>
            <button
              onClick={onGoToSafety}
              data-testid="customer-activity-safety-cta"
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> {t('customer.activity.safetyCenter')}
            </button>
          </div>
        )}

        {order.pickupInstructions && !isDone && !isCancelled && (
          <div className="mt-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5" data-testid="customer-pickup-instructions">
            <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-cyan-400">
              <MonitorSmartphone className="h-3.5 w-3.5" /> {t('customer.activity.pickupInstructions')}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-white/5 p-2">
                <p className="font-black text-white">{order.pickupInstructions.terminal}</p>
                <p className="text-[10px] text-slate-400">{t('booking.terminal')}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <p className="font-black text-white">{order.pickupInstructions.gate}</p>
                <p className="text-[10px] text-slate-400">{t('booking.gateLabel')}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <p className="font-black text-cyan-300">{order.pickupInstructions.meetAndGreetBoard}</p>
                <p className="text-[10px] text-slate-400">{t('customer.activity.meetBoard')}</p>
              </div>
            </div>
          </div>
        )}

        {vehicle && (
          <div className="mt-3.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="rounded-full bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-0.5 text-[10.5px] font-bold text-cyan-300" data-testid="customer-trip-vehicle-category">
                {t(`vehicle.category.${order.vehicleCategory}`)}
              </span>
            </div>
            <VehicleCard type={vehicle.type} plate={vehicle.plate} size="sm" />
          </div>
        )}

        {!isDone && !isCancelled && (
          <div className="mt-4 h-56 overflow-hidden rounded-2xl">
            <RouteMapView order={order} />
          </div>
        )}

        {(order.status === 'DRIVER_EN_ROUTE' || order.status === 'PASSENGER_ONBOARD') && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-cyan-950/60 to-blue-950/60 p-4">
            <div>
              <p className="text-xs text-cyan-300 font-semibold">{order.status === 'DRIVER_EN_ROUTE' ? t('customer.arrivingIn') : t('customer.arrivingDestIn')}</p>
              <p className="text-xl font-black text-white">{ticksToMinutesLabel(remainingTicks, lang)}</p>
            </div>
            <div className="text-right text-xs text-cyan-300 font-mono">{t('customer.kmRemaining', { km: remainingKm.toFixed(1) })}</div>
          </div>
        )}

        {isDone && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="mt-2 font-bold text-emerald-300">{t('customer.tripCompleted')}</p>
            <div className="mt-2 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-amber-300 text-amber-300" />
              ))}
            </div>
          </motion.div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-white/5 bg-white/5 p-3">
            <p className="text-[10.5px] text-slate-400">{t('customer.pickup')}</p>
            <p className="font-bold text-white mt-0.5">{pickupName}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/5 p-3">
            <p className="text-[10.5px] text-slate-400">{t('customer.dropoff')}</p>
            <p className="font-bold text-white mt-0.5">{dropoffName}</p>
          </div>
        </div>

        {order.flightInfo && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3 text-xs">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-cyan-400" />
              <span className="font-bold text-white">{order.flightInfo.flightNumber}</span>
              <span className="text-slate-400">{t('booking.gate', { gate: order.flightInfo.gate })}</span>
            </div>
            <FlightBadge status={order.flightInfo.status} />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-3">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {t('customer.passengers', { n: order.passengers })}
          </span>
          <span className="flex items-center gap-1">
            <Luggage className="h-3.5 w-3.5" /> {t('customer.bags', { n: order.luggage })}
          </span>
          <span className="font-black text-white text-sm">{formatTWD(order.priceEstimate)}</span>
        </div>

        <details className="mt-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs" data-testid="customer-trip-fare-breakdown">
          <summary className="cursor-pointer font-semibold text-slate-400">{t('booking.fareBreakdown')}</summary>
          <div className="mt-2">
            <FareBreakdownCard fareBreakdown={order.fareBreakdown} distanceKm={order.distanceKm} durationMin={order.durationMin} />
          </div>
        </details>

        {order.lateFeeAmount != null && order.lateFeeAmount > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-xl bg-amber-500/20 border border-amber-500/30 px-3.5 py-2.5 text-xs text-amber-200" data-testid="customer-waiting-fee-notice">
            <span>{t('trips.waitingFeeCharged', { min: order.lateFeeWaitMinutes ?? 0 })}</span>
            <span className="font-bold text-amber-300">{t('pricing.cashToDriver', { amount: formatTWD(order.lateFeeAmount) })}</span>
          </div>
        )}

        {order.statusHistory.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              <ListTree className="h-3.5 w-3.5 text-cyan-400" /> {t('customer.statusTimeline')}
            </p>
            <ol className="space-y-1.5">
              {order.statusHistory.map((h, i) => (
                <li key={h.id} className="flex items-center gap-2 text-[11px]">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${i === order.statusHistory.length - 1 ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-600'}`} />
                  <span className="font-medium text-slate-300">{orderStatusLabel(h.status, lang)}</span>
                  <span className="ml-auto text-slate-500 font-mono text-[10px]">{formatRelative(h.at, lang)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(`https://zoufengpaiche.demo/track/${order.orderNo}`).catch(() => {})
              setCopied(true)
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            <Copy className="h-3.5 w-3.5" /> {copied ? t('customer.linkCopied') : t('customer.shareLink')}
          </button>
          <button
            onClick={() => setShowVoucher((v) => !v)}
            data-testid="customer-toggle-voucher"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            <QrCode className="h-3.5 w-3.5" /> {showVoucher ? t('customer.activity.hideVoucher') : t('customer.activity.viewVoucher')}
          </button>
        </div>

        {!isDone && !isCancelled && (
          <div className="mt-2">
            {cancelRequested || order.status === 'CANCELLATION_REQUESTED' ? (
              <p className="rounded-xl bg-amber-500/20 border border-amber-500/30 py-2.5 text-center text-xs font-semibold text-amber-300" data-testid="customer-cancel-requested-banner">
                {t('customer.activity.cancelRequested')}
              </p>
            ) : (
              <button
                onClick={() => {
                  requestCancellation(order.id, t('trips.cancelReasonDefault'))
                  setCancelRequested(true)
                }}
                data-testid="customer-activity-cancel-change"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25"
              >
                <X className="h-3.5 w-3.5" /> {t('customer.activity.cancelOrChange')}
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {showVoucher && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden rounded-2xl border border-dashed border-white/20 bg-slate-950/80 p-4 text-center"
              data-testid="customer-voucher-panel"
            >
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-xl bg-white p-2 shadow-lg">
                <QRCodeSVG
                  value={JSON.stringify({ orderNo: order.orderNo, pickup: pickupName, dropoff: dropoffName, scheduledTime: order.scheduledTime })}
                  size={104}
                />
              </div>
              <p className="mt-2.5 font-mono text-sm font-black text-cyan-300">{order.orderNo}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('customer.activity.pastTrips')}</p>
        <BookingHistoryCard profile={profile} liveOrders={liveOrders} />
      </div>
    </div>
  )
}
