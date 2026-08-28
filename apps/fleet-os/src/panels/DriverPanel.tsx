import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  FlaskConical,
  Flag,
  HandCoins,
  Luggage,
  MapPin,
  Navigation,
  Phone,
  Plane,
  Power,
  Receipt,
  ShieldAlert,
  Star,
  Users,
} from 'lucide-react'
import { useFleetStore } from '../store/useFleetStore'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { OrderTypeBadge, FlightBadge } from '../components/ui/OrderBadges'
import { RouteMapView } from '../components/map/RouteMapView'
import { DriverStatsHeader } from '../components/driver/DriverStatsHeader'
import { DriverAvailabilityCard } from '../components/driver/DriverAvailabilityCard'
import { IncomingRequestModal } from '../components/driver/IncomingRequestModal'
import { DriverTabBar, type DriverTab } from '../components/driver/DriverTabBar'
import { EarningsScreen } from '../components/driver/EarningsScreen'
import { ActivityScreen } from '../components/driver/ActivityScreen'
import { AccountScreen } from '../components/driver/AccountScreen'
import { TeamMessenger } from '../components/fleetos/TeamMessenger'
import { OrderSwapModal } from '../components/driver/OrderSwapModal'
import { VehicleCard } from '../components/vehicles/VehicleCard'
import { EmergencyReportModal } from '../components/driver/EmergencyReportModal'
import { TaiwanInvoiceModal } from '../components/invoices/TaiwanInvoiceModal'
import { DriverFatigueWidget, PreTripInspectionModal } from '../components/driver/DriverCockpitWidgets'
import type { Order } from '../types'
import { formatClock, formatTWD, ticksToMinutesLabel } from '../lib/format'
import { remainingDistanceKm } from '../lib/geo'
import { computeWaitingFee, WAITING_FEE_FORFEIT_MINUTES, WAITING_GRACE_MINUTES } from '../lib/serviceRules'
import { useLang } from '../i18n'

