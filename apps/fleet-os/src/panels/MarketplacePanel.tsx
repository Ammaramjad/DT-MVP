import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe2, MapPin, Search, Star, X } from 'lucide-react'
import { MARKETPLACE_LISTINGS } from '../data/marketplaceSeed'
import { getLocation } from '../data/locations'
import { PanelHeader } from '../components/layout/PanelHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { formatTWD } from '../lib/format'
import type { MarketplaceCategory, MarketplaceListing, MarketplaceSource, VehicleType } from '../types'
import { DEFAULT_CATEGORY_FOR_TYPE } from '../data/vehicleCatalog'
import { useLang } from '../i18n'

const SOURCE_TONE: Record<MarketplaceSource, 'cyan' | 'red' | 'amber' | 'green' | 'purple'> = {
  Direct: 'cyan',
  Klook: 'red',
  KKday: 'amber',
  ezTravel: 'green',
  'Booking.com': 'purple',
}

const CATEGORIES: (MarketplaceCategory | 'ALL')[] = ['ALL', 'AIRPORT_PICKUP', 'AIRPORT_DROPOFF', 'HOURLY_CHARTER', 'INTERCITY_TRANSFER', 'ATTRACTION_ROUTE']
const SOURCES: (MarketplaceSource | 'ALL')[] = ['ALL', 'Direct', 'Klook', 'KKday', 'ezTravel', 'Booking.com']
const VEHICLE_TYPES: (VehicleType | 'ALL')[] = ['ALL', 'SEDAN', 'SUV', 'VAN', 'LUXURY', 'MINIBUS']

