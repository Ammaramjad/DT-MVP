import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Award, Check, Clock, Crown, Luggage, Rocket, Users } from 'lucide-react'
import type { DemandLevel, FareBreakdown, PassengerRequirements, TaiwanRegion, VehicleCategory, WeatherCondition } from '../../types'
import { VEHICLE_CATEGORIES, VEHICLE_CATEGORY_CATALOG } from '../../data/vehicleCatalog'
import { computeDynamicFareBreakdown, countAvailableVehicles } from '../../lib/dynamicPricing'
import { useFleetStore } from '../../store/useFleetStore'
import { hashSeed, mulberry32 } from '../../lib/geo'
import { formatTWD } from '../../lib/format'
import { formatDualCurrency, useCurrencyStore } from '../../lib/currency'
import { useLang } from '../../i18n'

/** A supplier-source badge per the client brief ("Direct Fleet, Klook,
 * KKday, ezTravel, or partner fleet") — deterministic per category so it
 * stays stable across re-renders rather than flickering randomly. */
const SUPPLIER_ROTATION: { key: string; labelKey: string }[] = [
  { key: 'DIRECT', labelKey: 'vehicle.supplier.DIRECT' },
  { key: 'KLOOK', labelKey: 'vehicle.supplier.KLOOK' },
  { key: 'KKDAY', labelKey: 'vehicle.supplier.KKDAY' },
  { key: 'EZTRAVEL', labelKey: 'vehicle.supplier.EZTRAVEL' },
  { key: 'PARTNER', labelKey: 'vehicle.supplier.PARTNER' },
]

export type VehicleBadgeKind = 'BEST_VALUE' | 'FASTEST_PICKUP' | 'MOST_LUGGAGE' | 'VIP_COMFORT' | 'RECOMMENDED'

export interface VehicleOption {
  category: VehicleCategory
  fareBreakdown: FareBreakdown
  eligible: boolean
  ineligibleReasonKey: string | null
  ineligibleParams: Record<string, string | number>
  pickupEtaMin: number
  availableCount: number
  supplierKey: string
  supplierLabelKey: string
  badges: VehicleBadgeKind[]
}

