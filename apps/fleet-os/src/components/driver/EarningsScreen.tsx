import { useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Award, Clock3, Coins, Download, Gauge, Percent, ShieldX, Star, Wallet } from 'lucide-react'
import type { Driver } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { buildDriverEarnings } from '../../lib/earnings'
import { formatTWD } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { InstantCashoutModal } from './DriverCockpitWidgets'
import { useLang } from '../../i18n'

const TOOLTIP_STYLE = {
  background: 'rgba(10,14,30,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#e7e9f5',
  fontSize: 12,
}

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'ALLTIME'

const PAYOUT_TONE: Record<string, 'lime' | 'amber' | 'cyan'> = { PAID: 'lime', PROCESSING: 'cyan', PENDING: 'amber' }

export function EarningsScreen({ driver }: { driver: Driver }) {
  const { t, lang } = useLang()
  const payouts = useFleetStore((s) => s.payouts)
  const earnings = useMemo(() => buildDriverEarnings(driver, lang), [driver, lang])
  const [period, setPeriod] = useState<Period>('WEEK')
  const [showCashoutModal, setShowCashoutModal] = useState(false)

  const driverPayouts = useMemo(() => payouts.filter((p) => p.driverId === driver.id).slice(0, 3), [payouts, driver.id])

  const headline = period === 'TODAY' ? earnings.today : period === 'WEEK' ? earnings.week : period === 'MONTH' ? earnings.month : earnings.allTime

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6" data-testid="driver-earnings-screen">
      <InstantCashoutModal isOpen={showCashoutModal} onClose={() => setShowCashoutModal(false)} driver={driver} />

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['TODAY', 'WEEK', 'MONTH', 'ALLTIME'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            data-testid={`earnings-period-${p.toLowerCase()}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              period === p ? 'bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40' : 'bg-white/5 text-slate-400'
            }`}
          >
            {t(`driver.earnings.period.${p}`)}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-5 text-center relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Wallet className="h-3.5 w-3.5 text-emerald-300" /> {t(`driver.earnings.period.${period}`)}
          </p>
          <button
            onClick={() => setShowCashoutModal(true)}
            data-testid="instant-cashout-trigger-btn"
            className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition"
          >
            <Coins className="h-3.5 w-3.5" />
            <span>{t('driver.cashout.btnLabel')}</span>
          </button>
        </div>
        <p className="mt-1 text-4xl font-black text-emerald-300">{formatTWD(headline)}</p>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400 border-t border-white/5 pt-2">
          <span>{t('driver.earnings.tripsCount', { n: earnings.tripsToday })}</span>
          <span className="font-mono text-emerald-400 font-semibold">Wallet: {formatTWD(driver.walletBalance ?? 12800)}</span>
        </div>
      </div>

      {/* Incentives / tips / adjustments / commission breakdown */}
      <div className="glass-panel rounded-2xl p-4" data-testid="driver-earnings-breakdown">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('driver.earnings.weeklyBreakdown')}</p>
        <dl className="space-y-1.5 text-xs text-slate-300">
          <div className="flex justify-between">
            <dt>{t('driver.earnings.baseFares')}</dt>
            <dd>{formatTWD(earnings.week)}</dd>
          </div>
          <div className="flex justify-between text-emerald-300">
            <dt>{t('driver.earnings.incentives')}</dt>
            <dd>+{formatTWD(earnings.incentives)}</dd>
          </div>
          <div className="flex justify-between text-emerald-300">
            <dt>{t('driver.earnings.tips')}</dt>
            <dd>+{formatTWD(earnings.tips)}</dd>
          </div>
          <div className={`flex justify-between ${earnings.adjustments < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
            <dt>{t('driver.earnings.adjustments')}</dt>
            <dd>{earnings.adjustments >= 0 ? '+' : ''}{formatTWD(earnings.adjustments)}</dd>
          </div>
          <div className="flex justify-between text-red-300">
            <dt>{t('driver.earnings.cancellationFees')}</dt>
            <dd>-{formatTWD(earnings.cancellationDeduction)}</dd>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-1.5 font-medium text-slate-100">
            <dt>{t('driver.earnings.gross')}</dt>
            <dd>{formatTWD(earnings.grossEarnings)}</dd>
          </div>
          <div className="flex justify-between text-slate-400">
            <dt>{t('driver.earnings.platformCommission')}</dt>
            <dd>-{formatTWD(earnings.platformCommission)}</dd>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-1.5 text-sm font-bold text-emerald-300">
            <dt>{t('driver.earnings.net')}</dt>
            <dd>{formatTWD(earnings.netEarnings)}</dd>
          </div>
        </dl>
      </div>

      {/* Ride-type breakdown */}
      <div className="glass-panel rounded-2xl p-4" data-testid="driver-earnings-ride-type">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('driver.earnings.byRideType')}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/[0.03] p-2.5">
            <p className="text-sm font-bold text-cyan-300">{formatTWD(earnings.breakdown.airport)}</p>
            <p className="text-[10px] text-slate-500">{t('driver.earnings.airportTransfer')}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-2.5">
            <p className="text-sm font-bold text-purple-300">{formatTWD(earnings.breakdown.city)}</p>
            <p className="text-[10px] text-slate-500">{t('driver.earnings.cityRide')}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] p-2.5">
            <p className="text-sm font-bold text-lime-300">{formatTWD(earnings.breakdown.charter)}</p>
            <p className="text-[10px] text-slate-500">{t('driver.earnings.charter')}</p>
          </div>
        </div>
      </div>

      {/* Performance metrics */}
      <div className="glass-panel grid grid-cols-2 gap-2.5 rounded-2xl p-4" data-testid="driver-earnings-performance">
        <PerfStat icon={<Clock3 className="h-3.5 w-3.5" />} label={t('driver.earnings.hoursOnline')} value={`${earnings.hoursOnline}h`} />
        <PerfStat icon={<Gauge className="h-3.5 w-3.5" />} label={t('driver.earnings.utilization')} value={`${earnings.utilizationPct}%`} />
        <PerfStat icon={<Percent className="h-3.5 w-3.5" />} label={t('driver.earnings.acceptanceRate')} value={`${Math.round((driver.stats.acceptedAllTime / Math.max(1, driver.stats.acceptedAllTime + driver.stats.declinedAllTime + driver.stats.missedAllTime)) * 100)}%`} />
        <PerfStat icon={<ShieldX className="h-3.5 w-3.5" />} label={t('driver.earnings.cancellationRate')} value={`${earnings.cancellationRatePct}%`} />
        <PerfStat icon={<Star className="h-3.5 w-3.5" />} label={t('driver.earnings.customerRating')} value={driver.rating.toFixed(1)} />
        <PerfStat icon={<Award className="h-3.5 w-3.5" />} label={t('driver.earnings.serviceQuality')} value={`${earnings.serviceQualityScore}/100`} />
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

      {/* Payout status — sourced from Fleet OS Finance/Settlement */}
      <div className="glass-panel rounded-2xl p-4" data-testid="driver-earnings-payouts">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('driver.earnings.payoutStatus')}</p>
          <button className="flex items-center gap-1 text-[11px] font-medium text-cyan-300" data-testid="driver-earnings-download-statement">
            <Download className="h-3 w-3" /> {t('driver.earnings.downloadStatement')}
          </button>
        </div>
        <div className="space-y-2">
          {driverPayouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-xs">
              <div>
                <p className="font-medium text-slate-200">{p.period}</p>
                <p className="text-slate-500">{formatTWD(p.netAmount)} · {p.method}</p>
              </div>
              <Badge tone={PAYOUT_TONE[p.status] ?? 'amber'}>{t(`fleetos.finance.status.${p.status}`)}</Badge>
            </div>
          ))}
          {driverPayouts.length === 0 && <p className="py-2 text-center text-[11px] text-slate-500">{t('driver.earnings.noPayouts')}</p>}
        </div>
      </div>
    </div>
  )
}

function PerfStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-2.5">
      <p className="flex items-center gap-1 text-[10px] text-slate-500">
        {icon} {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-100">{value}</p>
    </div>
  )
}
