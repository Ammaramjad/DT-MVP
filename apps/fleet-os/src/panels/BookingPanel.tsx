import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Banknote,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  Mail,
  MapPinPlus,
  Mountain,
  Plane,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Timer,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useFleetStore, classifyOrderType } from '../store/useFleetStore'
import { LOCATIONS, getLocation } from '../data/locations'
import { lookupFlight, randomFlightNumber } from '../lib/flight'
import { estimateDurationMin, findCoupon, QUOTATION_TTL_MS } from '../lib/pricing'
import { buildRoutePath } from '../lib/geo'
import { getCachedRoute, resolveDynamicRoute } from '../lib/routing'
import { formatCountdownClock, formatTWD, nowPlusMinutesISO } from '../lib/format'
import type { BookingInput, BookingUrgency, Order, PassengerRequirements, PaymentMethodKey, RoutePath, TripWaypoint, VehicleCategory } from '../types'
import { VEHICLE_CATEGORY_CATALOG } from '../data/vehicleCatalog'
import {
  CHARTER_HOUR_OPTIONS,
  CHARTER_MIN_HOURS,
  FREE_CANCELLATION_WINDOW_HOURS,
  LAST_MINUTE_AUTO_CANCEL_REAL_MINUTES,
  LAST_MINUTE_MAX_LEAD_MS,
  LAST_MINUTE_MIN_LEAD_MS,
} from '../lib/serviceRules'
import { useVehicleOptions, VehicleOptionsGrid } from '../components/vehicles/VehicleOptionsGrid'
import { VehicleCompareDrawer } from '../components/vehicles/VehicleCompareDrawer'
import { FareBreakdownCard } from '../components/vehicles/FareBreakdownCard'
import { PanelHeader } from '../components/layout/PanelHeader'
import { OrderTypeBadge, FlightBadge } from '../components/ui/OrderBadges'
import { Stepper } from '../components/ui/Stepper'
import { BookingProgressSteps } from '../components/ui/BookingProgressSteps'
import { Button } from '../components/ui/Button'
import { RouteMapView } from '../components/map/RouteMapView'
import { CurrencySelector } from '../components/ui/CurrencySelector'
import { SEED_CORPORATE_ACCOUNTS } from '../data/corporateSeed'
import { Building2 } from 'lucide-react'
import { useLang } from '../i18n'

const CHANNELS: BookingInput['channel'][] = ['Website', 'LINE@', 'KKday', 'Booking.com', 'Klook', 'Phone / Agent']
const PAYMENT_METHODS: { key: PaymentMethodKey; labelKey: string; icon: typeof CreditCard }[] = [
  { key: 'card', labelKey: 'checkout.paymentCard', icon: CreditCard },
  { key: 'linepay', labelKey: 'checkout.paymentLinePay', icon: CreditCard },
  { key: 'applepay', labelKey: 'checkout.paymentApplePay', icon: CreditCard },
  { key: 'cash', labelKey: 'checkout.paymentCash', icon: Banknote },
]

// Route-state presets handed off from the Customer App's Home-tab quick-action
// shortcuts (see components/customer/HomeScreen.tsx) and the Marketplace's
// "Book now" buttons (see panels/MarketplacePanel.tsx) — lets tapping
// "Airport Pickup" etc. genuinely pre-fill the trip type instead of opening a
// blank form.
const PRESETS: Record<string, { pickupId: string; dropoffId: string; vehicleCategory?: VehicleCategory; charter?: boolean }> = {
  AIRPORT_PICKUP: { pickupId: 'tpe-airport', dropoffId: 'taipei-101' },
  AIRPORT_DROPOFF: { pickupId: 'taipei-101', dropoffId: 'tpe-airport' },
  TOUR_CHARTER: { pickupId: 'taipei-101', dropoffId: 'beitou', vehicleCategory: 'VAN_6' },
  HOURLY_CHARTER: { pickupId: 'taipei-101', dropoffId: 'ximending', vehicleCategory: 'VAN_6', charter: true },
}

