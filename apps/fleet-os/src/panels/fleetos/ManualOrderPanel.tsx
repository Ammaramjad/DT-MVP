import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, ClipboardEdit, PlaneLanding, PlaneTakeoff, MapPinned } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { Button } from '../../components/ui/Button'
import { AIRPORTS, LOCATIONS, NON_AIRPORTS } from '../../data/locations'
import type { BookingChannel, ManualOrderInput, VehicleType } from '../../types'
import { useLang } from '../../i18n'

const TYPES: { key: ManualOrderInput['type']; icon: typeof PlaneLanding }[] = [
  { key: 'AIRPORT_PICKUP', icon: PlaneLanding },
  { key: 'AIRPORT_DROPOFF', icon: PlaneTakeoff },
  { key: 'TOUR_CHARTER', icon: MapPinned },
]

const VEHICLE_TYPES: VehicleType[] = ['SEDAN', 'SUV', 'VAN', 'LUXURY', 'MINIBUS']
const SOURCES: BookingChannel[] = ['Phone / Agent', 'LINE@', 'Website']

function defaultScheduledTime(): string {
  const d = new Date(Date.now() + 60 * 60_000)
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

/** 手動開單 (Manual Order Entry) — a dispatcher/counter-staff form for phone
 * or walk-in bookings, mirroring the reference site's screen 1:1: submitting
 * confirms the order immediately (no simulated payment step), since a
 * phone/counter order is already confirmed the moment staff key it in. */
export default function ManualOrderPanel() {
  const { t, lang } = useLang()
  const createManualOrder = useFleetStore((s) => s.createManualOrder)

  const [type, setType] = useState<ManualOrderInput['type']>('AIRPORT_PICKUP')
  const [source, setSource] = useState<BookingChannel>('Phone / Agent')
  const [flightNumber, setFlightNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [passengers, setPassengers] = useState(2)
  const [scheduledTime, setScheduledTime] = useState(defaultScheduledTime())
  const [pickupId, setPickupId] = useState('tpe-airport')
  const [dropoffId, setDropoffId] = useState(NON_AIRPORTS[0]?.id ?? '')
  const [vehicleType, setVehicleType] = useState<VehicleType>('SEDAN')
  const [quotedPrice, setQuotedPrice] = useState(1600)
  const [notes, setNotes] = useState('')
  const [lastCreated, setLastCreated] = useState<{ orderNo: string } | null>(null)

  const pickupOptions = type === 'AIRPORT_DROPOFF' ? NON_AIRPORTS : AIRPORTS.length ? AIRPORTS : LOCATIONS
  const dropoffOptions = type === 'AIRPORT_DROPOFF' ? AIRPORTS : NON_AIRPORTS
  const isValid = customerName.trim().length > 0 && customerPhone.trim().length > 0 && quotedPrice > 0 && pickupId && dropoffId

  const resolvedPickupId = useMemo(() => (type === 'AIRPORT_DROPOFF' ? pickupId : pickupOptions[0]?.id === pickupId ? pickupId : (pickupOptions[0]?.id ?? pickupId)), [type, pickupId, pickupOptions])

  const handleSubmit = () => {
    if (!isValid) return
    const order = createManualOrder({
      type,
      channel: source,
      flightNumber: type === 'TOUR_CHARTER' ? '' : flightNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      passengers,
      scheduledTime: new Date(scheduledTime).toISOString(),
      pickupId: resolvedPickupId,
      dropoffId,
      vehicleType,
      quotedPrice,
      notes,
      enteredBy: 'Lin Da-Ming',
    })
    setLastCreated({ orderNo: order.orderNo })
    setCustomerName('')
    setCustomerPhone('')
    setFlightNumber('')
    setNotes('')
    setQuotedPrice(1600)
  }

  const handleClear = () => {
    setCustomerName('')
    setCustomerPhone('')
    setFlightNumber('')
    setNotes('')
    setQuotedPrice(1600)
    setLastCreated(null)
  }

  return (
    <FleetOsPage title={t('fleetos.manualOrder.title')} subtitle={t('fleetos.manualOrder.subtitle')} icon={<ClipboardEdit className="h-5 w-5" />}>
      <div className="mt-4 max-w-3xl">
        {lastCreated && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            data-testid="manual-order-success"
            className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-300"
          >
            <CheckCircle2 className="h-4 w-4" /> {t('fleetos.manualOrder.successMessage', { orderNo: lastCreated.orderNo })}
          </motion.div>
        )}

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex gap-1.5">
            {TYPES.map(({ key, icon: Icon }) => (
              <button
                key={key}
                data-testid={`manual-order-type-${key}`}
                onClick={() => setType(key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  type === key ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {t(`fleetos.manualOrder.type.${key}`)}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t('fleetos.manualOrder.source')}>
              <select value={source} onChange={(e) => setSource(e.target.value as BookingChannel)} className="input-field" data-testid="manual-order-source">
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label={t('fleetos.manualOrder.flightNumber')} hint={type === 'TOUR_CHARTER' ? t('fleetos.manualOrder.flightNumberDisabled') : undefined}>
              <input
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                disabled={type === 'TOUR_CHARTER'}
                placeholder="e.g. BR128"
                className="input-field"
                data-testid="manual-order-flight"
              />
            </Field>
            <Field label={t('fleetos.manualOrder.customerName')}>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={lang === 'zh' ? '例：陳志明' : 'e.g. Chih-Ming Chen'} className="input-field" data-testid="manual-order-name" />
            </Field>
            <Field label={t('fleetos.manualOrder.customerPhone')}>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+886 912 345 678" className="input-field" data-testid="manual-order-phone" />
            </Field>
            <Field label={t('fleetos.manualOrder.passengers')}>
              <input type="number" min={1} max={18} value={passengers} onChange={(e) => setPassengers(Math.max(1, Number(e.target.value)))} className="input-field" data-testid="manual-order-passengers" />
            </Field>
            <Field label={t('fleetos.manualOrder.pickupTime')}>
              <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="input-field" data-testid="manual-order-time" />
            </Field>
            <Field label={t('fleetos.manualOrder.pickupLocation')}>
              <select value={type === 'AIRPORT_DROPOFF' ? pickupId : resolvedPickupId} onChange={(e) => setPickupId(e.target.value)} className="input-field" data-testid="manual-order-pickup">
                {pickupOptions.map((l) => (
                  <option key={l.id} value={l.id}>{lang === 'zh' ? l.nameZh : l.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('fleetos.manualOrder.dropoffLocation')}>
              <select value={dropoffId} onChange={(e) => setDropoffId(e.target.value)} className="input-field" data-testid="manual-order-dropoff">
                {dropoffOptions.map((l) => (
                  <option key={l.id} value={l.id}>{lang === 'zh' ? l.nameZh : l.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t('fleetos.manualOrder.vehicleType')}>
              <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)} className="input-field" data-testid="manual-order-vehicle">
                    {VEHICLE_TYPES.map((v) => (
                      <option key={v} value={v}>{t(`vehicle.type.${v}`)}</option>
                    ))}
              </select>
            </Field>
            <Field label={t('fleetos.manualOrder.quotedPrice')} hint={t('fleetos.manualOrder.quotedPriceHint')}>
              <input type="number" min={0} step={50} value={quotedPrice} onChange={(e) => setQuotedPrice(Math.max(0, Number(e.target.value)))} className="input-field" data-testid="manual-order-price" />
            </Field>
          </div>

          <div className="mt-3">
            <Field label={t('fleetos.manualOrder.notes')}>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input-field" data-testid="manual-order-notes" placeholder={lang === 'zh' ? '例：需要兒童安全座椅 x1' : 'e.g. Needs 1 child seat'} />
            </Field>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">{t('fleetos.manualOrder.enteredByNote', { name: 'Lin Da-Ming' })}</p>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleClear} data-testid="manual-order-clear">
              {t('fleetos.manualOrder.clear')}
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!isValid} data-testid="manual-order-submit">
              <ClipboardEdit className="h-3.5 w-3.5" /> {t('fleetos.manualOrder.submit')}
            </Button>
          </div>
        </div>
      </div>
    </FleetOsPage>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-slate-400">
        {label} {hint && <span className="text-slate-600">({hint})</span>}
      </span>
      {children}
    </label>
  )
}
