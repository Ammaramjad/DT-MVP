import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ClipboardList, Plane, Search, Users } from 'lucide-react'
import { useFleetStore, classifyOrderType } from '../store/useFleetStore'
import { LOCATIONS, getLocation } from '../data/locations'
import { lookupFlight, randomFlightNumber } from '../lib/flight'
import { estimateFare, estimateDurationMin } from '../lib/pricing'
import { buildRoutePath } from '../lib/geo'
import { formatTWD, nowPlusMinutesISO } from '../lib/format'
import type { BookingInput, Order, VehicleType } from '../types'
import { PanelHeader } from '../components/layout/PanelHeader'
import { OrderTypeBadge, FlightBadge } from '../components/ui/OrderBadges'
import { Stepper } from '../components/ui/Stepper'
import { Button } from '../components/ui/Button'
import { VehicleSpinner } from '../components/three/VehicleSpinner'
import { RouteMapView } from '../components/map/RouteMapView'

const VEHICLE_OPTIONS: { type: VehicleType; label: string; zh: string; capacity: string; color: string }[] = [
  { type: 'SEDAN', label: 'Sedan', zh: '轎車', capacity: '1-3 pax', color: '#22d3ee' },
  { type: 'SUV', label: 'SUV', zh: '休旅車', capacity: '1-5 pax', color: '#a855f7' },
  { type: 'VAN', label: 'Van', zh: '廂型車', capacity: '1-7 pax', color: '#fbbf24' },
  { type: 'LUXURY', label: 'Luxury', zh: '豪華車', capacity: '1-3 pax', color: '#f472b6' },
  { type: 'MINIBUS', label: 'Minibus', zh: '小巴', capacity: '1-12 pax', color: '#a3e635' },
]

const CHANNELS: BookingInput['channel'][] = ['Website', 'LINE@', 'KKday', 'Booking.com', 'Klook', 'Phone / Agent']

