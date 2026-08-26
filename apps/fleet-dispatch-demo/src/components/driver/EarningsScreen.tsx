import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Wallet } from 'lucide-react'
import type { Driver } from '../../types'
import { buildDriverEarnings } from '../../lib/earnings'
import { formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

const TOOLTIP_STYLE = {
  background: 'rgba(10,14,30,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#e7e9f5',
  fontSize: 12,
}

/** Uber-driver-earnings-screen-style breakdown: today / this week / all-time
 * totals plus a 7-day bar chart, all derived from the driver's existing
 * `DriverStats` trip counts (see src/lib/earnings.ts). */
export function EarningsScreen({ driver }: { driver: Driver }) {
  const { t, lang } = useLang()
  const earnings = useMemo(() => buildDriverEarnings(driver, lang), [driver, lang])

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6" data-testid="driver-earnings-screen">
      <div className="glass-panel rounded-2xl p-5 text-center">
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Wallet className="h-3.5 w-3.5 text-emerald-300" /> {t('driver.earnings.today')}
        </p>
        <p className="mt-1 text-4xl font-black text-emerald-300">{formatTWD(earnings.today)}</p>
        <p className="mt-1 text-xs text-slate-500">{t('driver.earnings.tripsCount', { n: earnings.tripsToday })}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-[11px] font-medium text-slate-400">{t('driver.earnings.thisWeek')}</p>
          <p className="mt-1 text-xl font-bold text-white">{formatTWD(earnings.week)}</p>
          <p className="mt-0.5 text-[10.5px] text-slate-500">{t('driver.earnings.tripsCount', { n: earnings.tripsWeek })}</p>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-[11px] font-medium text-slate-400">{t('driver.earnings.allTime')}</p>
          <p className="mt-1 text-xl font-bold text-white">{formatTWD(earnings.allTime)}</p>
          <p className="mt-0.5 text-[10.5px] text-slate-500">{t('driver.earnings.avgPerTrip', { amount: formatTWD(earnings.avgPerTrip) })}</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('driver.earnings.last7Days')}</p>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={earnings.last7Days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatTWD(v)} />
              <Bar dataKey="earnings" radius={[6, 6, 0, 0]} fill="#34d399" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
