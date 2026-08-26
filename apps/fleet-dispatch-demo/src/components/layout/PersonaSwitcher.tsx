import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ClipboardList, Radar, Car, MapPinned } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '../../i18n'
import { LANGS } from '../../i18n/translations'

const ITEMS = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/booking', labelKey: 'nav.booking', icon: ClipboardList },
  { to: '/control', labelKey: 'nav.control', icon: Radar },
  { to: '/driver', labelKey: 'nav.driver', icon: Car },
  { to: '/customer', labelKey: 'nav.customer', icon: MapPinned },
]

export function PersonaSwitcher() {
  const { t, lang, setLang } = useLang()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[900] flex justify-center px-4">
      <div className="glass-panel pointer-events-auto flex items-center gap-1 rounded-2xl p-1.5 shadow-2xl">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              clsx(
                'relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm',
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="persona-pill"
                    className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-cyan-500/25 to-purple-500/25 ring-1 ring-cyan-400/30"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t(item.labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}

        <span className="mx-1 h-5 w-px shrink-0 bg-white/10" aria-hidden="true" />

        <div
          className="flex items-center gap-0.5 rounded-xl bg-white/5 p-0.5"
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
                'relative rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3',
                lang === l.code ? 'text-mission-950' : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {lang === l.code && (
                <motion.span
                  layoutId="lang-pill"
                  className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-cyan-300 to-purple-300"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
