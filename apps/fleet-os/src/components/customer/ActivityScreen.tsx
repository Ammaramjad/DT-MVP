import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, KeyRound, ListTree, Luggage, MessageCircle, MonitorSmartphone, Phone, Plane, QrCode, ShieldCheck, Star, Users, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { CustomerProfile, Driver, Order, Vehicle } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { StatusStepper } from '../ui/StatusStepper'
import { OrderTypeBadge, FlightBadge, ChannelBadge } from '../ui/OrderBadges'
import { CountdownRing } from '../ui/CountdownRing'
import { RouteMapView } from '../map/RouteMapView'
import { BookingHistoryCard } from './BookingHistoryCard'
import { VehicleCard } from '../vehicles/VehicleCard'
import { FareBreakdownCard } from '../vehicles/FareBreakdownCard'
import { formatClock, formatRelative, formatTWD, orderStatusLabel, ticksToMinutesLabel } from '../../lib/format'
import { remainingDistanceKm } from '../../lib/geo'
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
  profile,
  liveOrders,
  onGoToSafety,
}: {
  order: Order
  orders: Order[]
  onSelectOrder: (id: string) => void
  driver: Driver | undefined
  vehicle: Vehicle | undefined
  profile: CustomerProfile | null
  liveOrders: Order[]
  onGoToSafety?: () => void
}) {
  const { t, lang } = useLang()
  const requestCancellation = useFleetStore((s) => s.requestCancellation)
  const [copied, setCopied] = useState(false)
  const [messaged, setMessaged] = useState(false)
  const [showVoucher, setShowVoucher] = useState(false)
  const [cancelRequested, setCancelRequested] = useState(false)

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
        <h1 className="text-xl font-bold text-slate-900">{t('customer.activity.title')}</h1>
        <p className="text-xs text-slate-500">{t('customer.activity.subtitle')}</p>
      </div>

      <select
        value={order.id}
        onChange={(e) => onSelectOrder(e.target.value)}
        data-testid="customer-order-select"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {sortedOrders.map((o) => (
          <option key={o.id} value={o.id}>
            {o.orderNo} · {o.customer.name} · {orderStatusLabel(o.status, lang)}
          </option>
        ))}
      </select>

      <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100" data-testid="customer-current-trip">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('customer.activity.currentTrip')}</p>
            <p className="font-mono text-sm font-bold text-slate-800">{order.orderNo}</p>
            <p className="text-xs text-slate-400">{t('customer.scheduled', { clock: formatClock(order.scheduledTime, lang) })}</p>
          </div>
          <OrderTypeBadge type={order.type} />
        </div>

        {isCancelled ? (
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-center text-sm text-red-500">{t('customer.cancelled')}</div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <StatusStepper status={order.status} />
          </div>
        )}

        {order.status === 'CONFIRMED' && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-600">{t('customer.orderReceived')}</div>
        )}

        {isPendingDriver && activeAttempt && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-3 rounded-xl bg-blue-50 p-3.5">
            <CountdownRing sentAt={activeAttempt.sentAt} respondBy={activeAttempt.respondBy} tone={activeAttempt.stage === 2 ? 'amber' : 'cyan'} />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700">{activeAttempt.stage === 2 ? t('customer.stillConfirming') : t('customer.contactingDriver')}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {activeAttempt.channels.map((c) => (
                  <ChannelBadge key={c} channel={c} compact />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {isDispatched && driver && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-slate-50 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">{driver.avatarEmoji}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {lang === 'zh' ? driver.nameZh : driver.name} <span className="text-slate-400">· {lang === 'zh' ? driver.name : driver.nameZh}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {vehicle?.plate} · <Star className="inline h-3 w-3 fill-amber-400 text-amber-400" /> {driver.rating.toFixed(1)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMessaged(true)}
                  data-testid="customer-message-driver"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100"
                  aria-label={t('customer.activity.messageDriver')}
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm hover:bg-blue-600"
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
                  className="mt-2 text-[11px] font-medium text-emerald-600"
                >
                  {t('customer.activity.messageSent')}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {isDispatched && !isDone && !isCancelled && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600">
                <KeyRound className="h-3.5 w-3.5" /> {t('customer.activity.pickupPin')}
              </span>
              <span className="font-mono text-base font-bold tracking-widest text-blue-700" data-testid="customer-pickup-pin">
                {order.pickupPin}
              </span>
            </div>
            <button
              onClick={onGoToSafety}
              data-testid="customer-activity-safety-cta"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> {t('customer.activity.safetyCenter')}
            </button>
          </div>
        )}

        {order.pickupInstructions && !isDone && !isCancelled && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3.5" data-testid="customer-pickup-instructions">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <MonitorSmartphone className="h-3 w-3" /> {t('customer.activity.pickupInstructions')}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="font-bold text-slate-700">{order.pickupInstructions.terminal}</p>
                <p className="text-[10px] text-slate-400">{t('booking.terminal')}</p>
              </div>
              <div>
                <p className="font-bold text-slate-700">{order.pickupInstructions.gate}</p>
                <p className="text-[10px] text-slate-400">{t('booking.gateLabel')}</p>
              </div>
              <div>
                <p className="font-bold text-slate-700">{order.pickupInstructions.meetAndGreetBoard}</p>
                <p className="text-[10px] text-slate-400">{t('customer.activity.meetBoard')}</p>
              </div>
            </div>
          </div>
        )}

        {vehicle && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-semibold text-blue-600" data-testid="customer-trip-vehicle-category">
                {t(`vehicle.category.${order.vehicleCategory}`)}
              </span>
            </div>
            <VehicleCard type={vehicle.type} plate={vehicle.plate} size="sm" light />
          </div>
        )}

        {!isDone && !isCancelled && (
          <div className="mt-4 h-56 overflow-hidden rounded-xl">
            <RouteMapView order={order} />
          </div>
        )}

        {(order.status === 'DRIVER_EN_ROUTE' || order.status === 'PASSENGER_ONBOARD') && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50 p-3.5">
            <div>
              <p className="text-xs text-blue-500">{order.status === 'DRIVER_EN_ROUTE' ? t('customer.arrivingIn') : t('customer.arrivingDestIn')}</p>
              <p className="text-lg font-bold text-blue-700">{ticksToMinutesLabel(remainingTicks, lang)}</p>
            </div>
            <div className="text-right text-xs text-blue-500">{t('customer.kmRemaining', { km: remainingKm.toFixed(1) })}</div>
          </div>
        )}

        {isDone && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 rounded-xl bg-emerald-50 p-5 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-2 font-semibold text-emerald-700">{t('customer.tripCompleted')}</p>
            <div className="mt-2 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </motion.div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[11px] text-slate-400">{t('customer.pickup')}</p>
            <p className="font-medium text-slate-700">{pickupName}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[11px] text-slate-400">{t('customer.dropoff')}</p>
            <p className="font-medium text-slate-700">{dropoffName}</p>
          </div>
        </div>

        {order.flightInfo && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-slate-700">{order.flightInfo.flightNumber}</span>
              <span className="text-xs text-slate-400">{t('booking.gate', { gate: order.flightInfo.gate })}</span>
            </div>
            <FlightBadge status={order.flightInfo.status} />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {t('customer.passengers', { n: order.passengers })}
          </span>
          <span className="flex items-center gap-1">
            <Luggage className="h-3.5 w-3.5" /> {t('customer.bags', { n: order.luggage })}
          </span>
          <span className="font-semibold text-slate-600">{formatTWD(order.priceEstimate)}</span>
        </div>

        <details className="mt-3 rounded-xl bg-slate-50 p-3.5 text-xs" data-testid="customer-trip-fare-breakdown">
          <summary className="cursor-pointer font-medium text-slate-500">{t('booking.fareBreakdown')}</summary>
          <div className="mt-2">
            <FareBreakdownCard fareBreakdown={order.fareBreakdown} distanceKm={order.distanceKm} durationMin={order.durationMin} />
          </div>
        </details>

        {order.statusHistory.length > 0 && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <ListTree className="h-3 w-3" /> {t('customer.statusTimeline')}
            </p>
            <ol className="space-y-1.5">
              {order.statusHistory.map((h, i) => (
                <li key={h.id} className="flex items-center gap-2 text-[11px]">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${i === order.statusHistory.length - 1 ? 'bg-blue-500' : 'bg-slate-300'}`} />
                  <span className="font-medium text-slate-700">{orderStatusLabel(h.status, lang)}</span>
                  <span className="ml-auto text-slate-400">{formatRelative(h.at, lang)}</span>
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
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            <Copy className="h-3.5 w-3.5" /> {copied ? t('customer.linkCopied') : t('customer.shareLink')}
          </button>
          <button
            onClick={() => setShowVoucher((v) => !v)}
            data-testid="customer-toggle-voucher"
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            <QrCode className="h-3.5 w-3.5" /> {showVoucher ? t('customer.activity.hideVoucher') : t('customer.activity.viewVoucher')}
          </button>
        </div>

        {!isDone && !isCancelled && (
          <div className="mt-2">
            {cancelRequested || order.status === 'CANCELLATION_REQUESTED' ? (
              <p className="rounded-xl bg-amber-50 py-2.5 text-center text-xs font-medium text-amber-600" data-testid="customer-cancel-requested-banner">
                {t('customer.activity.cancelRequested')}
              </p>
            ) : (
              <button
                onClick={() => {
                  requestCancellation(order.id, t('trips.cancelReasonDefault'))
                  setCancelRequested(true)
                }}
                data-testid="customer-activity-cancel-change"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-2.5 text-xs font-medium text-red-500 hover:bg-red-100"
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
              className="mt-3 overflow-hidden rounded-xl border border-dashed border-slate-200 p-4 text-center"
              data-testid="customer-voucher-panel"
            >
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-100">
                <QRCodeSVG
                  value={JSON.stringify({ orderNo: order.orderNo, pickup: pickupName, dropoff: dropoffName, scheduledTime: order.scheduledTime })}
                  size={104}
                />
              </div>
              <p className="mt-2 font-mono text-sm font-bold text-slate-800">{order.orderNo}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('customer.activity.pastTrips')}</p>
        <BookingHistoryCard profile={profile} liveOrders={liveOrders} />
      </div>
    </div>
  )
}