export function useVehicleOptions(params: {
  passengers: number
  luggage: number
  requirements: PassengerRequirements
  distanceKm: number
  durationMin: number
  isAirport: boolean
  pickupZone: TaiwanRegion | undefined
  scheduledTimeIso: string
  waitingMinutes?: number
  couponCode?: string | null
  /** Hourly Charter (計時包車) mode — see `lib/serviceRules.ts`. When set,
   * every category's fare reflects the hourly-rate billing model instead of
   * the usual distance/time model. */
  charterHours?: number | null
  mountainRoute?: boolean
}): VehicleOption[] {
  const zoneConditions = useFleetStore((s) => s.zoneConditions)
  const pricingRules = useFleetStore((s) => s.pricingRules)
  const vehicles = useFleetStore((s) => s.vehicles)
  const drivers = useFleetStore((s) => s.drivers)
  const categoryPriceOverrides = useFleetStore((s) => s.categoryPriceOverrides)

  return useMemo(() => {
    const zone = params.pickupZone ? zoneConditions.find((z) => z.region === params.pickupZone) : undefined
    const weather: WeatherCondition = zone?.weather ?? 'CLEAR'
    const demand: DemandLevel = zone?.demand ?? 'NORMAL'

    const options: VehicleOption[] = VEHICLE_CATEGORIES.map((category) => {
      const baseEntry = VEHICLE_CATEGORY_CATALOG[category]
      const override = categoryPriceOverrides[category]
      const entry = override ? { ...baseEntry, ...override } : baseEntry

      const rand = mulberry32(hashSeed(`${category}-${params.pickupZone ?? 'any'}`))
      const availableCount = params.pickupZone
        ? countAvailableVehicles(vehicles, drivers, params.pickupZone, category, entry.underlyingType)
        : vehicles.filter((v) => v.category === category).length

      let ineligibleReasonKey: string | null = null
      const ineligibleParams: Record<string, string | number> = { passengers: entry.maxPassengers, luggage: entry.maxLuggage }
      if (params.passengers > entry.maxPassengers || params.luggage > entry.maxLuggage) {
        ineligibleReasonKey = 'vehicle.ineligible.capacity'
      } else if (params.requirements.wheelchair && !entry.features.includes('WHEELCHAIR_ACCESS')) {
        ineligibleReasonKey = 'vehicle.ineligible.wheelchair'
      } else if (params.requirements.childSeat && !entry.features.includes('CHILD_SEAT')) {
        ineligibleReasonKey = 'vehicle.ineligible.childSeat'
      } else if (availableCount <= 0) {
        ineligibleReasonKey = 'vehicle.ineligible.noAvailability'
      }
      const eligible = ineligibleReasonKey === null

      const fareBreakdown = computeDynamicFareBreakdown({
        category: entry,
        distanceKm: params.distanceKm,
        durationMin: params.durationMin,
        isAirport: params.isAirport,
        pickupZone: params.pickupZone,
        scheduledTimeIso: params.scheduledTimeIso,
        waitingMinutes: params.waitingMinutes,
        availableVehiclesInZone: params.pickupZone ? availableCount : 999,
        weather,
        demand,
        rules: pricingRules,
        couponCode: params.couponCode ?? null,
        charterHours: params.charterHours ?? null,
        mountainRoute: params.mountainRoute ?? false,
      })

      // Simulated pickup ETA: fewer available vehicles in-zone => longer wait,
      // with a small deterministic per-category jitter so cards don't all
      // read identically.
      const scarcityPenalty = availableCount <= 0 ? 18 : availableCount === 1 ? 9 : availableCount <= 3 ? 4 : 0
      const pickupEtaMin = Math.round(4 + scarcityPenalty + rand() * 6)

      const supplier = SUPPLIER_ROTATION[Math.floor(rand() * SUPPLIER_ROTATION.length)]

      return {
        category,
        fareBreakdown,
        eligible,
        ineligibleReasonKey,
        ineligibleParams,
        pickupEtaMin,
        availableCount,
        supplierKey: supplier.key,
        supplierLabelKey: supplier.labelKey,
        badges: entry.isVip ? (['VIP_COMFORT'] as VehicleBadgeKind[]) : [],
      }
    })

    const eligibleOptions = options.filter((o) => o.eligible)
    if (eligibleOptions.length > 0) {
      const cheapest = eligibleOptions.reduce((a, b) => (b.fareBreakdown.total < a.fareBreakdown.total ? b : a))
      const fastest = eligibleOptions.reduce((a, b) => (b.pickupEtaMin < a.pickupEtaMin ? b : a))
      const mostLuggage = eligibleOptions.reduce((a, b) =>
        VEHICLE_CATEGORY_CATALOG[b.category].maxLuggage > VEHICLE_CATEGORY_CATALOG[a.category].maxLuggage ? b : a,
      )
      // "Recommended" favours the smallest vehicle that comfortably fits the
      // party (least wasted capacity), tie-broken by price — mirrors the
      // client brief's "based on passenger count, luggage, route,
      // availability, price and travel preference."
      const recommended = [...eligibleOptions].sort((a, b) => {
        const aSlack = VEHICLE_CATEGORY_CATALOG[a.category].maxPassengers - params.passengers
        const bSlack = VEHICLE_CATEGORY_CATALOG[b.category].maxPassengers - params.passengers
        if (aSlack !== bSlack) return aSlack - bSlack
        return a.fareBreakdown.total - b.fareBreakdown.total
      })[0]

      for (const o of options) {
        if (o.category === cheapest.category) o.badges.push('BEST_VALUE')
        if (o.category === fastest.category) o.badges.push('FASTEST_PICKUP')
        if (o.category === mostLuggage.category) o.badges.push('MOST_LUGGAGE')
        if (o.category === recommended.category) o.badges.unshift('RECOMMENDED')
      }
    }

    return options
  }, [
    params.passengers,
    params.luggage,
    params.requirements,
    params.distanceKm,
    params.durationMin,
    params.isAirport,
    params.pickupZone,
    params.scheduledTimeIso,
    params.waitingMinutes,
    params.couponCode,
    params.charterHours,
    params.mountainRoute,
    zoneConditions,
    pricingRules,
    vehicles,
    drivers,
    categoryPriceOverrides,
  ])
}

const BADGE_ICON: Record<VehicleBadgeKind, typeof Award> = {
  BEST_VALUE: Award,
  FASTEST_PICKUP: Rocket,
  MOST_LUGGAGE: Luggage,
  VIP_COMFORT: Crown,
  RECOMMENDED: Check,
}
const BADGE_TONE: Record<VehicleBadgeKind, string> = {
  BEST_VALUE: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
  FASTEST_PICKUP: 'bg-blue-50 text-blue-600 ring-blue-200',
  MOST_LUGGAGE: 'bg-amber-50 text-amber-700 ring-amber-200',
  VIP_COMFORT: 'bg-purple-50 text-purple-700 ring-purple-200',
  RECOMMENDED: 'bg-slate-800 text-white ring-slate-800',
}

