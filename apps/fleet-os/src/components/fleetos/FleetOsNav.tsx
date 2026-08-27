import { NavLink } from 'react-router-dom'
import {
  BadgeDollarSign,
  Car,
  ClipboardEdit,
  Gauge,
  Headset,
  LayoutGrid,
  Languages,
  Package,
  Plane,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Truck,
  Users2,
} from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '../../i18n'

/**
 * Module switcher for the Fleet OS "advanced desktop command center" — a
 * persistent sticky strip of every module named in the client brief so the
 * whole surface reads as one cohesive back-office product rather than a set
 * of disconnected pages. Reused at the top of every /fleet-os/* screen.
 */
const MODULES = [
  { to: '/fleet-os', end: true, labelKey: 'fleetos.nav.dashboard', icon: Gauge },
  { to: '/fleet-os/suppliers', labelKey: 'fleetos.nav.suppliers', icon: Truck },
  { to: '/fleet-os/catalog', labelKey: 'fleetos.nav.catalog', icon: Package },
  { to: '/fleet-os/pricing/dynamic', labelKey: 'fleetos.nav.pricingDynamic', icon: Gauge },
  { to: '/fleet-os/vehicles', labelKey: 'fleetos.nav.vehicles', icon: Car },
  { to: '/fleet-os/campaigns', labelKey: 'fleetos.nav.campaigns', icon: Sparkles },
  { to: '/fleet-os/support', labelKey: 'fleetos.nav.support', icon: Headset },
  { to: '/fleet-os/refunds', labelKey: 'fleetos.nav.refunds', icon: ReceiptText },
  { to: '/fleet-os/roster', labelKey: 'fleetos.nav.roster', icon: Users2 },
  { to: '/fleet-os/compliance', labelKey: 'fleetos.nav.compliance', icon: ShieldCheck },
  { to: '/fleet-os/finance', labelKey: 'fleetos.nav.finance', icon: BadgeDollarSign },
  { to: '/fleet-os/reports', labelKey: 'fleetos.nav.reports', icon: LayoutGrid },
  { to: '/fleet-os/manual-order', labelKey: 'fleetos.nav.manualOrder', icon: ClipboardEdit },
  { to: '/fleet-os/translation-qa', labelKey: 'fleetos.nav.translationQa', icon: Languages },
  { to: '/fleet-os/flights', labelKey: 'fleetos.nav.flights', icon: Plane },
  { to: '/fleet-os/accounts', labelKey: 'fleetos.nav.accounts', icon: Headset },
  { to: '/fleet-os/params', labelKey: 'fleetos.nav.params', icon: Settings2 },
  { to: '/fleet-os/access-logs', labelKey: 'fleetos.nav.accessLogs', icon: ShieldCheck },
  { to: '/fleet-os/admin', labelKey: 'fleetos.nav.admin', icon: ShieldCheck },
]

export function FleetOsNav() {
  const { t } = useLang()
  return (
    <div className="sticky top-[64px] z-[600] -mx-4 mb-4 overflow-x-auto border-b border-white/10 bg-slate-950/85 px-4 py-2.5 backdrop-blur-2xl shadow-xl sm:-mx-6 sm:px-6" data-testid="fleetos-nav">
      <div className="flex items-center gap-1.5">
        {MODULES.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.end}
            data-testid={`fleetos-nav-${m.to.split('/').pop()}`}
            className={({ isActive }) =>
              clsx(
                'flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                  : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-slate-200',
              )
            }
          >
            <m.icon className="h-3.5 w-3.5" /> {t(m.labelKey)}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