export default function BookingPanel() {
  const createOrder = useFleetStore((s) => s.createOrder)
  const navigate = useNavigate()

  const [channel, setChannel] = useState<BookingInput['channel']>('Website')
  const [pickupId, setPickupId] = useState('tpe-airport')
  const [dropoffId, setDropoffId] = useState('taipei-main-station')
  const [scheduledTime, setScheduledTime] = useState(() => nowPlusMinutesISO(90).slice(0, 16))
  const [vehicleType, setVehicleType] = useState<VehicleType>('SEDAN')
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

  const pickup = getLocation(pickupId)
  const dropoff = getLocation(dropoffId)
  const orderType = classifyOrderType(pickupId, dropoffId)
  const isAirportTrip = pickup.isAirport || dropoff.isAirport

  const routePreview = useMemo(() => buildRoutePath(pickup, dropoff, `preview-${pickupId}-${dropoffId}`), [pickup, dropoff, pickupId, dropoffId])
  const fare = useMemo(
    () => estimateFare(routePreview.distanceKm, vehicleType, isAirportTrip),
    [routePreview.distanceKm, vehicleType, isAirportTrip],
  )
  const duration = useMemo(() => estimateDurationMin(routePreview.distanceKm), [routePreview.distanceKm])

  const flightPreview = useMemo(() => {
    if (!flightChecked || !flightNumber) return null
    return lookupFlight(flightNumber, new Date(scheduledTime).toISOString())
  }, [flightChecked, flightNumber, scheduledTime])

  const selectedVehicle = VEHICLE_OPTIONS.find((v) => v.type === vehicleType)!

  const previewOrder: Order = useMemo(
    () => ({
      id: 'preview',
      orderNo: 'PREVIEW',
      channel,
      type: orderType,
      status: 'NEW',
      createdAt: Date.now(),
      scheduledTime,
      customer: { name, phone, email },
      pickup,
      dropoff,
      vehicleType,
      passengers,
      luggage,
      notes,
      flightNumber: flightNumber || null,
      flightInfo: flightPreview,
      driverId: null,
      vehicleId: null,
      suggestedDriverId: null,
      priceEstimate: fare,
      distanceKm: routePreview.distanceKm,
      durationMin: duration,
      routeToPickup: null,
      routeToDropoff: routePreview,
      legProgress: 0,
      currentPos: null,
      pickedUpAt: null,
    }),
    [channel, orderType, scheduledTime, name, phone, email, pickup, dropoff, vehicleType, passengers, luggage, notes, flightNumber, flightPreview, fare, routePreview, duration],
  )

  const canSubmit = name.trim().length > 1 && phone.trim().length > 3 && pickupId !== dropoffId

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
    const order = createOrder({
      channel,
      pickupId,
      dropoffId,
      scheduledTime: new Date(scheduledTime).toISOString(),
      vehicleType,
      passengers,
      luggage,
      customer: { name, phone, email },
      flightNumber,
      notes,
    })
    setCreatedOrder(order)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white pb-32 text-slate-900">
      <PanelHeader
        title="Book Your Ride"
        subtitle="走瘋派車 · Customer Booking Panel"
        icon={<ClipboardList className="h-5 w-5" />}
        light
      />

      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-7">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Booking Channel</label>
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
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Scheduled Time</label>
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
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Pickup Location</label>
              <select
                value={pickupId}
                onChange={(e) => setPickupId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {LOCATIONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.isAirport ? '✈ ' : ''}
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Drop-off Location</label>
              <select
                value={dropoffId}
                onChange={(e) => setDropoffId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {LOCATIONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.isAirport ? '✈ ' : ''}
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-slate-500">Detected order type:</span>
            <OrderTypeBadge type={orderType} />
            {pickupId === dropoffId && <span className="text-xs text-red-500">Pickup and drop-off must differ.</span>}
          </div>

          <AnimatePresence>
            {isAirportTrip && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100"
              >
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Flight Number</label>
                <div className="flex gap-2">
                  <input
                    value={flightNumber}
                    onChange={(e) => {
                      setFlightNumber(e.target.value.toUpperCase())
                      setFlightChecked(false)
                    }}
                    placeholder="e.g. CI67"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setFlightNumber(randomFlightNumber())}
                    className="rounded-xl bg-white px-3 py-2.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    Random
                  </button>
                  <Button type="button" size="sm" onClick={handleLookupFlight} disabled={!flightNumber || flightLoading}>
                    {flightLoading ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                    Look up
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
                            Gate {flightPreview.gate} · {flightPreview.delayMinutes > 0 ? `+${flightPreview.delayMinutes} min` : 'On schedule'}
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

          <div className="mt-5">
            <label className="mb-2 block text-xs font-medium text-slate-600">Vehicle Type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {VEHICLE_OPTIONS.map((v) => (
                <button
                  key={v.type}
                  type="button"
                  onClick={() => setVehicleType(v.type)}
                  className={`rounded-xl border p-3 text-left transition ${
                    vehicleType === v.type ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-800">{v.label}</p>
                  <p className="text-[11px] text-slate-500">
                    {v.zh} · {v.capacity}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stepper label="Passengers" value={passengers} min={1} max={20} onChange={setPassengers} light />
            <Stepper label="Luggage" value={luggage} min={0} max={20} onChange={setLuggage} light />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+886 912-345-678"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Notes for Driver (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Child seat needed, extra luggage, etc."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <Button size="lg" fullWidth className="mt-6" disabled={!canSubmit} onClick={handleSubmit}>
            <Users className="h-4 w-4" /> Confirm Booking · {formatTWD(fare)}
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl bg-slate-900 shadow-xl">
            <VehicleSpinner color={selectedVehicle.color} className="h-40 w-full" />
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trip Estimate</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{formatTWD(fare)}</span>
              <span className="text-xs text-slate-400">estimated fare</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[11px] text-slate-400">Distance</p>
                <p className="font-semibold text-slate-800">{routePreview.distanceKm.toFixed(1)} km</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[11px] text-slate-400">Est. Duration</p>
                <p className="font-semibold text-slate-800">{duration} min</p>
              </div>
            </div>
          </div>

          <div className="h-56 overflow-hidden rounded-2xl shadow-xl">
            <RouteMapView order={previewOrder} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {createdOrder && (
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
              className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-500"
              >
                <CheckCircle2 className="h-8 w-8" />
              </motion.div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">Order {createdOrder.orderNo} Created!</h2>
              <p className="mt-1 text-sm text-slate-500">
                Routing to Central Control System now. The dispatch engine is finding the best driver for you.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <Button fullWidth onClick={() => navigate('/control')}>
                  View in Control Center
                </Button>
                <Button fullWidth variant="secondary" onClick={() => navigate('/customer')}>
                  Track My Ride
                </Button>
                <Button
                  fullWidth
                  variant="ghost"
                  onClick={() => {
                    setCreatedOrder(null)
                    setName('')
                    setPhone('')
                    setEmail('')
                    setNotes('')
                    setFlightChecked(false)
                    setFlightNumber('')
                  }}
                >
                  Book Another Ride
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
