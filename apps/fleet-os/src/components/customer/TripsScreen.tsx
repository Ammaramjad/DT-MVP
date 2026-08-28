import { useMemo, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Car, Clock3, FileText, Heart, MessageSquareWarning, PackageSearch, PlaneLanding, QrCode, RefreshCw, Share2, ShieldCheck, Star, UserRound, X, Receipt } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { Driver, Order, Vehicle, CustomerProfile } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { OrderTypeBadge, UrgencyBadge } from '../ui/OrderBadges'
import { StatusBadge } from '../ui/OrderBadges'
import { ActivityScreen } from './ActivityScreen'
import { FareBreakdownCard } from '../vehicles/FareBreakdownCard'
import { TaiwanInvoiceModal } from '../invoices/TaiwanInvoiceModal'
import { TipDriverModal, SplitFareModal, LostAndFoundModal } from './CustomerServiceModals'
import { formatClock, formatDateTime, formatTWD, orderStatusLabel } from '../../lib/format'
import { isDriverInfoRevealed, isVehicleSubstituted } from '../../lib/selectors'
import { FREE_CANCELLATION_WINDOW_HOURS } from '../../lib/serviceRules'
import { useLang } from '../../i18n'

type TripFilter = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'REFUND'

const ACTIVE_SET = new Set(['CONFIRMED', 'DRIVER_MATCHING', 'ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'PASSENGER_ONBOARD'])
const UPCOMING_SET = new Set(['DRAFT', 'PENDING_PAYMENT', 'PAID', 'SUPPLIER_PENDING'])
const CANCELLED_SET = new Set(['CANCELLATION_REQUESTED', 'CANCELLED', 'FAILED'])
const REFUND_SET = new Set(['REFUND_PENDING', 'REFUNDED'])

const FILTERS: { key: TripFilter; labelKey: string }[] = [
  { key: 'UPCOMING', labelKey: 'trips.filter.upcoming' },
  { key: 'ACTIVE', labelKey: 'trips.filter.active' },
  { key: 'COMPLETED', labelKey: 'trips.filter.completed' },
  { key: 'CANCELLED', labelKey: 'trips.filter.cancelled' },
  { key: 'REFUND', labelKey: 'trips.filter.refund' },
]

/** "My Trips" — the client brief's dedicated Upcoming / Active / Completed /
 * Cancelled / Refund tabs, each with receipts/vouchers/invoices, driver
 * rating + "book again", pickup-time/flight/note changes, cancellation and
 * refund requests, and a linked support-case timeline. The Active tab keeps
 * the existing full live-tracking experience (ActivityScreen) intact. */
export function TripsScreen({
  order,
  orders,
  onSelectOrder,
  driver,
  vehicle,
  vehicles,
  profile,
  liveOrders,
  onGoToSafety,
}: {
  order: Order
  orders: Order[]
  onSelectOrder: (id: string) => void
  driver: Driver | undefined
  vehicle: Vehicle | undefined
  vehicles: Vehicle[]
  profile: CustomerProfile | null
  liveOrders: Order[]
  onGoToSafety?: () => void
}) {
  const { t, lang } = useLang()
  const [filter, setFilter] = useState<TripFilter>(ACTIVE_SET.has(order.status) ? 'ACTIVE' : 'UPCOMING')

  const sorted = useMemo(() => [...liveOrders].sort((a, b) => b.createdAt - a.createdAt), [liveOrders])
  const filtered = useMemo(() => {
    switch (filter) {
      case 'UPCOMING':
        return sorted.filter((o) => UPCOMING_SET.has(o.status))
      case 'ACTIVE':
        return sorted.filter((o) => ACTIVE_SET.has(o.status))
      case 'COMPLETED':
        return sorted.filter((o) => o.status === 'COMPLETED')
      case 'CANCELLED':
        return sorted.filter((o) => CANCELLED_SET.has(o.status))
      case 'REFUND':
        return sorted.filter((o) => REFUND_SET.has(o.status))
      default:
        return sorted
    }
  }, [sorted, filter])

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6" data-testid="customer-trips-screen">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('trips.title')}</h1>
        <p className="text-xs text-slate-500">{t('trips.subtitle')}</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1" data-testid="trips-filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            data-testid={`trips-filter-${f.key.toLowerCase()}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === f.key ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/30' : 'bg-white text-slate-500 ring-1 ring-slate-200'
            }`}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {filter === 'ACTIVE' && ACTIVE_SET.has(order.status) ? (
        <ActivityScreen order={order} orders={orders} onSelectOrder={onSelectOrder} driver={driver} vehicle={vehicle} vehicles={vehicles} profile={profile} liveOrders={liveOrders} onGoToSafety={onGoToSafety} />
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-xs text-slate-400 shadow-sm ring-1 ring-slate-100">{t('trips.empty')}</p>}
          {filtered.map((o) => (
            <TripCard key={o.id} order={o} vehicles={vehicles} lang={lang} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function TripCard({ order, vehicles, lang, t }: { order: Order; vehicles: Vehicle[]; lang: 'en' | 'zh'; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const rescheduleOrder = useFleetStore((s) => s.rescheduleOrder)
  const addOrderNote = useFleetStore((s) => s.addOrderNote)
  const updateFlightNumber = useFleetStore((s) => s.updateFlightNumber)
  const requestCancellation = useFleetStore((s) => s.requestCancellation)
  const rateDriver = useFleetStore((s) => s.rateDriver)
  const requestInvoice = useFleetStore((s) => s.requestInvoice)
  const createSupportTicket = useFleetStore((s) => s.createSupportTicket)
  const revealDriverInfoNow = useFleetStore((s) => s.revealDriverInfoNow)
  const simulateFlightEvent = useFleetStore((s) => s.simulateFlightEvent)

  const [showVoucher, setShowVoucher] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showTipModal, setShowTipModal] = useState(false)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [showLostModal, setShowLostModal] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [noteInput, setNoteInput] = useState(order.notes)
  const [rescheduleValue, setRescheduleValue] = useState(order.scheduledTime.slice(0, 16))
  const [rated, setRated] = useState(order.driverRatingByCustomer ?? 0)
  const [ticketCreated, setTicketCreated] = useState(false)
  const [invoiceRequested, setInvoiceRequested] = useState(order.invoiceRequested)

  const drivers = useFleetStore((s) => s.drivers)
  const assignedDriver = drivers.find((d) => d.id === order.driverId)

  const pickupName = lang === 'zh' ? order.pickup.nameZh : order.pickup.name
  const dropoffName = lang === 'zh' ? order.dropoff.nameZh : order.dropoff.name
  const canModify = UPCOMING_SET.has(order.status) || order.status === 'CONFIRMED'
  const canCancel = !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED', 'CANCELLATION_REQUESTED'].includes(order.status)

  // 萬馬接送-style 48h free-cancellation window & driver-info-reveal timing,
  // computed live off this specific trip rather than shown as static copy.
  const hoursUntilTrip = (new Date(order.scheduledTime).getTime() - Date.now()) / 3_600_000
  const withinFreeCancellationWindow = hoursUntilTrip >= FREE_CANCELLATION_WINDOW_HOURS
  const driverRevealed = isDriverInfoRevealed(order)
  const substituted = isVehicleSubstituted(order, vehicles)
  const showAutoCancelDemo = order.bookingUrgency === 'LAST_MINUTE' && order.type === 'AIRPORT_PICKUP' && order.flightInfo && ['CONFIRMED', 'DRIVER_MATCHING'].includes(order.status)

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-4 shadow-md shadow-slate-200/50 ring-1 ring-slate-100" data-testid="trip-card">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-bold text-slate-700">{order.orderNo}</span>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <OrderTypeBadge type={order.type} />
        <UrgencyBadge urgency={order.bookingUrgency} />
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-semibold text-blue-600" data-testid="trip-vehicle-category">
          {t(`vehicle.category.${order.vehicleCategory}`)}
        </span>
        <span className="text-[11px] text-slate-400">{order.channel}</span>
      </div>
      <p className="mt-2 truncate text-sm text-slate-700">
        {pickupName} → {dropoffName}
      </p>
      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>{formatDateTime(order.scheduledTime, lang)}</span>
        <span className="font-semibold text-slate-600">{formatTWD(order.priceEstimate)}</span>
      </div>

      {/* Driver-info-reveal timing (萬馬接送) — full contact details are
          withheld until the reveal window/dispatch, with an honest
          placeholder state beforehand rather than showing them instantly. */}
      {order.driverId && !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(order.status) && (
        <div
          className={`mt-2.5 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[11px] ${driverRevealed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}
          data-testid={driverRevealed ? 'trip-driver-revealed' : 'trip-driver-not-revealed'}
        >
          <span className="flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5" /> {driverRevealed ? t('trips.driverRevealed') : t('trips.driverNotRevealedYet')}
          </span>
          {!driverRevealed && (
            <button onClick={() => revealDriverInfoNow(order.id)} data-testid="trip-reveal-driver-now" className="font-semibold text-blue-600 hover:underline">
              {t('trips.revealNowDemo')}
            </button>
          )}
        </div>
      )}

      {/* Vehicle-substitution transparency (萬馬接送) — an honest notice, not
          a silent swap, when dispatch assigned a compatible-but-different
          category/vehicle than what was originally booked. */}
      {substituted && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700" data-testid="trip-vehicle-substituted-notice">
          <Car className="h-3.5 w-3.5" /> {t('trips.vehicleSubstituted')}
        </div>
      )}

      {/* Late-boarding waiting fee (萬馬接送) — surfaced on the trip's
          charges once actually incurred at pickup, cash to the driver. */}
      {order.lateFeeAmount != null && order.lateFeeAmount > 0 && (
        <div className="mt-2 flex items-center justify-between gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700" data-testid="trip-waiting-fee-notice">
          <span className="flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" /> {t('trips.waitingFeeCharged', { min: order.lateFeeWaitMinutes ?? 0 })}
          </span>
          <span className="font-semibold">{t('pricing.cashToDriver', { amount: formatTWD(order.lateFeeAmount) })}</span>
        </div>
      )}

      {/* Free-cancellation-window trust text — a real, functioning state
          rather than static marketing copy (機場快綫 / 萬馬接送). */}
      {canCancel && (
        <p className={`mt-2 flex items-center gap-1.5 text-[10.5px] ${withinFreeCancellationWindow ? 'text-emerald-500' : 'text-amber-500'}`} data-testid="trip-cancellation-window">
          <ShieldCheck className="h-3 w-3" />
          {withinFreeCancellationWindow ? t('booking.trustFreeCancellation', { h: FREE_CANCELLATION_WINDOW_HOURS }) : t('booking.trustCancellationWindowClosing')}
        </p>
      )}

      {/* Demo-only: force the last-minute auto-cancel simulation to play out
          live by fast-forwarding this flight to LANDED (see `tick()`'s
          post-landing auto-cancel window in useFleetStore.ts). */}
      {showAutoCancelDemo && (
        <button
          onClick={() => simulateFlightEvent(order.id, 'LANDED')}
          data-testid="trip-simulate-flight-landed"
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-50 py-1.5 text-[10.5px] font-medium text-cyan-700 hover:bg-cyan-100"
        >
          <PlaneLanding className="h-3 w-3" /> {t('trips.simulateFlightLandedDemo')}
        </button>
      )}

      {order.status === 'COMPLETED' && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
          <span className="text-[11px] text-slate-500">{t('trips.rateDriver')}</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                onClick={() => {
                  setRated(i)
                  rateDriver(order.id, i)
                }}
                data-testid="trip-rate-star"
              >
                <Star className={`h-4 w-4 ${i <= rated ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {canModify && (
          <ChipButton onClick={() => setShowReschedule((v) => !v)} testId="trip-change-time">
            <Calendar className="h-3 w-3" /> {t('trips.changeTime')}
          </ChipButton>
        )}
        {canModify && order.pickup.isAirport && (
          <ChipButton onClick={() => setShowNote((v) => !v)} testId="trip-change-flight">
            <FileText className="h-3 w-3" /> {t('trips.changeFlight')}
          </ChipButton>
        )}
        <ChipButton onClick={() => setShowNote((v) => !v)} testId="trip-add-note">
          <FileText className="h-3 w-3" /> {t('trips.addNote')}
        </ChipButton>
        <ChipButton onClick={() => setShowVoucher((v) => !v)} testId="trip-view-voucher">
          <QrCode className="h-3 w-3" /> {showVoucher ? t('customer.activity.hideVoucher') : t('customer.activity.viewVoucher')}
        </ChipButton>
        {/* Split Fare & Share trip */}
        <ChipButton onClick={() => setShowSplitModal(true)} testId="trip-split-fare-btn">
          <Share2 className="h-3 w-3 text-cyan-600" /> {t('customer.split.btnLabel')}
        </ChipButton>
        {/* Tip & Rating appreciation */}
        {order.status === 'COMPLETED' && (
          <ChipButton onClick={() => setShowTipModal(true)} testId="trip-tip-driver-btn">
            <Heart className="h-3 w-3 text-pink-500 fill-pink-500/20" /> {t('customer.tip.btnLabel')}
          </ChipButton>
        )}
        {/* Lost & Found assistant */}
        {order.status === 'COMPLETED' && (
          <ChipButton onClick={() => setShowLostModal(true)} testId="trip-lost-found-btn">
            <PackageSearch className="h-3 w-3 text-amber-600" /> {t('customer.lost.btnLabel')}
          </ChipButton>
        )}
        {/* Taiwan e-GUI Invoice proof modal trigger */}
        <ChipButton onClick={() => setShowInvoiceModal(true)} testId="trip-view-egui-invoice">
          <Receipt className="h-3 w-3 text-cyan-600" /> {lang === 'zh' ? '查看電子發票證明聯' : 'View e-GUI Invoice'}
        </ChipButton>
        {order.status === 'COMPLETED' && !invoiceRequested && (
          <ChipButton
            onClick={() => {
              requestInvoice(order.id)
              setInvoiceRequested(true)
            }}
            testId="trip-request-invoice"
          >
            <FileText className="h-3 w-3" /> {t('trips.requestInvoice')}
          </ChipButton>
        )}
        {invoiceRequested && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600">{t('trips.invoiceIssued')}</span>}
        {order.status === 'COMPLETED' && (
          <ChipButton testId="trip-book-again">
            <RefreshCw className="h-3 w-3" /> {t('trips.bookAgain')}
          </ChipButton>
        )}
        {canCancel && (
          <ChipButton
            tone="red"
            onClick={() => requestCancellation(order.id, t('trips.cancelReasonDefault'))}
            testId="trip-request-cancel"
          >
            <X className="h-3 w-3" /> {t('trips.requestCancellation')}
          </ChipButton>
        )}
        {!ticketCreated ? (
          <ChipButton
            onClick={() => {
              createSupportTicket(order.id, order.customer.name, t('trips.supportSubjectDefault', { orderNo: order.orderNo }), 'General')
              setTicketCreated(true)
            }}
            testId="trip-create-ticket"
          >
            <MessageSquareWarning className="h-3 w-3" /> {t('trips.createTicket')}
          </ChipButton>
        ) : (
          <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-600">{t('trips.ticketCreated')}</span>
        )}
      </div>

      <AnimatePresence>
        {showReschedule && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={rescheduleValue}
                onChange={(e) => setRescheduleValue(e.target.value)}
                data-testid="trip-reschedule-input"
                className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
              />
              <button
                onClick={() => {
                  rescheduleOrder(order.id, new Date(rescheduleValue).toISOString())
                  setShowReschedule(false)
                }}
                data-testid="trip-reschedule-confirm"
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {t('trips.save')}
              </button>
            </div>
          </motion.div>
        )}
        {showNote && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
            <div className="flex gap-2">
              <input
                value={order.pickup.isAirport ? order.flightNumber ?? noteInput : noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={t('trips.notePlaceholder')}
                data-testid="trip-note-input"
                className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
              />
              <button
                onClick={() => {
                  addOrderNote(order.id, noteInput)
                  if (order.pickup.isAirport) updateFlightNumber(order.id, noteInput.toUpperCase())
                  setShowNote(false)
                }}
                data-testid="trip-note-save"
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {t('trips.save')}
              </button>
            </div>
          </motion.div>
        )}
        {showVoucher && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden rounded-xl border border-dashed border-slate-200 p-4 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-100">
              <QRCodeSVG value={JSON.stringify({ orderNo: order.orderNo, pickup: pickupName, dropoff: dropoffName })} size={88} />
            </div>
            <p className="mt-2 font-mono text-xs font-bold text-slate-800">{order.orderNo}</p>
            <p className="mt-1 text-[10.5px] text-slate-400">{t('trips.pin', { pin: order.pickupPin })}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <details className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px]" data-testid="trip-fare-breakdown">
        <summary className="cursor-pointer font-medium text-slate-500">{t('booking.fareBreakdown')}</summary>
        <div className="mt-2">
          <FareBreakdownCard fareBreakdown={order.fareBreakdown} distanceKm={order.distanceKm} durationMin={order.durationMin} />
        </div>
      </details>

      {order.statusHistory.length > 0 && (
        <details className="mt-3 text-[11px]">
          <summary className="cursor-pointer font-medium text-slate-500">{t('customer.statusTimeline')}</summary>
          <ol className="mt-2 space-y-1 pl-2">
            {order.statusHistory.map((h) => (
              <li key={h.id} className="flex items-center gap-2 text-slate-500">
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                {orderStatusLabel(h.status, lang)} · {formatClock(new Date(h.at).toISOString(), lang)}
              </li>
            ))}
          </ol>
        </details>
      )}

      {showInvoiceModal && (
        <TaiwanInvoiceModal
          invoice={{
            id: `inv-${order.id}`,
            invoiceNo: `AB-${order.orderNo.replace(/[^0-9]/g, '').slice(-8).padStart(8, '0') || '89234120'}`,
            period: '115年07-08月',
            issueDate: new Date(order.createdAt).toISOString().replace('T', ' ').slice(0, 19),
            type: order.invoiceRequested ? 'B2B' : 'B2C',
            carrierType: order.invoiceRequested ? 'CORPORATE_UBN' : 'MOBILE_BARCODE',
            carrierCode: order.invoiceRequested ? '23307688' : '/AB12+CD',
            buyerUbn: order.invoiceRequested ? '23307688' : undefined,
            buyerTitle: order.invoiceRequested ? `${order.customer.name} (Corporate Account)` : undefined,
            sellerUbn: '83294821',
            sellerTitle: '走瘋派車智慧科技股份有限公司',
            amountUntaxed: Math.round(order.priceEstimate / 1.05),
            taxAmount: order.priceEstimate - Math.round(order.priceEstimate / 1.05),
            amountTotal: order.priceEstimate,
            randomCode: '8842',
            orderId: order.id,
            orderNo: order.orderNo,
            customerName: order.customer.name,
            customerPhone: order.customer.phone,
            status: 'ISSUED',
            mofSynced: true,
            mofSyncTime: new Date(order.createdAt + 5000).toISOString().replace('T', ' ').slice(0, 19),
          }}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {showTipModal && (
        <TipDriverModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          order={order}
          driver={assignedDriver}
        />
      )}

      {showSplitModal && (
        <SplitFareModal
          isOpen={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          order={order}
        />
      )}

      {showLostModal && (
        <LostAndFoundModal
          isOpen={showLostModal}
          onClose={() => setShowLostModal(false)}
          order={order}
        />
      )}
    </motion.div>
  )
}

function ChipButton({
  children,
  onClick,
  tone = 'default',
  testId,
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'default' | 'red'
  testId?: string
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
        tone === 'red' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  )
}
