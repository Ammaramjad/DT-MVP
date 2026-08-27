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

export function CustomerTabBar({ active, onChange }: { active: CustomerTab; onChange: (tab: CustomerTab) => void }) {
  const { t } = useLang()
  return (
    <div className="fixed inset-x-0 bottom-0 z-[850] border-t border-white/10 bg-slate-950/90 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl" data-testid="customer-tab-bar">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-3">
        {TABS.map((tab) => {
          const isActive = tab.key === active
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              data-testid={`customer-tab-${tab.key.toLowerCase()}`}
              className="relative flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-semibold transition"
            >
              {isActive && (
                <motion.span
                  layoutId="customer-tab-pill"
                  className="absolute inset-x-4 top-0 h-[2.5px] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <tab.icon className={`h-5 w-5 transition ${isActive ? 'text-cyan-300 scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-slate-400 hover:text-slate-200'}`} />
              <span className={isActive ? 'text-cyan-300 font-bold' : 'text-slate-400'}>{t(tab.labelKey)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