export function VehicleOptionsGrid({
  options,
  selectedCategory,
  onSelect,
  compareList,
  onToggleCompare,
}: {
  options: VehicleOption[]
  selectedCategory: VehicleCategory
  onSelect: (category: VehicleCategory) => void
  compareList: VehicleCategory[]
  onToggleCompare: (category: VehicleCategory) => void
}) {
  const { t } = useLang()

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="vehicle-options-grid">
      {options.map((option) => (
        <VehicleOptionCard
          key={option.category}
          option={option}
          selected={selectedCategory === option.category}
          onSelect={() => option.eligible && onSelect(option.category)}
          compareChecked={compareList.includes(option.category)}
          onToggleCompare={() => onToggleCompare(option.category)}
          compareDisabled={!compareList.includes(option.category) && compareList.length >= 3}
          t={t}
        />
      ))}
    </div>
  )
}

function VehicleOptionCard({
  option,
  selected,
  onSelect,
  compareChecked,
  onToggleCompare,
  compareDisabled,
  t,
}: {
  option: VehicleOption
  selected: boolean
  onSelect: () => void
  compareChecked: boolean
  onToggleCompare: () => void
  compareDisabled: boolean
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const { currency } = useCurrencyStore()
  const entry = VEHICLE_CATEGORY_CATALOG[option.category]

  return (
    <motion.div
      layout
      data-testid={`vehicle-option-${option.category}`}
      data-eligible={option.eligible}
      className={`relative flex flex-col overflow-hidden rounded-2xl border text-left transition ${
        !option.eligible
          ? 'border-slate-100 bg-slate-50/60 opacity-60'
          : selected
            ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-100'
            : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'
      }`}
    >
      <button type="button" onClick={onSelect} disabled={!option.eligible} className="flex flex-1 flex-col text-left disabled:cursor-not-allowed">
        <div className="flex gap-3 p-3">
          <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-100">
            <img src={entry.photo} alt={`${entry.brand} ${entry.model}`} className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-1">
              <p className="text-sm font-bold text-slate-900">{t(`vehicle.category.${option.category}`)}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{t(option.supplierLabelKey)}</span>
            </div>
            <p className="truncate text-[11px] text-slate-500">
              {entry.brand} {entry.model}
            </p>
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {entry.maxPassengers}
              </span>
              <span className="flex items-center gap-1">
                <Luggage className="h-3 w-3" /> {entry.maxLuggage}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {t('vehicle.etaMin', { min: option.pickupEtaMin })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 px-3">
          {option.badges.map((b) => {
            const Icon = BADGE_ICON[b]
            return (
              <span key={b} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${BADGE_TONE[b]}`}>
                <Icon className="h-2.5 w-2.5" /> {t(`vehicle.badge.${b}`)}
              </span>
            )
          })}
        </div>

        {!option.eligible ? (
          <div className="mt-2 flex items-start gap-1.5 px-3 pb-3 text-[11px] text-red-500" data-testid="vehicle-ineligible-reason">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t(option.ineligibleReasonKey!, option.ineligibleParams)}</span>
          </div>
        ) : (
          <div className="mt-2 flex items-end justify-between px-3 pb-3">
            <span className="text-[10.5px] text-slate-400">{t(`vehicle.cancellation.${entry.cancellationPolicy}`)}</span>
            <div className="text-right">
              {(option.fareBreakdown.demandAdjustment > 0 || option.fareBreakdown.weatherAdjustment > 0) && (
                <p className="text-[10px] text-slate-400 line-through">{formatTWD(option.fareBreakdown.subtotal - option.fareBreakdown.demandAdjustment - option.fareBreakdown.weatherAdjustment)}</p>
              )}
              <p className="text-base font-black text-slate-900">{formatTWD(option.fareBreakdown.total)}</p>
              {currency !== 'TWD' && (
                <p className="text-[10px] font-bold text-amber-600">
                  {formatDualCurrency(option.fareBreakdown.total, currency).split('(')[1]?.replace(')', '') || ''}
                </p>
              )}
            </div>
          </div>
        )}
      </button>

      {option.eligible && (
        <label className="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/60 px-3 py-1.5 text-[10.5px] font-medium text-slate-500">
          <input
            type="checkbox"
            checked={compareChecked}
            disabled={compareDisabled}
            onChange={onToggleCompare}
            data-testid={`vehicle-compare-${option.category}`}
            className="h-3.5 w-3.5 accent-blue-500"
          />
          {t('vehicle.compareAdd')}
        </label>
      )}
    </motion.div>
  )
}
