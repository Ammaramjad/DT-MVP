import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Car, ClipboardList, Compass, Globe2, Home as HomeIcon, LayoutGrid, Lock, MapPinned, Radar, Sparkles, X } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '../../i18n'
import { LANGS } from '../../i18n/translations'
import { useGatekeeper } from '../../lib/gatekeeper'
import { useDemoTourStore } from '../../lib/demoTour'

const APPS = [
  { to: '/', labelKey: 'nav.home', icon: HomeIcon },
  { to: '/marketplace', labelKey: 'nav.marketplace', icon: Globe2 },
  { to: '/booking', labelKey: 'nav.booking', icon: ClipboardList },
  { to: '/control', labelKey: 'nav.control', icon: Radar },
  { to: '/fleet-os/multiscreen', labelKey: 'fleetos.nav.multiscreen', icon: LayoutGrid },
  { to: '/driver', labelKey: 'nav.driver', icon: Car },
  { to: '/customer', labelKey: 'nav.customer', icon: MapPinned },
]

/**
 * A small "out of universe" harness for demoing this prototype — deliberately
 * NOT styled like any of the three apps' own navigation, and collapsed by
 * default, so it never reads as part of the Admin Console / Driver App /
 * Customer App experience itself. Each app keeps its own real primary nav
 * (tab bars, headers); this is purely "jump to another app for the demo."
 */
export function DemoModeSwitcher() {
  const { t, lang, setLang } = useLang()
  const { lock } = useGatekeeper()
  const { startTour } = useDemoTourStore()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[950] sm:right-4 sm:top-4">
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          {/* Direct Interactive Demo Tour Pill */}
          <button
            type="button"
            onClick={() => startTour(0)}
            data-testid="interactive-tour-trigger-pill"
            className="flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-gradient-to-r from-cyan-950/90 via-indigo-950/90 to-purple-950/90 px-3 py-1.5 text-[11px] font-bold text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.3)] backdrop-blur-md transition hover:scale-105 hover:border-cyan-300 active:scale-95"
          >
            <Compass className="h-3.5 w-3.5 text-cyan-400 animate-spin-slow" />
            <span>{t('demo.startTourBtn')}</span>
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            data-testid="demo-switcher-toggle"
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/80 px-3 py-1.5 text-[11px] font-semibold text-slate-200 shadow-lg backdrop-blur-md transition hover:bg-slate-900"
          >
            {open ? <X className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5 text-cyan-300" />}
            {t('demo.switcherLabel')}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-64 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl"
              data-testid="demo-switcher-menu"
            >
              {/* Interactive Presentation Tour trigger in menu */}
              <div className="mb-1 rounded-xl bg-gradient-to-br from-cyan-950/60 to-blue-950/60 p-1.5 border border-cyan-400/30">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    startTour(0)
                  }}
                  data-testid="demo-menu-start-tour-btn"
                  className="flex w-full items-center justify-between gap-2 rounded-lg bg-cyan-500/20 px-2.5 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/30"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                    <span>{t('demo.startTourFull')}</span>
                  </div>
                  <span className="rounded bg-cyan-400/20 px-1 py-0.5 text-[9px] font-mono text-cyan-300">6 STEPS</span>
                </button>
              </div>

              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('demo.switcherHint')}</p>
              {APPS.map((item) => {
                const isActive =
                  item.to === '/'
                    ? location.pathname === '/'
                    : item.to === '/control'
                      ? location.pathname.startsWith('/control') || location.pathname.startsWith('/fleet-os')
                      : location.pathname.startsWith(item.to)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    data-testid={`demo-link-${item.to === '/' ? 'home' : item.to.slice(1)}`}
                    className={clsx(
                      'flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition',
                      isActive ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-300 hover:bg-white/5',
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" /> {t(item.labelKey)}
                  </Link>
                )
              })}

              {/* Lock System / 鎖定展示 Action Button */}
              <div className="mt-1 border-t border-white/10 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    lock()
                  }}
                  data-testid="gatekeeper-lock-system-btn"
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-400/10"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span>{t('gatekeeper.lockSystem')}</span>
                </button>
              </div>

              <div className="mt-1 flex items-center justify-between border-t border-white/10 px-2.5 pt-2">
                <span className="text-[10px] font-medium text-slate-500">{t('lang.switchLabel')}</span>
                <div
                  className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5"
                  role="group"
                  aria-label={t('lang.switchLabel')}
                  data-testid="language-switcher"
                >
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLang(l.code)}
                      data-testid={`lang-option-${l.code}`}
                      aria-pressed={lang === l.code}
                      className={clsx(
                        'relative rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
                        lang === l.code ? 'bg-cyan-300 text-mission-950' : 'text-slate-400 hover:text-slate-200',
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
