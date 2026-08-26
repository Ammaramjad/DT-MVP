import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, ListTree, Luggage, MapPinned, Phone, Plane, QrCode, ShieldCheck, Star, Users } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useFleetStore } from '../store/useFleetStore'
import { PanelHeader } from '../components/layout/PanelHeader'
import { StatusStepper } from '../components/ui/StatusStepper'
import { OrderTypeBadge, FlightBadge, ChannelBadge } from '../components/ui/OrderBadges'
import { CountdownRing } from '../components/ui/CountdownRing'
import { RouteMapView } from '../components/map/RouteMapView'
import { BookingHistoryCard } from '../components/customer/BookingHistoryCard'
import { VehicleCard } from '../components/vehicles/VehicleCard'
import { formatClock, formatRelative, formatTWD, orderStatusLabel, ticksToMinutesLabel } from '../lib/format'
import { remainingDistanceKm } from '../lib/geo'
import { useLang } from '../i18n'

type Tab = 'TRACKING' | 'HISTORY' | 'VOUCHER'

export default function CustomerTrackingPanel() {
  const { t, lang } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const customerProfiles = useFleetStore((s) => s.customerProfiles)
  const focusOrderId = useFleetStore((s) => s.focusOrderId)
  const setFocusOrder = useFleetStore((s) => s.setFocusOrder)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<Tab>('TRACKING')

  const sortedOrders = useMemo(() => [...orders].sort((a, b) => b.createdAt - a.createdAt), [orders])
  const selectedId = focusOrderId ?? sortedOrders[0]?.id ?? null
  const order = orders.find((o) => o.id === selectedId) ?? sortedOrders[0]

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  if (!order) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">{t('customer.noOrders')}</div>
  }

  const driver = drivers.find((d) => d.id === order.driverId)
  const vehicle = vehicles.find((v) => v.id === order.vehicleId)
  const isDispatched = !['NEW', 'PENDING_DRIVER_RESPONSE', 'CANCELLED'].includes(order.status)
  const isDone = order.status === 'COMPLETED'
  const isCancelled = order.status === 'CANCELLED'
  const isPendingDriver = order.status === 'PENDING_DRIVER_RESPONSE'
  const activeAttempt = order.dispatchAttempts[order.dispatchAttempts.length - 1]

  const customerProfile =
    customerProfiles.find((p) => p.phone === order.customer.phone) ?? customerProfiles.find((p) => p.name === order.customer.name) ?? null
  const customerLiveOrders = orders.filter((o) => o.customer.phone === order.customer.phone || o.customer.name === order.customer.name)

  const activeLeg =
    order.status === 'EN_ROUTE_TO_PICKUP' || order.status === 'ASSIGNED' || order.status === 'NEW' ? order.routeToPickup : order.routeToDropoff
  const remainingKm = activeLeg ? remainingDistanceKm(activeLeg, order.legProgress) : order.distanceKm
  const remainingTicks = activeLeg ? activeLeg.durationTicks * (1 - order.legProgress) : 0

  const pickupName = lang === 'zh' ? order.pickup.nameZh : order.pickup.name
  const dropoffName = lang === 'zh' ? order.dropoff.nameZh : order.dropoff.name

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white pb-32 text-slate-900">
      <PanelHeader title={t('customer.title')} subtitle={t('customer.subtitle')} icon={<MapPinned className="h-5 w-5" />} light />

      <div className="mx-auto mt-4 max-w-2xl px-4">
        <select
          value={order.id}
          onChange={(e) => setFocusOrder(e.target.value)}
          data-testid="customer-order-select"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {sortedOrders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNo} · {o.customer.name} · {orderStatusLabel(o.status, lang)}
            </option>
          ))}
        </select>
      </div>

      <div className="mx-auto mt-4 max-w-2xl px-4">
        <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
          {(['TRACKING', 'HISTORY', 'VOUCHER'] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              data-testid={`customer-tab-${tabKey.toLowerCase()}`}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                tab === tabKey ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tabKey === 'TRACKING' ? t('customer.tabTracking') : tabKey === 'HISTORY' ? t('customer.tabHistory') : t('customer.voucherTab')}
            </button>
          ))}
        </div>
      </div>

      {tab === 'HISTORY' && (
        <div className="mx-auto mt-4 max-w-2xl px-4">
          <BookingHistoryCard profile={customerProfile} liveOrders={customerLiveOrders} />
        </div>
      )}

      {tab === 'VOUCHER' && (
        <div className="mx-auto mt-4 max-w-2xl px-4">
          <div className="rounded-2xl bg-white p-6 text-center shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
            <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <QrCode className="h-3.5 w-3.5" /> {t('booking.voucherTitle')}
            </p>
            <div className="mx-auto mt-4 flex h-36 w-36 items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
              <QRCodeSVG
                value={JSON.stringify({ orderNo: order.orderNo, pickup: pickupName, dropoff: dropoffName, scheduledTime: order.scheduledTime })}
                size={128}
              />
            </div>
            <p className="mt-3 font-mono text-base font-bold text-slate-800">{order.orderNo}</p>
            <p className="mt-1 text-xs text-slate-500">{t('booking.voucherHint')}</p>

            <div className="mt-5 space-y-1.5 rounded-xl border border-dashed border-slate-200 p-4 text-left text-xs text-slate-600">
              <div className="flex justify-between">
                <span>{t('trip.pickup')}</span>
                <span className="font-medium text-slate-800">{pickupName}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('trip.dropoff')}</span>
                <span className="font-medium text-slate-800">{dropoffName}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('trip.scheduled')}</span>
                <span className="font-medium text-slate-800">{formatClock(order.scheduledTime, lang)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5">
                <span>{t('trip.total')}</span>
                <span className="font-semibold text-slate-900">{formatTWD(order.fareBreakdown.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'TRACKING' && (
      <div className="mx-auto mt-4 max-w-2xl px-4">
        <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
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

          {order.status === 'NEW' && (
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
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">{driver.avatarEmoji}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {lang === 'zh' ? driver.nameZh : driver.name} <span className="text-slate-400">· {lang === 'zh' ? driver.name : driver.nameZh}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {vehicle?.plate} · <Star className="inline h-3 w-3 fill-amber-400 text-amber-400" /> {driver.rating.toFixed(1)}
                </p>
              </div>
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm hover:bg-blue-600">
                <Phone className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {vehicle && (
            <div className="mt-3">
              <VehicleCard type={vehicle.type} plate={vehicle.plate} size="sm" light />
            </div>
          )}

          {!isDone && !isCancelled && (
            <div className="mt-4 h-64 overflow-hidden rounded-xl">
              <RouteMapView order={order} />
            </div>
          )}

          {(order.status === 'EN_ROUTE_TO_PICKUP' || order.status === 'IN_TRANSIT') && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50 p-3.5">
              <div>
                <p className="text-xs text-blue-500">{order.status === 'EN_ROUTE_TO_PICKUP' ? t('customer.arrivingIn') : t('customer.arrivingDestIn')}</p>
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

          <button
            onClick={() => {
              navigator.clipboard?.writeText(`https://zoufengpaiche.demo/track/${order.orderNo}`).catch(() => {})
              setCopied(true)
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
          >
            <Copy className="h-3.5 w-3.5" /> {copied ? t('customer.linkCopied') : t('customer.shareLink')}
          </button>
        </div>
      </div>
      )}
    </div>
  )
}
