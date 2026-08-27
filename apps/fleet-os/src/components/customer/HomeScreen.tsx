import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, PlaneLanding, PlaneTakeoff, Search, Tag, Timer, Users2 } from 'lucide-react'
import type { Order } from '../../types'
import { StatusBadge } from '../ui/OrderBadges'
import { ticksToMinutesLabel } from '../../lib/format'
import { useLang } from '../../i18n'

/** Booking shortcuts hand a preset order-type + pickup/dropoff pair to the
 * booking flow via router state — BookingPanel reads `presetType` on mount
 * (see panels/BookingPanel.tsx) so tapping a shortcut here genuinely
 * pre-fills the trip rather than just linking to a blank form. */
const QUICK_ACTIONS: { key: string; icon: typeof PlaneLanding; labelKey: string; presetType: string }[] = [
  { key: 'pickup', icon: PlaneLanding, labelKey: 'customer.home.quickAirportPickup', presetType: 'AIRPORT_PICKUP' },
  { key: 'dropoff', icon: PlaneTakeoff, labelKey: 'customer.home.quickAirportDropoff', presetType: 'AIRPORT_DROPOFF' },
  { key: 'tour', icon: Users2, labelKey: 'customer.home.quickTourCharter', presetType: 'TOUR_CHARTER' },
  // Hourly Charter (計時包車, Wanma Transfer) — billed by reserved hours, not
  // distance; see `lib/serviceRules.ts` for its rules and `PRESETS.HOURLY_CHARTER`
  // in panels/BookingPanel.tsx for how this preset pre-enables charter mode.
  { key: 'charter', icon: Timer, labelKey: 'customer.home.quickHourlyCharter', presetType: 'HOURLY_CHARTER' },
]

export function HomeScreen({
  customerName,
  activeOrder,
  onViewActive,
}: {
  customerName: string
  activeOrder: Order | null
  onViewActive: () => void
}) {
  const { t, lang } = useLang()
  const navigate = useNavigate()

  const activeLeg =
    activeOrder && (activeOrder.status === 'DRIVER_EN_ROUTE' || activeOrder.status === 'ASSIGNED' || activeOrder.status === 'CONFIRMED')
      ? activeOrder.routeToPickup
      : activeOrder?.routeToDropoff
  const remainingTicks = activeOrder && activeLeg ? activeLeg.durationTicks * (1 - activeOrder.legProgress) : 0

  return (
    <div className="mx-auto max-w-md space-y-5 px-4 pb-6" data-testid="customer-home-screen">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-1">
        <h1 className="text-2xl font-bold text-slate-900">{t('customer.home.greeting', { name: customerName })}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('customer.home.subGreeting')}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Link
          to="/booking"
          data-testid="customer-home-book-cta"
          className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 transition hover:ring-blue-200"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
            <Search className="h-5 w-5" />
          </span>
          <span className="flex-1 text-sm font-medium text-slate-400">{t('customer.home.searchPlaceholder')}</span>
          <span className="flex items-center gap-1 rounded-full bg-blue-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition group-hover:bg-blue-600">
            {t('customer.home.bookCta')} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-4 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => navigate('/booking', { state: { presetType: action.presetType } })}
            data-testid={`customer-quick-${action.key}`}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-2.5 text-center shadow-md shadow-slate-200/50 ring-1 ring-slate-100 transition hover:ring-blue-200 hover:shadow-lg"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <action.icon className="h-4.5 w-4.5" />
            </span>
            <span className="text-[10px] font-semibold leading-tight text-slate-600">{t(action.labelKey)}</span>
          </button>
        ))}
      </motion.div>

      {activeOrder && (
        <motion.button
          type="button"
          onClick={onViewActive}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="customer-home-active-trip"
          className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 p-4 text-left text-white shadow-xl shadow-blue-500/25"
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <span className="absolute inset-0 animate-ping rounded-xl bg-white/20" />
            <PlaneLanding className="relative h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-bold">
              {activeOrder.status === 'DRIVER_MATCHING' || activeOrder.status === 'CONFIRMED'
                ? t('customer.home.activeTripWaiting')
                : t('customer.home.activeTripTitle')}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-white/80">
              <StatusBadge status={activeOrder.status} />
              {activeLeg && <span>· {ticksToMinutesLabel(remainingTicks, lang)}</span>}
            </span>
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
            {t('customer.home.activeTripCta')} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </motion.button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 p-4 text-white shadow-lg shadow-amber-400/25"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <Tag className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-bold">{t('customer.home.promoTitle')}</span>
          <span className="block text-xs text-white/85">{t('customer.home.promoDesc')}</span>
        </span>
      </motion.div>
    </div>
  )
}