export default function BookingPanel() {
  const createOrder = useFleetStore((s) => s.createOrder)
  const retryPayment = useFleetStore((s) => s.retryPayment)
  const liveOrders = useFleetStore((s) => s.orders)
  const navigate = useNavigate()
  const location = useLocation()
  const { t, lang } = useLang()

  const routerState = location.state as
    | { presetType?: string; presetPickupId?: string; presetDropoffId?: string; presetVehicleCategory?: VehicleCategory; presetChannel?: BookingInput['channel'] }
    | null
  const preset = routerState?.presetType
  const presetConfig = preset ? PRESETS[preset] : undefined

  // Client's 3-step flow (機場快綫 Airport Express: Step 1 Fare Estimate ->
  // Step 2 Payment Method -> Step 3 Booking Confirmation). Step 3 is
  // rendered as the existing post-submit confirmation card further below.
  const [step, setStep] = useState<1 | 2>(1)

  const [channel, setChannel] = useState<BookingInput['channel']>(routerState?.presetChannel ?? 'Website')
  const [pickupId, setPickupId] = useState(routerState?.presetPickupId ?? presetConfig?.pickupId ?? 'tpe-airport')
  const [dropoffId, setDropoffId] = useState(routerState?.presetDropoffId ?? presetConfig?.dropoffId ?? 'taipei-main-station')
  const [scheduledTime, setScheduledTime] = useState(() => nowPlusMinutesISO(90).slice(0, 16))
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategory>(routerState?.presetVehicleCategory ?? presetConfig?.vehicleCategory ?? 'ECONOMY_SEDAN')
  const [compareList, setCompareList] = useState<VehicleCategory[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [passengers, setPassengers] = useState(2)
  const [luggage, setLuggage] = useState(2)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [flightNumber, setFlightNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [flightLoading, setFlightLoading] = useState(false)
  const [flightChecked, setFlightChecked] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null)

  // Airport Express-style booking urgency tier: standard ("guaranteed
  // vehicle") vs. last-minute/same-day ("best-effort, NOT guaranteed" —
  // auto-cancelled free of charge if unmatched by the post-landing window).
  const [bookingUrgency, setBookingUrgency] = useState<BookingUrgency>('STANDARD')

  // Hourly Charter (計時包車) — a distinct booking category (Wanma Transfer):
  // billed by reserved hours rather than distance, no guiding/admission/
  // meals included, with a cash mountain-route surcharge when applicable.
  const [charterEnabled, setCharterEnabled] = useState(!!presetConfig?.charter)
  const [charterHours, setCharterHours] = useState<number>(CHARTER_MIN_HOURS)
  const [mountainRoute, setMountainRoute] = useState(false)

  // Informal multi-stop support (機場快綫's "completely free ... multi-stop
  // pickup/drop-off support" trust signal).
  const [waypoints, setWaypoints] = useState<TripWaypoint[]>([])
  const [waypointInput, setWaypointInput] = useState('')

  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponError, setCouponError] = useState(false)
  const [quotedAt, setQuotedAt] = useState(() => Date.now())
  const [quotationVersion, setQuotationVersion] = useState(1)
  const [now, setNow] = useState(() => Date.now())

  // Checkout depth items from the client brief: special assistance, consent,
  // payment-method selection, invoice type, and a demo-only "simulate a
  // declined card" toggle so the payment success/failure/retry loop can be
  // demonstrated end-to-end without a real payment gateway.
  const [childSeat, setChildSeat] = useState(false)
  const [wheelchair, setWheelchair] = useState(false)
  const [pet, setPet] = useState(false)
  const [specialAssistance, setSpecialAssistance] = useState('')
  const [consent, setConsent] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('card')
  const [invoiceType, setInvoiceType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL')
  const [isCorporateMode, setIsCorporateMode] = useState(false)
  const [selectedCorpId, setSelectedCorpId] = useState(SEED_CORPORATE_ACCOUNTS[0].id)
  const [selectedCostCenter, setSelectedCostCenter] = useState(SEED_CORPORATE_ACCOUNTS[0].costCenters[0])
  const [simulateDecline, setSimulateDecline] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [lineSent, setLineSent] = useState(false)
  const [calendarAdded, setCalendarAdded] = useState(false)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  // Any change to the trip's core parameters invalidates the current quote
  // (Phase 1 depth item: "quotation expiry/versioning").
  useEffect(() => {
    setQuotedAt(Date.now())
    setQuotationVersion((v) => v + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupId, dropoffId, vehicleCategory, charterEnabled, charterHours, mountainRoute])

  const pickup = getLocation(pickupId)
  const dropoff = getLocation(dropoffId)
  const orderType = classifyOrderType(pickupId, dropoffId, charterEnabled)
  const isAirportTrip = pickup.isAirport || dropoff.isAirport

  const syntheticPreview = useMemo(() => buildRoutePath(pickup, dropoff, `preview-${pickupId}-${dropoffId}`), [pickup, dropoff, pickupId, dropoffId])
  const [dynamicRoute, setDynamicRoute] = useState<RoutePath | null>(null)

  // Try to resolve a real, road-snapped OSRM route for this pickup/dropoff
  // pair live as the customer configures the trip, so the static preview map
  // (and the fare/duration estimate) reflect an actual road route whenever
  // the free routing service is reachable — falling back to the synthetic
  // curve immediately and silently if it isn't.
  useEffect(() => {
    setDynamicRoute(getCachedRoute(pickup, dropoff) ?? null)
    let cancelled = false
    resolveDynamicRoute(pickup, dropoff).then((route) => {
      if (!cancelled && route) setDynamicRoute(route)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupId, dropoffId])

  const routePreview = dynamicRoute ?? syntheticPreview
  const duration = useMemo(() => estimateDurationMin(routePreview.distanceKm), [routePreview.distanceKm])

  const flightPreview = useMemo(() => {
    if (!flightChecked || !flightNumber) return null
    return lookupFlight(flightNumber, new Date(scheduledTime).toISOString())
  }, [flightChecked, flightNumber, scheduledTime])

  const waitingMinutes = flightPreview?.status === 'DELAYED' && pickup.isAirport ? flightPreview.delayMinutes : 0

  const passengerRequirements: PassengerRequirements = useMemo(
    () => ({ childSeat, wheelchair, pet, specialAssistance }),
    [childSeat, wheelchair, pet, specialAssistance],
  )

  // Full simulated Dynamic Pricing Service preview — every category's live
  // fare (reflecting the current zone's weather/demand, availability, and
  // this trip's route/time/requirements) so the multi-vehicle-card grid
  // shows genuinely different, trustworthy prices rather than one fixed fare.
  const vehicleOptions = useVehicleOptions({
    passengers,
    luggage,
    requirements: passengerRequirements,
    distanceKm: routePreview.distanceKm,
    durationMin: duration,
    isAirport: isAirportTrip,
    pickupZone: pickup.region,
    scheduledTimeIso: new Date(scheduledTime).toISOString(),
    waitingMinutes,
    couponCode: appliedCoupon,
    charterHours: charterEnabled ? charterHours : null,
    mountainRoute: charterEnabled && mountainRoute,
  })
  const selectedOption = vehicleOptions.find((o) => o.category === vehicleCategory) ?? vehicleOptions[0]
  const fareBreakdown = selectedOption.fareBreakdown
  const vehicleType = VEHICLE_CATEGORY_CATALOG[vehicleCategory].underlyingType

  // If the currently-selected category becomes ineligible (e.g. the
  // passenger count grows past its capacity), automatically hop to the
  // brief's "recommended option" instead of silently booking a car that
  // can't carry the party.
  useEffect(() => {
    if (selectedOption.eligible) return
    const recommended = vehicleOptions.find((o) => o.badges.includes('RECOMMENDED')) ?? vehicleOptions.find((o) => o.eligible)
    if (recommended) setVehicleCategory(recommended.category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption.eligible])

  const quoteExpiresAt = quotedAt + QUOTATION_TTL_MS
  const quoteRemainingMs = quoteExpiresAt - now
  const quoteExpired = quoteRemainingMs <= 0

  const refreshQuote = () => {
    setQuotedAt(Date.now())
    setQuotationVersion((v) => v + 1)
  }

  const handleApplyCoupon = () => {
    const coupon = findCoupon(couponInput)
    if (!coupon) {
      setCouponError(true)
      setAppliedCoupon(null)
      return
    }
    setCouponError(false)
    setAppliedCoupon(coupon.code)
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError(false)
  }

  const handleAddWaypoint = () => {
    if (!waypointInput.trim()) return
    setWaypoints((prev) => [...prev, { id: `wp-${Date.now()}-${prev.length}`, label: waypointInput.trim() }])
    setWaypointInput('')
  }

  const handleRemoveWaypoint = (id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id))
  }

  // Airport Express's last-minute tier is only meant for 15-min-24hr-ahead
  // requests — surfaced as an advisory (not a hard block, to keep the demo
  // flexible) rather than silently accepting an out-of-window request.
  const leadTimeMs = new Date(scheduledTime).getTime() - now
  const lastMinuteOutOfWindow = bookingUrgency === 'LAST_MINUTE' && (leadTimeMs < LAST_MINUTE_MIN_LEAD_MS || leadTimeMs > LAST_MINUTE_MAX_LEAD_MS)

  // Wanma's 48-hour free-cancellation window, computed live off this trip's
  // actual scheduled time — shown as a real, functioning trust badge rather
  // than static marketing copy.
  const hoursUntilTrip = leadTimeMs / 3_600_000
  const withinFreeCancellationWindow = hoursUntilTrip >= FREE_CANCELLATION_WINDOW_HOURS

  const previewOrder: Order = useMemo(
    () => ({
      id: 'preview',
      orderNo: 'PREVIEW',
      channel,
      type: orderType,
      status: 'DRAFT',
      createdAt: Date.now(),
      scheduledTime,
      customer: { name, phone, email },
      pickup,
      dropoff,
      vehicleType,
      vehicleCategory,
      passengerRequirements,
      passengers,
      luggage,
      notes,
      flightNumber: flightNumber || null,
      flightInfo: flightPreview,
      driverId: null,
      vehicleId: null,
      suggestedDriverId: null,
      priceEstimate: fareBreakdown.total,
      fareBreakdown,
      distanceKm: routePreview.distanceKm,
      durationMin: duration,
      routeToPickup: null,
      routeToDropoff: routePreview,
      legProgress: 0,
      currentPos: null,
      pickedUpAt: null,
      pendingDriverId: null,
      dispatchAttempts: [],
      escalationStage: 0,
      unresponsiveDriverIds: [],
      demoForceNoResponse: false,
      quotationVersion,
      quotedAt,
      statusHistory: [],
      auditLog: [],
      paymentStatus: 'UNPAID',
      supplierStatus: 'NOT_APPLICABLE',
      voucherStatus: 'NOT_ISSUED',
      pickupPin: '0000',
      cancellationReason: null,
      refundAmount: null,
      supportTicketId: null,
      driverRatingByCustomer: null,
      customerRatingByDriver: null,
      tollParkingEvidenceUploaded: false,
      noShowReported: false,
      waitStartedAt: null,
      pickupInstructions: null,
      invoiceRequested: false,
      invoiceIssued: false,
      bookingUrgency,
      flightLandedAt: null,
      driverInfoRevealOverride: false,
      paymentMethod,
      lateFeeAmount: null,
      lateFeeWaitMinutes: null,
      waitingFeeAgreed: false,
      waypoints,
      translationStatus: 'NOT_NEEDED',
      sourceLanguage: null,
      originalNoteText: null,
    }),
    [
      channel,
      orderType,
      scheduledTime,
      name,
      phone,
      email,
      pickup,
      dropoff,
      vehicleType,
      vehicleCategory,
      passengerRequirements,
      passengers,
      luggage,
      notes,
      flightNumber,
      flightPreview,
      fareBreakdown,
      routePreview,
      duration,
      quotationVersion,
      quotedAt,
      bookingUrgency,
      paymentMethod,
      waypoints,
    ],
  )

  const canProceedStep1 = pickupId !== dropoffId && !quoteExpired && selectedOption.eligible && (!charterEnabled || charterHours >= CHARTER_MIN_HOURS)
  const canSubmit = canProceedStep1 && name.trim().length > 1 && phone.trim().length > 3 && consent

  const liveCreatedOrder = createdOrder ? liveOrders.find((o) => o.id === createdOrder.id) ?? createdOrder : null
  const displayStep: 1 | 2 | 3 = liveCreatedOrder ? 3 : step

  const handleLookupFlight = () => {
    if (!flightNumber) return
    setFlightLoading(true)
    setFlightChecked(false)
    window.setTimeout(() => {
      setFlightLoading(false)
      setFlightChecked(true)
    }, 900)
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    const tags = [
      childSeat ? t('checkout.tagChildSeat') : null,
      wheelchair ? t('checkout.tagWheelchair') : null,
      pet ? t('checkout.tagPet') : null,
      specialAssistance.trim() ? `${t('checkout.tagAssistance')}: ${specialAssistance.trim()}` : null,
    ].filter(Boolean)
    const combinedNotes = [notes, ...tags].filter(Boolean).join(' · ')

    const order = createOrder({
      channel,
      pickupId,
      dropoffId,
      scheduledTime: new Date(scheduledTime).toISOString(),
      vehicleType,
      vehicleCategory,
      passengers,
      luggage,
      customer: { name, phone, email },
      flightNumber,
      notes: combinedNotes,
      couponCode: appliedCoupon,
      quotationVersion,
      passengerRequirements,
      invoiceRequested: invoiceType === 'COMPANY',
      simulateFailure: simulateDecline,
      bookingUrgency,
      paymentMethod,
      waypoints,
      charterHours: charterEnabled ? charterHours : null,
      mountainRoute: charterEnabled && mountainRoute,
    })
    setCreatedOrder(order)
    setEmailSent(false)
    setLineSent(false)
    setCalendarAdded(false)
  }

  const handlePrintVoucher = () => {
    window.print()
  }

  // Once payment succeeds (initial confirm or after a retry), simulate the
  // async email/LINE booking-confirmation notifications firing shortly after.
  useEffect(() => {
    if (!liveCreatedOrder || liveCreatedOrder.status === 'FAILED' || liveCreatedOrder.status === 'PENDING_PAYMENT') return
    setEmailSent(false)
    setLineSent(false)
    const t1 = window.setTimeout(() => setEmailSent(true), 600)
    const t2 = window.setTimeout(() => setLineSent(true), 1100)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCreatedOrder?.id, liveCreatedOrder?.status])

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white pb-32 text-slate-900">
      <PanelHeader
        title={t('booking.title')}
        subtitle={t('booking.subtitle')}
        icon={<ClipboardList className="h-5 w-5" />}
        light
        right={<CurrencySelector testId="booking-currency-selector" />}
      />

      <BookingProgressSteps step={displayStep} labels={[t('booking.step1Label'), t('booking.step2Label'), t('booking.step3Label')]} />

      <div className="mx-auto mt-2 grid max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-7">
          {step === 1 && (
            <>
              {/* Booking urgency tier — 機場快綫 Airport Express's "保證有車"
                  guaranteed booking vs. "24小時內臨時預約" best-effort/NOT
                  guaranteed last-minute request. */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('booking.urgencyLabel')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingUrgency('STANDARD')}
                    data-testid="booking-urgency-standard"
                    className={`flex flex-col items-start gap-1 rounded-xl p-3 text-left ring-1 transition ${
                      bookingUrgency === 'STANDARD' ? 'bg-emerald-50 ring-emerald-300' : 'bg-slate-50 ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" /> {t('booking.urgencyStandard')}
                    </span>
                    <span className="text-[10.5px] text-slate-500">{t('booking.urgencyStandardDesc')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingUrgency('LAST_MINUTE')}
                    data-testid="booking-urgency-last-minute"
                    className={`flex flex-col items-start gap-1 rounded-xl p-3 text-left ring-1 transition ${
                      bookingUrgency === 'LAST_MINUTE' ? 'bg-amber-50 ring-amber-300' : 'bg-slate-50 ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                      <Zap className="h-3.5 w-3.5" /> {t('booking.urgencyLastMinute')}
                    </span>
                    <span className="text-[10.5px] text-slate-500">{t('booking.urgencyLastMinuteDesc')}</span>
                  </button>
                </div>
                <AnimatePresence>
                  {bookingUrgency === 'LAST_MINUTE' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 overflow-hidden rounded-lg bg-amber-50 p-2.5 text-[10.5px] text-amber-700 ring-1 ring-amber-100"
                      data-testid="booking-urgency-not-guaranteed-notice"
                    >
                      <AlertTriangle className="mr-1 inline h-3 w-3" />
                      {t('booking.urgencyAutoCancelNotice', { min: LAST_MINUTE_AUTO_CANCEL_REAL_MINUTES })}
                      {lastMinuteOutOfWindow && (
                        <span className="mt-1 block font-semibold text-amber-800" data-testid="booking-urgency-out-of-window">
                          {t('booking.urgencyOutOfWindow')}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('booking.channel')}</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as BookingInput['channel'])}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('booking.scheduledTime')}</label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('booking.pickup')}</label>
                  <select
                    value={pickupId}
                    onChange={(e) => setPickupId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {LOCATIONS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.isAirport ? '✈ ' : ''}
                        {lang === 'zh' ? l.nameZh : l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('booking.dropoff')}</label>
                  <select
                    value={dropoffId}
                    onChange={(e) => setDropoffId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {LOCATIONS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.isAirport ? '✈ ' : ''}
                        {lang === 'zh' ? l.nameZh : l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Informal multi-stop support — 機場快綫's "multi-stop pickup/
                  drop-off support" trust signal, made into a real UI state. */}
              <div className="mt-3 rounded-xl bg-slate-50 p-3" data-testid="booking-waypoints-section">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <MapPinPlus className="h-3.5 w-3.5" /> {t('booking.waypointsLabel')}
                </label>
                <div className="flex gap-2">
                  <input
                    value={waypointInput}
                    onChange={(e) => setWaypointInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddWaypoint()
                      }
                    }}
                    placeholder={t('booking.waypointPlaceholder')}
                    data-testid="booking-waypoint-input"
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddWaypoint}
                    disabled={!waypointInput.trim()}
                    data-testid="booking-waypoint-add"
                    className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {t('booking.waypointAdd')}
                  </button>
                </div>
                {waypoints.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5" data-testid="booking-waypoint-list">
                    {waypoints.map((w) => (
                      <span key={w.id} className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                        {w.label}
                        <button type="button" onClick={() => handleRemoveWaypoint(w.id)} data-testid="booking-waypoint-remove" aria-label="Remove stop">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-1.5 text-[10px] text-slate-400">{t('booking.waypointsHint')}</p>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-500">{t('booking.detectedType')}</span>
                <OrderTypeBadge type={orderType} />
                {pickupId === dropoffId && <span className="text-xs text-red-500">{t('booking.pickupDropoffSame')}</span>}
              </div>

              {/* Hourly Charter (計時包車) — Wanma Transfer's distinct product
                  type: billed by reserved hours, no guiding/admission/meals,
                  with a mountain-route surcharge (cash to driver). */}
              <div className="mt-4 rounded-xl bg-slate-50 p-3.5" data-testid="booking-charter-section">
                <label className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5" /> {t('booking.charterToggleLabel')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCharterEnabled((v) => !v)}
                    data-testid="booking-charter-toggle"
                    className={`relative h-5 w-9 rounded-full transition ${charterEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${charterEnabled ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </label>
                <AnimatePresence>
                  {charterEnabled && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-medium text-slate-500">{t('booking.charterHoursLabel')}</label>
                        <select
                          value={charterHours}
                          onChange={(e) => setCharterHours(Number(e.target.value))}
                          data-testid="booking-charter-hours-select"
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                        >
                          {CHARTER_HOUR_OPTIONS.map((h) => (
                            <option key={h} value={h}>
                              {t('booking.charterHoursOption', { n: h })}
                            </option>
                          ))}
                        </select>
                        <label className="ml-2 flex items-center gap-1.5 text-[11px] text-slate-600">
                          <input
                            type="checkbox"
                            checked={mountainRoute}
                            onChange={(e) => setMountainRoute(e.target.checked)}
                            data-testid="booking-charter-mountain-route"
                            className="h-3.5 w-3.5 accent-orange-500"
                          />
                          <Mountain className="h-3.5 w-3.5 text-orange-500" /> {t('booking.charterMountainRoute')}
                        </label>
                      </div>
                      <p className="mt-2 text-[10.5px] text-slate-500">{t('booking.charterExclusions')}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                {isAirportTrip && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100"
                  >
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('booking.flightNumber')}</label>
                    <div className="flex gap-2">
                      <input
                        value={flightNumber}
                        onChange={(e) => {
                          setFlightNumber(e.target.value.toUpperCase())
                          setFlightChecked(false)
                        }}
                        placeholder={t('booking.flightPlaceholder')}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => setFlightNumber(randomFlightNumber())}
                        className="rounded-xl bg-white px-3 py-2.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                      >
                        {t('booking.random')}
                      </button>
                      <Button type="button" size="sm" onClick={handleLookupFlight} disabled={!flightNumber || flightLoading}>
                        {flightLoading ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                          <Search className="h-3.5 w-3.5" />
                        )}
                        {t('booking.lookup')}
                      </Button>
                    </div>
                    <AnimatePresence>
                      {flightPreview && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 flex items-center justify-between rounded-lg bg-white p-3 ring-1 ring-blue-100"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <Plane className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="font-semibold text-slate-800">
                                {flightPreview.flightNumber} · {flightPreview.airline}
                              </p>
                              <p className="text-xs text-slate-500">
                                {t('booking.gate', { gate: flightPreview.gate })} ·{' '}
                                {flightPreview.delayMinutes > 0 ? t('booking.delayMin', { min: flightPreview.delayMinutes }) : t('booking.onSchedule')}
                              </p>
                            </div>
                          </div>
                          <FlightBadge status={flightPreview.status} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stepper label={t('booking.passengers')} value={passengers} min={1} max={20} onChange={setPassengers} light testId="booking-passengers-stepper" />
                <Stepper label={t('booking.luggage')} value={luggage} min={0} max={20} onChange={setLuggage} light testId="booking-luggage-stepper" />
              </div>

              {/* Special assistance — client brief: child seat, wheelchair, pet, special assistance */}
              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-slate-600">{t('checkout.specialRequirements')}</label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={childSeat} onChange={(e) => setChildSeat(e.target.checked)} data-testid="checkout-child-seat" className="h-4 w-4 accent-blue-500" />
                    {t('checkout.childSeat')}
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={wheelchair} onChange={(e) => setWheelchair(e.target.checked)} data-testid="checkout-wheelchair" className="h-4 w-4 accent-blue-500" />
                    {t('checkout.wheelchair')}
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={pet} onChange={(e) => setPet(e.target.checked)} data-testid="checkout-pet" className="h-4 w-4 accent-blue-500" />
                    {t('checkout.pet')}
                  </label>
                </div>
                <input
                  value={specialAssistance}
                  onChange={(e) => setSpecialAssistance(e.target.value)}
                  placeholder={t('checkout.assistancePlaceholder')}
                  data-testid="checkout-assistance-input"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Client brief: multi-vehicle-category recommendation grid, not one
                  fixed vehicle — ineligible categories are visually disabled with
                  an explanation, and up to 3 can be added to a comparison drawer. */}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-600">{t('booking.vehicleCategory')}</label>
                  {compareList.length > 0 && (
                    <button type="button" onClick={() => setShowCompare(true)} data-testid="vehicle-compare-open" className="text-xs font-semibold text-blue-600 hover:underline">
                      {t('vehicle.compareOpen', { n: compareList.length })}
                    </button>
                  )}
                </div>
                <VehicleOptionsGrid
                  options={vehicleOptions}
                  selectedCategory={vehicleCategory}
                  onSelect={setVehicleCategory}
                  compareList={compareList}
                  onToggleCompare={(cat) =>
                    setCompareList((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : prev.length >= 3 ? prev : [...prev, cat]))
                  }
                />
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('booking.couponCode')}</label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <Tag className="h-4 w-4" />
                      <span className="font-semibold">{appliedCoupon}</span>
                      <span className="text-emerald-600/80">{lang === 'zh' ? findCoupon(appliedCoupon)?.descriptionZh : findCoupon(appliedCoupon)?.description}</span>
                    </div>
                    <button type="button" onClick={handleRemoveCoupon} className="text-xs font-medium text-emerald-700 hover:underline">
                      {t('booking.couponRemove')}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase())
                        setCouponError(false)
                      }}
                      placeholder={t('booking.couponPlaceholder')}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <Button type="button" size="sm" variant="secondary" onClick={handleApplyCoupon} disabled={!couponInput}>
                      {t('booking.couponApply')}
                    </Button>
                  </div>
                )}
                {couponError && <p className="mt-1.5 text-xs text-red-500">{t('booking.couponInvalid')}</p>}
              </div>

              {/* Trust/policy badges — 機場快綫's "completely free cancellation,
                  multi-stop support, licensed & insured vehicles, 24h support"
                  — computed live off this trip's own parameters rather than
                  static marketing copy. */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="booking-trust-badges">
                <TrustBadge
                  icon={ShieldCheck}
                  label={withinFreeCancellationWindow ? t('booking.trustFreeCancellation', { h: FREE_CANCELLATION_WINDOW_HOURS }) : t('booking.trustCancellationWindowClosing')}
                  tone={withinFreeCancellationWindow ? 'emerald' : 'amber'}
                  testId="booking-trust-cancellation"
                />
                <TrustBadge icon={MapPinPlus} label={t('booking.trustMultiStop')} tone="blue" testId="booking-trust-multistop" />
                <TrustBadge icon={ShieldCheck} label={t('booking.trustInsured')} tone="blue" testId="booking-trust-insured" />
                <TrustBadge icon={Clock3} label={t('booking.trustSupport')} tone="blue" testId="booking-trust-support" />
              </div>

              <Button size="lg" fullWidth className="mt-5" disabled={!canProceedStep1} onClick={() => setStep(2)} data-testid="booking-step1-continue">
                {t('booking.continueToPayment')} · {formatTWD(fareBreakdown.total)}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <button type="button" onClick={() => setStep(1)} data-testid="booking-step2-back" className="mb-3 text-xs font-medium text-slate-500 hover:text-slate-700">
                ← {t('booking.backToFareEstimate')}
              </button>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('booking.fullName')}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('booking.phone')}</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+886 912-345-678"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('booking.email')}</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Payment method — 機場快綫's "pay online by card, or cash on
                  arrival/drop-off" plus a free-text notes field. */}
              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-slate-600">{t('checkout.paymentMethod')}</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.key}
                      type="button"
                      onClick={() => setPaymentMethod(pm.key)}
                      data-testid={`checkout-payment-${pm.key}`}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold ring-1 transition ${
                        paymentMethod === pm.key ? 'bg-blue-500 text-white ring-blue-500' : 'bg-slate-50 text-slate-600 ring-slate-200'
                      }`}
                    >
                      <pm.icon className="h-3.5 w-3.5" /> {t(pm.labelKey)}
                    </button>
                  ))}
                </div>
                {paymentMethod === 'cash' && (
                  <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-700 ring-1 ring-amber-100" data-testid="checkout-cash-notice">
                    {t('checkout.cashNotice')}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('booking.notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder={t('booking.notesPlaceholder')}
                  data-testid="checkout-notes-input"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-slate-600">{t('checkout.invoiceType')}</label>
                <div className="flex gap-2">
                  {(['PERSONAL', 'COMPANY'] as const).map((it) => (
                    <button
                      key={it}
                      type="button"
                      onClick={() => setInvoiceType(it)}
                      data-testid={`checkout-invoice-${it.toLowerCase()}`}
                      className={`flex-1 rounded-xl py-2 text-xs font-semibold ring-1 transition ${
                        invoiceType === it ? 'bg-slate-800 text-white ring-slate-800' : 'bg-slate-50 text-slate-600 ring-slate-200'
                      }`}
                    >
                      {t(`checkout.invoice.${it}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Corporate B2B Travel Mode Toggle */}
              <div className="mt-4 rounded-2xl border border-purple-200 bg-purple-50/50 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-xs font-bold text-purple-900">{lang === 'zh' ? '切換為企業差旅模式 (Corporate Profile)' : 'Switch to Corporate Travel Profile'}</p>
                      <p className="text-[11px] text-purple-600">{lang === 'zh' ? '自動帶入企業統編月結與成本中心帳單' : 'Direct corporate billing & cost center assignment'}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isCorporateMode}
                    onChange={(e) => {
                      setIsCorporateMode(e.target.checked)
                      if (e.target.checked) {
                        setInvoiceType('COMPANY')
                      }
                    }}
                    data-testid="corporate-mode-toggle"
                    className="h-4 w-4 accent-purple-600"
                  />
                </div>

                {isCorporateMode && (
                  <div className="mt-3 space-y-2 border-t border-purple-200/60 pt-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-purple-800 mb-1">{lang === 'zh' ? '選擇簽約企業帳戶' : 'Select Corporate Client'}</label>
                      <select
                        value={selectedCorpId}
                        onChange={(e) => {
                          setSelectedCorpId(e.target.value)
                          const acc = SEED_CORPORATE_ACCOUNTS.find((a) => a.id === e.target.value)
                          if (acc) setSelectedCostCenter(acc.costCenters[0])
                        }}
                        data-testid="corporate-account-select"
                        className="w-full rounded-xl border border-purple-300 bg-white px-2.5 py-1.5 text-xs text-purple-900 outline-none"
                      >
                        {SEED_CORPORATE_ACCOUNTS.map((a) => (
                          <option key={a.id} value={a.id}>
                            {lang === 'zh' ? a.nameZh : a.name} (UBN: {a.ubn})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-purple-800 mb-1">{lang === 'zh' ? '歸屬成本中心代碼 (Cost Center)' : 'Cost Center Tag'}</label>
                      <select
                        value={selectedCostCenter}
                        onChange={(e) => setSelectedCostCenter(e.target.value)}
                        data-testid="corporate-costcenter-select"
                        className="w-full rounded-xl border border-purple-300 bg-white px-2.5 py-1.5 text-xs text-purple-900 outline-none"
                      >
                        {(SEED_CORPORATE_ACCOUNTS.find((a) => a.id === selectedCorpId)?.costCenters || []).map((cc) => (
                          <option key={cc} value={cc}>
                            {cc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <label className="mt-4 flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  data-testid="checkout-consent"
                  className="mt-0.5 h-4 w-4 accent-blue-500"
                />
                <span>{t('checkout.consentText')}</span>
              </label>

              <label className="mt-2 flex items-center gap-2.5 rounded-xl bg-amber-50 p-3 text-[11px] text-amber-700 ring-1 ring-amber-100">
                <input
                  type="checkbox"
                  checked={simulateDecline}
                  onChange={(e) => setSimulateDecline(e.target.checked)}
                  data-testid="checkout-simulate-decline"
                  className="h-3.5 w-3.5 accent-amber-500"
                />
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> {t('checkout.simulateDecline')}
                </span>
              </label>

              <Button size="lg" fullWidth className="mt-4" disabled={!canSubmit} onClick={handleSubmit} data-testid="checkout-confirm-booking">
                <Users className="h-4 w-4" /> {t('booking.confirmBooking')} · {formatTWD(fareBreakdown.total)}
              </Button>
              {!consent && <p className="mt-1.5 text-center text-[11px] text-slate-400">{t('checkout.consentRequired')}</p>}
            </>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-slate-900 shadow-xl" data-testid="vehicle-preview-panel">
            {/* Soft radial glow in the selected category's brand color, behind its actual catalog photo — this
                replaces the old generic static 3D placeholder and updates live with `vehicleCategory`. */}
            <div
              className="absolute inset-0 transition-colors duration-500"
              style={{
                background: `radial-gradient(circle at 50% 45%, ${VEHICLE_CATEGORY_CATALOG[vehicleCategory].colorHex}55, transparent 70%)`,
              }}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={vehicleCategory}
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -8 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="relative flex h-full w-full items-center justify-center p-4"
              >
                <img
                  src={VEHICLE_CATEGORY_CATALOG[vehicleCategory].photo}
                  alt={`${VEHICLE_CATEGORY_CATALOG[vehicleCategory].brand} ${VEHICLE_CATEGORY_CATALOG[vehicleCategory].model}`}
                  data-testid="vehicle-preview-photo"
                  className="max-h-full max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)]"
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
              <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                {VEHICLE_CATEGORY_CATALOG[vehicleCategory].brand} {VEHICLE_CATEGORY_CATALOG[vehicleCategory].model}
              </span>
              <span className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                {t(`vehicle.category.${vehicleCategory}`)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('booking.tripEstimate')}</p>
              <span className="text-[10px] font-medium text-slate-400">{t('booking.quoteVersion', { version: quotationVersion })}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{formatTWD(fareBreakdown.total)}</span>
              <span className="text-xs text-slate-400">{t('booking.estimatedFare')}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[11px] text-slate-400">{t('booking.distance')}</p>
                <p className="font-semibold text-slate-800">{routePreview.distanceKm.toFixed(1)} km</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[11px] text-slate-400">{t('booking.duration')}</p>
                <p className="font-semibold text-slate-800">{duration} min</p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('booking.fareBreakdown')}</p>
              <FareBreakdownCard fareBreakdown={fareBreakdown} distanceKm={routePreview.distanceKm} durationMin={duration} />
            </div>

            <div className={`mt-3 rounded-lg p-2.5 text-center text-xs font-medium ${quoteExpired ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
              {quoteExpired ? (
                <div className="flex flex-col items-center gap-1.5">
                  <span>{t('booking.quoteExpired')}</span>
                  <Button type="button" size="sm" variant="secondary" onClick={refreshQuote}>
                    {t('booking.quoteRefresh')}
                  </Button>
                </div>
              ) : (
                <span data-testid="quote-countdown">{t('booking.quoteExpires', { time: formatCountdownClock(quoteRemainingMs) })}</span>
              )}
            </div>
          </div>

          <div className="h-56 overflow-hidden rounded-2xl shadow-xl">
            <RouteMapView order={previewOrder} />
          </div>
        </div>
      </div>

      {showCompare && compareList.length > 0 && (
        <VehicleCompareDrawer
          options={vehicleOptions}
          categories={compareList}
          onRemove={(cat) => setCompareList((prev) => prev.filter((c) => c !== cat))}
          onClose={() => setShowCompare(false)}
          onSelect={(cat) => {
            setVehicleCategory(cat)
            setShowCompare(false)
          }}
        />
      )}

      <AnimatePresence>
        {liveCreatedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 text-center shadow-2xl print:max-h-none print:overflow-visible print:shadow-none"
              data-testid="checkout-result-modal"
            >
              {liveCreatedOrder.status === 'FAILED' ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-500"
                  >
                    <XCircle className="h-8 w-8" />
                  </motion.div>
                  <h2 className="mt-4 text-lg font-bold text-slate-900" data-testid="checkout-payment-failed">
                    {t('checkout.paymentFailedTitle')}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{t('checkout.paymentFailedDesc')}</p>
                  <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-500">{t('checkout.paymentFailedReason')}</div>
                  <div className="mt-5 flex flex-col gap-2">
                    <Button fullWidth onClick={() => retryPayment(liveCreatedOrder.id)} data-testid="checkout-retry-payment">
                      <RefreshCw className="h-4 w-4" /> {t('checkout.retryPayment')}
                    </Button>
                    <Button fullWidth variant="ghost" onClick={() => setCreatedOrder(null)}>
                      <X className="h-3.5 w-3.5" /> {t('booking.bookAnother')}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-500 print:hidden"
                  >
                    <CheckCircle2 className="h-8 w-8" />
                  </motion.div>
                  <h2 className="mt-4 text-lg font-bold text-slate-900" data-testid="checkout-booking-confirmed">{t('booking.createdTitle', { orderNo: liveCreatedOrder.orderNo })}</h2>
                  <p className="mt-1 text-sm text-slate-500 print:hidden">{t('booking.createdDesc')}</p>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 print:hidden">
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${emailSent ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`} data-testid="checkout-email-status">
                      <Mail className="h-3 w-3" /> {emailSent ? t('checkout.emailSent') : t('checkout.emailSending')}
                    </span>
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${lineSent ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`} data-testid="checkout-line-status">
                      <ClipboardList className="h-3 w-3" /> {lineSent ? t('checkout.lineSent') : t('checkout.lineSending')}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('booking.voucherTitle')}</p>
                    <div className="mx-auto mt-3 flex h-32 w-32 items-center justify-center rounded-lg bg-white p-2 shadow-sm">
                      <QRCodeSVG
                        value={JSON.stringify({ orderNo: liveCreatedOrder.orderNo, pickup: liveCreatedOrder.pickup.name, dropoff: liveCreatedOrder.dropoff.name, scheduledTime: liveCreatedOrder.scheduledTime })}
                        size={112}
                      />
                    </div>
                    <p className="mt-2 font-mono text-sm font-bold text-slate-800">{liveCreatedOrder.orderNo}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{t('booking.voucherHint')}</p>
                  </div>

                  <div className="mt-4 space-y-1 rounded-xl border border-dashed border-slate-200 p-4 text-left text-xs text-slate-600">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('trip.sheetTitle')}</p>
                    <div className="flex justify-between">
                      <span>{t('trip.pickup')}</span>
                      <span className="font-medium text-slate-800">{lang === 'zh' ? liveCreatedOrder.pickup.nameZh : liveCreatedOrder.pickup.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('trip.dropoff')}</span>
                      <span className="font-medium text-slate-800">{lang === 'zh' ? liveCreatedOrder.dropoff.nameZh : liveCreatedOrder.dropoff.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('trip.total')}</span>
                      <span className="font-semibold text-slate-900">{formatTWD(liveCreatedOrder.fareBreakdown.total)}</span>
                    </div>
                    {liveCreatedOrder.paymentMethod === 'cash' && (
                      <div className="flex justify-between text-amber-600">
                        <span>{t('checkout.paymentMethod')}</span>
                        <span className="font-medium">{t('checkout.paymentCash')}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col gap-2 print:hidden">
                    <Button
                      fullWidth
                      variant="secondary"
                      onClick={() => setCalendarAdded(true)}
                      data-testid="checkout-add-calendar"
                      disabled={calendarAdded}
                    >
                      <CalendarPlus className="h-4 w-4" /> {calendarAdded ? t('checkout.calendarAdded') : t('checkout.addToCalendar')}
                    </Button>
                    <Button fullWidth variant="secondary" onClick={handlePrintVoucher}>
                      <Printer className="h-4 w-4" /> {t('booking.printVoucher')}
                    </Button>
                    <Button fullWidth onClick={() => navigate('/fleet-os')}>
                      {t('booking.viewControl')}
                    </Button>
                    <Button fullWidth variant="secondary" onClick={() => navigate('/customer')}>
                      {t('booking.trackRide')}
                    </Button>
                    <Button
                      fullWidth
                      variant="ghost"
                      onClick={() => {
                        setCreatedOrder(null)
                        setStep(1)
                        setName('')
                        setPhone('')
                        setEmail('')
                        setNotes('')
                        setFlightChecked(false)
                        setFlightNumber('')
                        setAppliedCoupon(null)
                        setCouponInput('')
                        setChildSeat(false)
                        setWheelchair(false)
                        setPet(false)
                        setSpecialAssistance('')
                        setConsent(false)
                        setSimulateDecline(false)
                        setWaypoints([])
                        setBookingUrgency('STANDARD')
                        refreshQuote()
                      }}
                    >
                      <X className="h-3.5 w-3.5" /> {t('booking.bookAnother')}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TrustBadge({
  icon: Icon,
  label,
  tone,
  testId,
}: {
  icon: typeof ShieldCheck
  label: string
  tone: 'emerald' | 'amber' | 'blue'
  testId: string
}) {
  const toneClass = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : tone === 'amber' ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-blue-50 text-blue-700 ring-blue-100'
  return (
    <div className={`flex flex-col items-start gap-1 rounded-xl p-2.5 text-[10.5px] font-medium ring-1 ${toneClass}`} data-testid={testId}>
      <Icon className="h-3.5 w-3.5" />
      <span className="leading-tight">{label}</span>
    </div>
  )
}
