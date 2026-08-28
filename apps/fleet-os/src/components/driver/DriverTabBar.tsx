import { motion } from 'framer-motion'
import { Activity, Home, MessageSquare, User, Wallet } from 'lucide-react'
import { useLang } from '../../i18n'

export type DriverTab = 'HOME' | 'EARNINGS' | 'ACTIVITY' | 'MESSENGER' | 'ACCOUNT'

const TABS: { key: DriverTab; icon: typeof Home; labelKey: string }[] = [
  { key: 'HOME', icon: Home, labelKey: 'driver.tab.home' },
  { key: 'EARNINGS', icon: Wallet, labelKey: 'driver.tab.earnings' },
  { key: 'ACTIVITY', icon: Activity, labelKey: 'driver.tab.activity' },
  { key: 'MESSENGER', icon: MessageSquare, labelKey: 'driver.tab.messenger' },
  { key: 'ACCOUNT', icon: User, labelKey: 'driver.tab.account' },
]

/** The Driver App's own primary navigation — a real bottom tab bar, distinct
 * from (and rendered independently of) the demo-only cross-app switcher, so
 * this screen reads like a genuine standalone mobile app. */
export function DriverTabBar({ active, onChange }: { active: DriverTab; onChange: (tab: DriverTab) => void }) {
  const { t } = useLang()
  return (
    <div className="fixed inset-x-0 bottom-0 z-[850] border-t border-white/10 bg-mission-950/95 backdrop-blur-xl" data-testid="driver-tab-bar">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {TABS.map((tab) => {
          const isActive = tab.key === active
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              data-testid={`driver-tab-${tab.key.toLowerCase()}`}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-medium"
            >
              {isActive && (
                <motion.span
                  layoutId="driver-tab-pill"
                  className="absolute inset-x-3 top-0.5 h-0.5 rounded-full bg-cyan-400"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <tab.icon className={`h-5 w-5 ${isActive ? 'text-cyan-300' : 'text-slate-500'}`} />
              <span className={isActive ? 'text-cyan-300' : 'text-slate-500'}>{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
