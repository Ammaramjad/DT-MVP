import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, PlaneLanding, PlaneTakeoff, Search, Tag, Timer, Users2 } from 'lucide-react'
import type { Order } from '../../types'
import { StatusBadge } from '../ui/OrderBadges'
import { ticksToMinutesLabel } from '../../lib/format'
import { useLang } from '../../i18n'

const QUICK_ACTIONS: { key: string; icon: typeof PlaneLanding; labelKey: string; presetType: string }[] = [
  { key: 'pickup', icon: PlaneLanding, labelKey: 'customer.home.quickAirportPickup', presetType: 'AIRPORT_PICKUP' },
  { key: 'dropoff', icon: PlaneTakeoff, labelKey: 'customer.home.quickAirportDropoff', presetType: 'AIRPORT_DROPOFF' },
  { key: 'tour', icon: Users2, labelKey: 'customer.home.quickTourCharter', presetType: 'TOUR_CHARTER' },
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
        <h1 className="text-2xl font-black text-white tracking-tight">{t('customer.home.greeting', { name: customerName })}</h1>
        <p className="mt-1 text-xs text-slate-400">{t('customer.home.subGreeting')}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Link
          to="/booking"
          data-testid="customer-home-book-cta"
          className="glass-panel-glow group flex items-center gap-3.5 rounded-2xl p-4 transition hover:border-cyan-400/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30">
            <Search className="h-5 w-5" />
          </span>
          <span className="flex-1 text-xs font-semibold text-slate-300">{t('customer.home.searchPlaceholder')}</span>
          <span className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition group-hover:scale-105">
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
            className="glass-panel flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition hover:border-cyan-400/40 hover:bg-white/[0.08]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
              <action.icon className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-bold leading-tight text-slate-200">{t(action.labelKey)}</span>
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
          className="flex w-full items-center gap-3.5 rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-blue-950/80 p-4 text-left text-white shadow-2xl backdrop-blur-xl transition hover:border-cyan-400/60"
        >
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/40">
            <span className="absolute inset-0 animate-ping rounded-xl bg-cyan-400/20" />
            <PlaneLanding className="relative h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-bold text-white">
              {activeOrder.status === 'DRIVER_MATCHING' || activeOrder.status === 'CONFIRMED'
                ? t('customer.home.activeTripWaiting')
                : t('customer.home.activeTripTitle')}
            </span>
            <span className="mt-1 flex items-center gap-2 text-xs text-slate-300">
              <StatusBadge status={activeOrder.status} />
              {activeLeg && <span className="font-mono text-cyan-300">· ETA {ticksToMinutesLabel(remainingTicks, lang)}</span>}
            </span>
          </span>
          <span className="flex items-center gap-1 rounded-xl bg-cyan-500/20 border border-cyan-400/30 px-3 py-1.5 text-xs font-bold text-cyan-300">
            {t('customer.home.activeTripCta')} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </motion.button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel flex items-center gap-3.5 rounded-2xl p-4 border border-amber-400/20 bg-gradient-to-r from-amber-950/30 to-slate-900"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
          <Tag className="h-5 w-5" />
        </span>
        <div>
          <span className="block text-sm font-bold text-amber-200">{t('customer.home.promoTitle')}</span>
          <span className="block text-xs text-slate-300 mt-0.5">{t('customer.home.promoDesc')}</span>
        </div>
      </motion.div>
    </div>
  )
}
