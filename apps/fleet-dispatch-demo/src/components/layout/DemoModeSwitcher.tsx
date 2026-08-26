import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Car, ClipboardList, Home as HomeIcon, LayoutGrid, MapPinned, Radar, X } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '../../i18n'
import { LANGS } from '../../i18n/translations'

const APPS = [
  { to: '/', labelKey: 'nav.home', icon: HomeIcon },
  { to: '/booking', labelKey: 'nav.booking', icon: ClipboardList },
  { to: '/control', labelKey: 'nav.control', icon: Radar },
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
  const location = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[950] sm:right-4 sm:top-4">
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          data-testid="demo-switcher-toggle"
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/80 px-3 py-1.5 text-[11px] font-semibold text-slate-200 shadow-lg backdrop-blur-md transition hover:bg-slate-900"
        >
          {open ? <X className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5 text-cyan-300" />}
          {t('demo.switcherLabel')}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-60 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl"
              data-testid="demo-switcher-menu"
            >
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t('demo.switcherHint')}</p>
              {APPS.map((item) => {
                const isActive = location.pathname === item.to
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

              <div className="mt-1.5 flex items-center justify-between border-t border-white/10 px-2.5 pt-2">
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
