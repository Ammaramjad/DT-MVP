import { AnimatePresence, motion } from 'framer-motion'
import { Luggage, Users, X } from 'lucide-react'
import type { VehicleCategory } from '../../types'
import { VEHICLE_CATEGORY_CATALOG } from '../../data/vehicleCatalog'
import type { VehicleOption } from './VehicleOptionsGrid'
import { formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

/** Client brief: "a comparison action allowing customers to compare up to
 * three vehicle options" — a bottom-sheet-style table so the customer can
 * scan capacity/price/ETA side by side before choosing. */
export function VehicleCompareDrawer({
  options,
  categories,
  onRemove,
  onClose,
  onSelect,
}: {
  options: VehicleOption[]
  categories: VehicleCategory[]
  onRemove: (category: VehicleCategory) => void
  onClose: () => void
  onSelect: (category: VehicleCategory) => void
}) {
  const { t } = useLang()
  const rows = categories.map((c) => options.find((o) => o.category === c)).filter((o): o is VehicleOption => !!o)
  if (rows.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="fixed inset-x-0 bottom-0 z-[1100] mx-auto max-w-3xl rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:bottom-4 sm:rounded-2xl"
        data-testid="vehicle-compare-drawer"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">{t('vehicle.compareTitle', { n: rows.length })}</p>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" data-testid="vehicle-compare-close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
          {rows.map((option) => {
            const entry = VEHICLE_CATEGORY_CATALOG[option.category]
            return (
              <div key={option.category} className="rounded-xl border border-slate-100 p-3" data-testid={`vehicle-compare-card-${option.category}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-800">{t(`vehicle.category.${option.category}`)}</p>
                  <button type="button" onClick={() => onRemove(option.category)} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <img src={entry.photo} alt="" className="mt-2 h-16 w-full rounded-lg object-cover" />
                <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                  <p className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {t('vehicle.compareMaxPassengers', { n: entry.maxPassengers })}
                  </p>
                  <p className="flex items-center gap-1">
                    <Luggage className="h-3 w-3" /> {t('vehicle.compareMaxLuggage', { n: entry.maxLuggage })}
                  </p>
                  <p>{t('vehicle.etaMin', { min: option.pickupEtaMin })}</p>
                  <p>{t(`vehicle.cancellation.${entry.cancellationPolicy}`)}</p>
                </div>
                <p className="mt-2 text-base font-black text-slate-900">{formatTWD(option.fareBreakdown.total)}</p>
                <button
                  type="button"
                  onClick={() => onSelect(option.category)}
                  data-testid={`vehicle-compare-select-${option.category}`}
                  className="mt-2 w-full rounded-lg bg-blue-500 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-600"
                >
                  {t('vehicle.compareSelect')}
                </button>
              </div>
            )
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