export default function MarketplacePanel() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<MarketplaceCategory | 'ALL'>('ALL')
  const [source, setSource] = useState<MarketplaceSource | 'ALL'>('ALL')
  const [vehicle, setVehicle] = useState<VehicleType | 'ALL'>('ALL')
  const [sort, setSort] = useState<'PRICE_ASC' | 'PRICE_DESC' | 'RATING'>('RATING')
  const [detail, setDetail] = useState<MarketplaceListing | null>(null)

  const results = useMemo(() => {
    let list = MARKETPLACE_LISTINGS.filter((l) => {
      if (category !== 'ALL' && l.category !== category) return false
      if (source !== 'ALL' && l.source !== source) return false
      if (vehicle !== 'ALL' && l.vehicleType !== vehicle) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        if (!l.title.toLowerCase().includes(q) && !l.titleZh.includes(query)) return false
      }
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'PRICE_ASC') return a.price - b.price
      if (sort === 'PRICE_DESC') return b.price - a.price
      return b.rating - a.rating
    })
    return list
  }, [category, source, vehicle, query, sort])

  const handleBook = (listing: MarketplaceListing) => {
    navigate('/booking', {
      state: {
        presetPickupId: listing.fromLocationId,
        presetDropoffId: listing.toLocationId,
        presetVehicleCategory: DEFAULT_CATEGORY_FOR_TYPE[listing.vehicleType],
        presetChannel: listing.source === 'Direct' ? 'Website' : listing.source,
      },
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white pb-24 text-slate-900">
      <PanelHeader title={t('marketplace.title')} subtitle={t('marketplace.subtitle')} icon={<Globe2 className="h-5 w-5" />} light />

      <div className="mx-auto mt-5 max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl bg-white p-4 shadow-lg shadow-slate-200/60 ring-1 ring-slate-100">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('marketplace.searchPlaceholder')}
              data-testid="marketplace-search-input"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <FilterSelect testId="marketplace-filter-category" value={category} onChange={(v) => setCategory(v as MarketplaceCategory | 'ALL')} options={CATEGORIES} labelPrefix="marketplace.category." t={t} />
            <FilterSelect testId="marketplace-filter-source" value={source} onChange={(v) => setSource(v as MarketplaceSource | 'ALL')} options={SOURCES} labelPrefix="" t={t} rawLabels />
            <FilterSelect testId="marketplace-filter-vehicle" value={vehicle} onChange={(v) => setVehicle(v as VehicleType | 'ALL')} options={VEHICLE_TYPES} labelPrefix="vehicle.type." t={t} allLabel="marketplace.allVehicles" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              data-testid="marketplace-sort"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none"
            >
              <option value="RATING">{t('marketplace.sortRating')}</option>
              <option value="PRICE_ASC">{t('marketplace.sortPriceAsc')}</option>
              <option value="PRICE_DESC">{t('marketplace.sortPriceDesc')}</option>
            </select>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">{t('marketplace.resultCount', { n: results.length })}</p>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="marketplace-results-grid">
          {results.map((listing) => {
            const from = getLocation(listing.fromLocationId)
            const to = getLocation(listing.toLocationId)
            return (
              <motion.div
                layout
                key={listing.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col rounded-2xl bg-white p-4 shadow-md shadow-slate-200/50 ring-1 ring-slate-100 transition hover:shadow-xl"
                data-testid="marketplace-listing-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={SOURCE_TONE[listing.source]}>{listing.source}</Badge>
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {listing.rating.toFixed(1)} ({listing.reviewCount})
                  </span>
                </div>
                <p className="mt-2.5 text-sm font-semibold leading-snug text-slate-800">{lang === 'zh' ? listing.titleZh : listing.title}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {lang === 'zh' ? from.nameZh : from.name} → {lang === 'zh' ? to.nameZh : to.name}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge tone="slate">{t(`vehicle.type.${listing.vehicleType}`)}</Badge>
                  <Badge tone="slate">{t(`marketplace.cancellation.${listing.cancellationPolicy}`)}</Badge>
                  <Badge tone="slate">{t('marketplace.capacity', { n: listing.capacity })}</Badge>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-lg font-black text-slate-900">{formatTWD(listing.price)}</span>
                  <button onClick={() => setDetail(listing)} data-testid="marketplace-view-detail" className="text-xs font-medium text-blue-600 hover:underline">
                    {t('marketplace.viewDetails')}
                  </button>
                </div>
                <Button size="sm" fullWidth className="mt-3" data-testid="marketplace-book-button" onClick={() => handleBook(listing)}>
                  {t('marketplace.bookNow')}
                </Button>
              </motion.div>
            )
          })}
          {results.length === 0 && <p className="col-span-full py-16 text-center text-sm text-slate-400">{t('marketplace.noResults')}</p>}
        </div>
      </div>

      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setDetail(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
              data-testid="marketplace-detail-modal"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone={SOURCE_TONE[detail.source]}>{detail.source}</Badge>
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {detail.rating.toFixed(1)} ({detail.reviewCount})
                  </span>
                </div>
                <button onClick={() => setDetail(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-2.5 text-base font-bold text-slate-900">{lang === 'zh' ? detail.titleZh : detail.title}</h3>
              <p className="mt-3 text-2xl font-black text-slate-900">{formatTWD(detail.price)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <InfoBox label={t('marketplace.vehicle')} value={t(`vehicle.type.${detail.vehicleType}`)} />
                <InfoBox label={t('marketplace.duration')} value={`${detail.durationMin} min`} />
                <InfoBox label={t('marketplace.capacity2')} value={String(detail.capacity)} />
                <InfoBox label={t('marketplace.cancellationLabel')} value={t(`marketplace.cancellation.${detail.cancellationPolicy}`)} />
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('marketplace.languages')}</p>
                <p className="mt-1 text-sm text-slate-700">{detail.languages.join(' · ')}</p>
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-500">{t('marketplace.inclusions')}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                  {detail.inclusions.map((i) => (
                    <li key={i}>+ {i}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400">{t('marketplace.exclusions')}</p>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-500">
                  {detail.exclusions.map((i) => (
                    <li key={i}>− {i}</li>
                  ))}
                </ul>
              </div>
              <Button fullWidth className="mt-4" onClick={() => handleBook(detail)}>
                {t('marketplace.bookNow')}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
  labelPrefix,
  t,
  testId,
  rawLabels,
  allLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  labelPrefix: string
  t: (key: string, vars?: Record<string, string | number>) => string
  testId: string
  rawLabels?: boolean
  allLabel?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testId}
      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === 'ALL' ? (allLabel ? t(allLabel) : t('marketplace.all')) : rawLabels ? o : t(`${labelPrefix}${o}`)}
        </option>
      ))}
    </select>
  )
}
