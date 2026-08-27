import { motion } from 'framer-motion'
import { Home, ShieldCheck, Ticket, User } from 'lucide-react'
import { useLang } from '../../i18n'

export type CustomerTab = 'HOME' | 'TRIPS' | 'SAFETY' | 'ACCOUNT'

const TABS: { key: CustomerTab; icon: typeof Home; labelKey: string }[] = [
  { key: 'HOME', icon: Home, labelKey: 'customer.tab.home' },
  { key: 'TRIPS', icon: Ticket, labelKey: 'customer.tab.trips' },
  { key: 'SAFETY', icon: ShieldCheck, labelKey: 'customer.tab.safety' },
  { key: 'ACCOUNT', icon: User, labelKey: 'customer.tab.account' },
]

/** The Customer App's own primary navigation — a bright, consumer-grade
 * bottom tab bar (Home / Activity / Account), mirroring the IA used by
 * Taiwan ride-hailing apps like 55688 Taiwan Taxi and Uber Taiwan. Kept
 * visually distinct from the Driver App's dark tab bar and the Admin
 * Console's mission-control chrome so this reads as its own standalone app. */
export function CustomerTabBar({ active, onChange }: { active: CustomerTab; onChange: (tab: CustomerTab) => void }) {
  const { t } = useLang()
  return (
    <div className="fixed inset-x-0 bottom-0 z-[850] border-t border-slate-100 bg-white/95 shadow-[0_-8px_24px_-8px_rgba(15,23,42,0.08)] backdrop-blur-xl" data-testid="customer-tab-bar">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {TABS.map((tab) => {
          const isActive = tab.key === active
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              data-testid={`customer-tab-${tab.key.toLowerCase()}`}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-medium"
            >
              {isActive && (
                <motion.span
                  layoutId="customer-tab-pill"
                  className="absolute inset-x-3 top-0.5 h-0.5 rounded-full bg-blue-500"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <tab.icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
