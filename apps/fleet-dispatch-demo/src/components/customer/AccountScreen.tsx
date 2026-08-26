import type { ReactNode } from 'react'
import { Bell, ChevronRight, CreditCard, Globe2, HelpCircle, LogOut, Share2, ShieldCheck, User } from 'lucide-react'
import type { CustomerProfile, Order } from '../../types'
import { formatMonthYear, formatTWD } from '../../lib/format'
import { LANGS } from '../../i18n/translations'
import { useLang } from '../../i18n'
import clsx from 'clsx'

export function AccountScreen({
  profile,
  fallbackOrder,
  totalTrips,
  totalSpent,
  orders,
  onSelectOrder,
}: {
  profile: CustomerProfile | null
  fallbackOrder: Order
  totalTrips: number
  totalSpent: number
  orders: Order[]
  onSelectOrder: (id: string) => void
}) {
  const { t, lang, setLang } = useLang()
  const name = profile?.name ?? fallbackOrder.customer.name
  const phone = profile?.phone ?? fallbackOrder.customer.phone
  const email = profile?.email ?? fallbackOrder.customer.email
  const memberSince = profile?.memberSince ?? new Date(fallbackOrder.createdAt).toISOString()
  const sortedOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6" data-testid="customer-account-screen">
      <h1 className="text-xl font-bold text-slate-900">{t('customer.account.title')}</h1>

      <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 text-white">
            <User className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">
              {phone} · {email}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{t('customer.account.memberSince', { date: formatMonthYear(memberSince, lang) })}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-lg font-bold text-slate-800">{totalTrips}</p>
            <p className="text-[10.5px] text-slate-500">{t('customer.account.totalTrips', { n: totalTrips })}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-lg font-bold text-slate-800">{formatTWD(totalSpent)}</p>
            <p className="text-[10.5px] text-slate-500">{t('customer.account.totalSpent')}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
        <p className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('customer.account.settings')}</p>
        <SettingsRow icon={<CreditCard className="h-4 w-4" />} label={t('customer.account.paymentMethods')} hint={t('customer.account.paymentMethodsDesc')} />
        <SettingsRow
          icon={<Globe2 className="h-4 w-4" />}
          label={t('customer.account.language')}
          hint={
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5" data-testid="customer-language-switcher">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLang(l.code)
                  }}
                  data-testid={`customer-lang-${l.code}`}
                  className={clsx(
                    'rounded-md px-2 py-1 text-[11px] font-semibold transition',
                    lang === l.code ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          }
          noChevron
        />
        <SettingsRow icon={<Bell className="h-4 w-4" />} label={t('customer.account.support')} />
        <SettingsRow icon={<Share2 className="h-4 w-4" />} label={t('customer.account.shareApp')} />
        <SettingsRow icon={<HelpCircle className="h-4 w-4" />} label={t('customer.account.support')} last />
      </div>

      <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-semibold text-red-500 shadow-sm ring-1 ring-slate-100 hover:bg-red-50">
        <LogOut className="h-4 w-4" /> {t('customer.account.logout')}
      </button>

      <div className="rounded-2xl bg-white p-4 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> {t('customer.account.demoSwitch')}
        </p>
        <p className="mb-2 text-[11px] text-slate-500">{t('customer.account.demoSwitchHint')}</p>
        <select
          value={fallbackOrder.id}
          onChange={(e) => onSelectOrder(e.target.value)}
          data-testid="customer-account-order-select"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {sortedOrders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNo} · {o.customer.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function SettingsRow({
  icon,
  label,
  hint,
  last = false,
  noChevron = false,
}: {
  icon: ReactNode
  label: string
  hint?: ReactNode
  last?: boolean
  noChevron?: boolean
}) {
  return (
    <div className={clsx('flex items-center gap-3 px-4 py-3.5', !last && 'border-b border-slate-100')}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">{icon}</span>
      <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
      {typeof hint === 'string' ? <span className="text-xs text-slate-400">{hint}</span> : hint}
      {!noChevron && <ChevronRight className="h-4 w-4 text-slate-300" />}
    </div>
  )
}
