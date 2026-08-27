import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Car, ClipboardList, Compass, Globe2, Home as HomeIcon, MapPinned, Radar } from 'lucide-react'
import { useLang } from '../i18n'

const DESTINATIONS = [
  { to: '/', labelKey: 'nav.home', icon: HomeIcon },
  { to: '/marketplace', labelKey: 'nav.marketplace', icon: Globe2 },
  { to: '/booking', labelKey: 'nav.booking', icon: ClipboardList },
  { to: '/fleet-os', labelKey: 'nav.control', icon: Radar },
  { to: '/driver', labelKey: 'nav.driver', icon: Car },
  { to: '/customer', labelKey: 'nav.customer', icon: MapPinned },
]

export default function NotFoundPanel() {
  const { t } = useLang()
  const location = useLocation()

  return (
    <div className="relative min-h-screen overflow-hidden bg-mission-950 bg-noise text-white" data-testid="not-found-panel">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
            <Compass className="h-3.5 w-3.5" /> {t('notFound.badge')}
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">{t('notFound.title')}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">{t('notFound.subtitle')}</p>
          <p className="mt-4 break-all rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-slate-500">
            {location.pathname}
          </p>

          <div className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {DESTINATIONS.map(({ to, labelKey, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="glass-panel group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-cyan-300" /> {t(labelKey)}
                </span>
                <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-70" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