const ACTIVE_STATUSES = ['ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'PASSENGER_ONBOARD']

export default function DriverPanel() {
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const orders = useFleetStore((s) => s.orders)
  const focusDriverId = useFleetStore((s) => s.focusDriverId)
  const setFocusDriver = useFleetStore((s) => s.setFocusDriver)
  const startTrip = useFleetStore((s) => s.startTrip)
  const verifyPickupPin = useFleetStore((s) => s.verifyPickupPin)
  const reportNoShow = useFleetStore((s) => s.reportNoShow)
  const setDriverAvailability = useFleetStore((s) => s.setDriverAvailability)
  const agreeToWaitForLatePassenger = useFleetStore((s) => s.agreeToWaitForLatePassenger)
  const simulateLatePassenger = useFleetStore((s) => s.simulateLatePassenger)

  const reportDriverEmergency = useFleetStore((s) => s.reportDriverEmergency)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [tab, setTab] = useState<DriverTab>('HOME')
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [showInspectionModal, setShowInspectionModal] = useState(false)
  const [showSwapModal, setShowSwapModal] = useState(false)

  const activeDriverId = focusDriverId ?? drivers[0]?.id ?? null
  const driver = drivers.find((d) => d.id === activeDriverId) ?? drivers[0]
  const vehicle = vehicles.find((v) => v.id === driver?.vehicleId)

  const activeOrder = orders.find((o) => o.driverId === driver?.id && ACTIVE_STATUSES.includes(o.status))
  const incomingRequest = orders.find((o) => o.status === 'DRIVER_MATCHING' && o.pendingDriverId === driver?.id)

  const recentlyCompleted = orders.find((o) => o.id === justCompletedId && o.status === 'COMPLETED')

  useEffect(() => {
    if (activeOrder?.status === 'PASSENGER_ONBOARD' && activeOrder.legProgress > 0.85) {
      setJustCompletedId(activeOrder.id)
    }
  }, [activeOrder])

  useEffect(() => {
    setPinInput('')
    setPinError(false)
  }, [activeOrder?.id, activeOrder?.status])

  if (!driver) return null

  const activeLeg =
    activeOrder?.status === 'DRIVER_EN_ROUTE' || activeOrder?.status === 'ASSIGNED'
      ? activeOrder.routeToPickup
      : activeOrder?.routeToDropoff
  const remainingKm = activeLeg ? remainingDistanceKm(activeLeg, activeOrder!.legProgress) : 0
  const remainingTicks = activeLeg ? activeLeg.durationTicks * (1 - activeOrder!.legProgress) : 0

  return (
    <div className="min-h-screen bg-[#030712] bg-noise pb-28 text-white" data-testid="driver-app-shell">
      {/* Futuristic Driver Cockpit Header */}
      <div className="sticky top-0 z-[700] border-b border-white/10 bg-slate-950/85 px-4 py-3.5 backdrop-blur-2xl shadow-2xl" data-testid="driver-app-header">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-xl shadow-inner ring-1 ring-white/15">{driver.avatarEmoji}</div>
            <div>
              <p className="text-sm font-black leading-tight text-white">{lang === 'zh' ? driver.nameZh : driver.name}</p>
              <p className="flex items-center gap-1 text-[10.5px] font-semibold text-amber-300">
                <Star className="h-3 w-3 fill-amber-300" /> {driver.rating.toFixed(1)} <span className="text-slate-500 font-normal">· Cockpit</span>
              </p>
            </div>
          </div>

          {(driver.status === 'AVAILABLE' || driver.status === 'OFFLINE') && (
            <button
              onClick={() => {
                if (driver.status === 'OFFLINE') {
                  setShowInspectionModal(true)
                } else {
                  setDriverAvailability(driver.id, 'OFFLINE')
                }
              }}
              data-testid="driver-online-toggle"
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition shadow-lg ${
                driver.status === 'AVAILABLE'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-800 text-slate-400 border border-white/10'
              }`}
            >
              <Power className={`h-3.5 w-3.5 ${driver.status === 'AVAILABLE' ? 'text-emerald-400 animate-pulse' : ''}`} />
              {driver.status === 'AVAILABLE' ? t('driver.online') : t('driver.offline')}
            </button>
          )}
          {driver.status === 'BUSY' && (
            <Badge tone="cyan" pulse>
              {t('driver.onTrip')}
            </Badge>
          )}
          {driver.status === 'INCIDENT' && (
            <Badge tone="pink" pulse>
              {t('driver.incidentMode')}
            </Badge>
          )}
          {driver.status === 'PENDING_RESPONSE' && (
            <Badge tone="pink" pulse>
              {t('driver.awaitingResponse')}
            </Badge>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'HOME' && (
          <motion.div key="home" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mx-auto mt-4 max-w-md px-4 space-y-4">
            <DriverStatsHeader stats={driver.stats} />

            {/* Fatigue & HoS Monitor */}
            <DriverFatigueWidget driver={driver} />

            <PreTripInspectionModal isOpen={showInspectionModal} onClose={() => setShowInspectionModal(false)} driver={driver} />

            {!activeOrder && <DriverAvailabilityCard driver={driver} />}

            <div className="glass-panel-glow overflow-hidden rounded-[28px] shadow-2xl">
              <AnimatePresence mode="wait">
                {activeOrder ? (
                  <TripInProgress
                    key={activeOrder.id}
                    order={activeOrder}
                    remainingKm={remainingKm}
                    remainingTicks={remainingTicks}
                    onStart={() => startTrip(activeOrder.id)}
                    onOpenEmergency={() => setShowEmergencyModal(true)}
                    onOpenSwap={() => setShowSwapModal(true)}
                    pinInput={pinInput}
                    onPinChange={setPinInput}
                    pinError={pinError}
                    onVerifyPin={() => {
                      const ok = verifyPickupPin(activeOrder.id, pinInput)
                      if (!ok) {
                        setPinError(true)
                        window.setTimeout(() => setPinError(false), 1600)
                      } else {
                        setPinInput('')
                      }
                    }}
                    onNoShow={() => reportNoShow(activeOrder.id)}
                    onAgreeToWait={() => agreeToWaitForLatePassenger(activeOrder.id)}
                    onSimulateLatePassenger={() => simulateLatePassenger(activeOrder.id)}
                  />
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-7 text-center">
                    {recentlyCompleted ? (
                      <TripCompletionCard order={recentlyCompleted} onDone={() => setJustCompletedId(null)} />
                    ) : (
                      <div>
                        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                          {driver.status !== 'OFFLINE' && (
                            <>
                              <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
                              <span className="absolute inset-2 animate-pulse-slow rounded-full bg-cyan-400/10" />
                            </>
                          )}
                          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900 border border-white/10 shadow-2xl">
                            <Navigation className={`h-8 w-8 ${driver.status === 'OFFLINE' ? 'text-slate-600' : 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'}`} />
                          </div>
                        </div>
                        <p className="mt-4 font-black text-white text-base tracking-wide">{driver.status === 'OFFLINE' ? t('driver.youAreOffline') : t('driver.youAreAvailable')}</p>
                        <p className="mt-1 text-xs text-slate-400">{driver.status === 'OFFLINE' ? t('driver.goOnline') : t('driver.waitingDispatch')}</p>
                        {driver.status === 'OFFLINE' && (
                          <Button className="mt-5" onClick={() => setDriverAvailability(driver.id, 'AVAILABLE')}>
                            <Power className="h-4 w-4" /> {t('driver.goOnlineCta')}
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {vehicle && (
              <div className="mt-4">
                <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('driver.myVehicle')}</p>
                <VehicleCard type={vehicle.type} plate={vehicle.plate} size="sm" />
              </div>
            )}
          </motion.div>
        )}

        {tab === 'EARNINGS' && (
          <motion.div key="earnings" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-4">
            <EarningsScreen driver={driver} />
          </motion.div>
        )}

        {tab === 'ACTIVITY' && (
          <motion.div key="activity" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-4">
            <ActivityScreen driver={driver} orders={orders} />
          </motion.div>
        )}

        {tab === 'MESSENGER' && (
          <motion.div key="messenger" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mx-auto mt-4 max-w-2xl px-3">
            <TeamMessenger mode="EMBEDDED" currentDriverId={driver.id} />
          </motion.div>
        )}

        {tab === 'ACCOUNT' && (
          <motion.div key="account" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-4">
            <AccountScreen driver={driver} drivers={drivers} vehicle={vehicle} onSwitchDriver={setFocusDriver} />
          </motion.div>
        )}
      </AnimatePresence>

      <DriverTabBar active={tab} onChange={setTab} />

      <AnimatePresence>{incomingRequest && <IncomingRequestModal key={incomingRequest.id} order={incomingRequest} />}</AnimatePresence>

      <AnimatePresence>
        {showEmergencyModal && activeOrder && (
          <EmergencyReportModal
            orderNo={activeOrder.orderNo}
            onClose={() => setShowEmergencyModal(false)}
            onSubmit={(data) => {
              reportDriverEmergency(activeOrder.id, data.incidentType, data)
              setShowEmergencyModal(false)
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSwapModal && activeOrder && (
          <OrderSwapModal
            order={activeOrder}
            driverId={driver.id}
            isOpen={showSwapModal}
            onClose={() => setShowSwapModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TripCompletionCard({ order, onDone }: { order: Order; onDone: () => void }) {
  const { t, lang } = useLang()
  const rateCustomer = useFleetStore((s) => s.rateCustomer)
  const uploadTollEvidence = useFleetStore((s) => s.uploadTollEvidence)
  const [rating, setRating] = useState(order.customerRatingByDriver ?? 0)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  return (
    <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} data-testid="driver-trip-completion-card">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260 }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40 shadow-lg shadow-emerald-500/25"
      >
        <CheckCircle2 className="h-9 w-9" />
      </motion.div>
      <p className="mt-3 font-bold text-lg text-white">{t('driver.tripCompleted')}</p>
      <p className="mt-1 text-3xl font-black text-emerald-300">{formatTWD(order.priceEstimate)}</p>

      <div className="mt-4 rounded-2xl border border-white/5 bg-white/5 p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('driver.rateCustomer')}</p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              onClick={() => {
                setRating(i)
                rateCustomer(order.id, i)
              }}
              data-testid="driver-rate-customer-star"
            >
              <Star className={`h-6 w-6 transition hover:scale-110 ${i <= rating ? 'fill-amber-300 text-amber-300' : 'text-slate-600'}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => uploadTollEvidence(order.id)}
          disabled={order.tollParkingEvidenceUploaded}
          data-testid="driver-upload-toll-evidence"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-200 disabled:opacity-40 hover:bg-white/10"
        >
          <Camera className="h-3.5 w-3.5" /> {order.tollParkingEvidenceUploaded ? t('driver.tollEvidenceUploaded') : t('driver.uploadTollEvidence')}
        </button>
        <button
          onClick={() => setShowInvoiceModal(true)}
          data-testid="driver-view-invoice-btn"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
        >
          <Receipt className="h-3.5 w-3.5 text-cyan-400" /> {lang === 'zh' ? '電子發票' : 'e-Invoice'}
        </button>
      </div>

      {showInvoiceModal && (
        <TaiwanInvoiceModal
          invoice={{
            id: `inv-${order.id}`,
            invoiceNo: `AB-${order.orderNo.replace(/[^0-9]/g, '').slice(-8).padStart(8, '0') || '89234120'}`,
            period: '115年07-08月',
            issueDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
            type: order.invoiceRequested ? 'B2B' : 'B2C',
            carrierType: order.invoiceRequested ? 'CORPORATE_UBN' : 'MEMBER_CARRIER',
            carrierCode: order.invoiceRequested ? '23307688' : `${order.customer.phone}`,
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
            mofSyncTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
          }}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      <Button fullWidth className="mt-4" onClick={onDone} data-testid="driver-trip-completion-done">
        {t('driver.completionDone')}
      </Button>
    </motion.div>
  )
}

function TripInProgress({
  order,
  remainingKm,
  remainingTicks,
  onStart,
  onOpenEmergency,
  onOpenSwap,
  pinInput,
  onPinChange,
  pinError,
  onVerifyPin,
  onNoShow,
  onAgreeToWait,
  onSimulateLatePassenger,
}: {
  order: Order
  remainingKm: number
  remainingTicks: number
  onStart: () => void
  onOpenEmergency: () => void
  onOpenSwap?: () => void
  pinInput: string
  onPinChange: (v: string) => void
  pinError: boolean
  onVerifyPin: () => void
  onNoShow: () => void
  onAgreeToWait: () => void
  onSimulateLatePassenger: () => void
}) {
  const { t, lang } = useLang()
  const waitMinutes = order.status === 'ARRIVED' && order.waitStartedAt ? Math.floor((Date.now() - order.waitStartedAt) / 60_000) : 0
  const isLate = waitMinutes > WAITING_GRACE_MINUTES
  const feePreview = isLate ? computeWaitingFee(order.vehicleCategory, waitMinutes) : 0
  const isForfeitable = waitMinutes > WAITING_FEE_FORFEIT_MINUTES && !order.waitingFeeAgreed
  const isIncidentReported = order.incidentReportedAt !== undefined && order.emergencyStatus === 'INCIDENT_REPORTED'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {isIncidentReported ? (
        <div className="border-b border-rose-500/30 bg-rose-950/40 p-4" data-testid="driver-incident-mode-banner">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-rose-300">{t('driver.emergency.incidentActiveTitle')}</p>
              <p className="text-xs text-rose-200/80">{t('driver.emergency.incidentActiveSubtitle')}</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-rose-500/20 bg-black/40 p-3 text-xs text-slate-300 space-y-1.5">
            <p className="font-semibold text-rose-300">
              {t('driver.emergency.typeLabel')}: {t(`driver.emergency.type${order.incidentType === 'MEDICAL_EMERGENCY' ? 'Medical' : order.incidentType === 'BREAKDOWN' ? 'Breakdown' : order.incidentType === 'ROAD_BLOCK' ? 'RoadBlock' : 'Accident'}`)}
            </p>
            <p>{t('driver.emergency.passengerSafety')}: {order.incidentDetails?.passengerSafe ? t('driver.emergency.passengerSafe') : t('driver.emergency.passengerInjured')}</p>
            {order.incidentDetails?.note && <p className="text-slate-400">{order.incidentDetails.note}</p>}
            <p className="pt-1 text-[11px] text-cyan-300">✓ {t('driver.emergency.rescueCoordinating')}</p>
          </div>
        </div>
      ) : null}

      <div className="border-b border-white/10 bg-slate-950/70 p-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-black text-cyan-300">{order.orderNo}</span>
          <OrderTypeBadge type={order.type} />
        </div>
        <div className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Users className="h-3.5 w-3.5 text-cyan-400" /> {order.customer.name}
            <Phone className="ml-2 h-3.5 w-3.5 text-slate-400" /> {order.customer.phone}
          </div>
          <div className="mt-2.5 space-y-1.5 text-xs">
            <p className="flex items-start gap-2 text-slate-200">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" /> {lang === 'zh' ? order.pickup.nameZh : order.pickup.name}
            </p>
            <p className="flex items-start gap-2 text-slate-200">
              <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-400" /> {lang === 'zh' ? order.dropoff.nameZh : order.dropoff.name}
            </p>
          </div>
          <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-400 border-t border-white/5 pt-2">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {order.passengers}
            </span>
            <span className="flex items-center gap-1">
              <Luggage className="h-3 w-3" /> {order.luggage}
            </span>
            <span>{formatClock(order.scheduledTime, lang)}</span>
          </div>
          {order.notes && <p className="mt-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 p-2 text-[11px] text-amber-200">{t('driver.notesForDriver', { notes: order.notes })}</p>}
        </div>

        {order.flightInfo && (
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-cyan-400" />
              <div>
                <p className="font-bold text-white">{order.flightInfo.flightNumber}</p>
                <p className="text-[10.5px] text-slate-400">{t('booking.gate', { gate: order.flightInfo.gate })}</p>
              </div>
            </div>
            <FlightBadge status={order.flightInfo.status} />
          </div>
        )}
      </div>

      <div className="h-56 overflow-hidden">
        <RouteMapView order={order} />
      </div>

      <div className="space-y-3.5 p-4">
        {(order.status === 'DRIVER_EN_ROUTE' || order.status === 'PASSENGER_ONBOARD') && (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-950/30 p-3.5">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-bold text-cyan-300">
                <Navigation className="h-3.5 w-3.5" />
                {order.status === 'DRIVER_EN_ROUTE' ? t('driver.drivingToPickup') : t('driver.drivingToDest')}
              </span>
              <span className="font-mono text-cyan-200">{t('driver.kmEta', { km: remainingKm.toFixed(1), eta: ticksToMinutesLabel(remainingTicks, lang) })}</span>
            </div>
            <ProgressBar progress={order.legProgress} tone={order.status === 'PASSENGER_ONBOARD' ? 'amber' : 'cyan'} />
          </div>
        )}

        {!isIncidentReported && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenEmergency}
              data-testid="driver-report-emergency-btn"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-rose-500/40 bg-rose-500/15 py-2.5 text-xs font-bold text-rose-300 shadow-lg shadow-rose-950/50 transition hover:bg-rose-500/25 active:scale-[0.98]"
            >
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              {t('driver.emergency.reportSosBtn')}
            </button>
            {onOpenSwap && (
              <button
                type="button"
                onClick={onOpenSwap}
                data-testid="driver-request-swap-btn"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-purple-500/40 bg-purple-500/15 py-2.5 text-xs font-bold text-purple-300 shadow-lg shadow-purple-950/50 transition hover:bg-purple-500/25 active:scale-[0.98]"
              >
                <ArrowRight className="h-4 w-4 text-purple-400" />
                <span>{lang === 'zh' ? '轉單交接 (Swap)' : 'Swap Trip'}</span>
              </button>
            )}
          </div>
        )}

        {order.status === 'ARRIVED' && !isIncidentReported && (
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4" data-testid="driver-pin-entry">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('driver.enterPickupPin')}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <input
                value={pinInput}
                onChange={(e) => onPinChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                maxLength={4}
                data-testid="driver-pin-input"
                placeholder="••••"
                className={`w-full rounded-xl border bg-slate-900/90 px-3 py-3 text-center font-mono text-xl tracking-[0.6em] text-white outline-none ${
                  pinError ? 'border-red-400/60 ring-2 ring-red-400/30' : 'border-white/15 focus:border-cyan-400'
                }`}
              />
            </div>
            {pinError && <p className="mt-1.5 text-xs text-red-400 font-semibold">{t('driver.pinIncorrect')}</p>}

            {order.waitStartedAt && (
              <div className="mt-3 rounded-xl border border-white/5 bg-white/5 p-3" data-testid="driver-wait-timer">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-cyan-300" /> {t('driver.waitingSince', { min: waitMinutes })}
                  </span>
                  {isLate && <span className="font-bold text-amber-300">{t('pricing.cashToDriver', { amount: formatTWD(feePreview) })}</span>}
                </div>
                {isLate && !order.waitingFeeAgreed && (
                  <button onClick={onAgreeToWait} data-testid="driver-agree-to-wait" className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400/20 border border-amber-400/30 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/30">
                    <HandCoins className="h-4 w-4" /> {t('driver.agreeToWait')}
                  </button>
                )}
                {order.waitingFeeAgreed && <p className="mt-2 text-xs font-semibold text-emerald-300">✓ {t('driver.waitingFeeAgreed')}</p>}
                {isForfeitable && <p className="mt-2 flex items-center gap-1 text-xs text-red-400"><AlertTriangle className="h-3.5 w-3.5" /> {t('driver.waitingForfeitWarning', { min: WAITING_FEE_FORFEIT_MINUTES })}</p>}
                {!isLate && (
                  <button
                    onClick={onSimulateLatePassenger}
                    data-testid="driver-simulate-late-passenger"
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/5 py-2 text-[10.5px] font-semibold text-slate-400 hover:text-slate-200"
                    title="Demo: fast-forward this pickup past the 15-minute grace period"
                  >
                    <FlaskConical className="h-3.5 w-3.5 text-cyan-400" /> {t('driver.simulateLatePassengerDemo')}
                  </button>
                )}
              </div>
            )}

            <button
              onClick={onNoShow}
              data-testid="driver-report-no-show"
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/10"
            >
              <ShieldAlert className="h-4 w-4" /> {t('driver.reportNoShow')}
            </button>
          </div>
        )}

        {!isIncidentReported && (
          <ActionButton status={order.status} onStart={onStart} onVerifyPin={onVerifyPin} pinReady={pinInput.length === 4} />
        )}

        <OperatorSupportButton order={order} />
      </div>
    </motion.div>
  )
}

function OperatorSupportButton({ order }: { order: Order }) {
  const { t } = useLang()
  const createSupportTicket = useFleetStore((s) => s.createSupportTicket)
  const [requested, setRequested] = useState(false)

  if (requested) {
    return <p className="text-center text-xs font-bold text-cyan-300 py-1" data-testid="driver-operator-support-sent">{t('driver.operatorSupportSent')}</p>
  }
  return (
    <button
      onClick={() => {
        createSupportTicket(order.id, order.customer.name, t('driver.operatorSupportSubject', { orderNo: order.orderNo }), 'Driver Operations')
        setRequested(true)
      }}
      data-testid="driver-operator-support"
      className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200"
    >
      <Phone className="h-3.5 w-3.5" /> {t('driver.operatorSupport')}
    </button>
  )
}

function ActionButton({
  status,
  onStart,
  onVerifyPin,
  pinReady,
}: {
  status: string
  onStart: () => void
  onVerifyPin: () => void
  pinReady: boolean
}) {
  const { t } = useLang()
  if (status === 'ASSIGNED') {
    return (
      <Button fullWidth size="lg" onClick={onStart}>
        <Navigation className="h-4 w-4" /> {t('driver.startTrip')}
      </Button>
    )
  }
  if (status === 'ARRIVED') {
    return (
      <Button fullWidth size="lg" variant="success" onClick={onVerifyPin} disabled={!pinReady} data-testid="driver-verify-pin-button">
        <CheckCircle2 className="h-4 w-4" /> {t('driver.confirmPickup')}
      </Button>
    )
  }
  if (status === 'DRIVER_EN_ROUTE') {
    return (
      <Button fullWidth size="lg" variant="secondary" disabled>
        {t('driver.arriving')}
      </Button>
    )
  }
  if (status === 'PASSENGER_ONBOARD') {
    return (
      <Button fullWidth size="lg" variant="secondary" disabled>
        {t('driver.enRouteDest')}
      </Button>
    )
  }
  return null
}
