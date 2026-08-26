import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownRight, ArrowUpRight, DollarSign, PieChart as PieIcon, TrendingUp } from 'lucide-react'
import {
  aggregateSeries,
  buildDailyAnalytics,
  buildOrderTypeBreakdown,
  buildVehicleBreakdown,
  buildWeekComparison,
  completionRateSeries,
  type Granularity,
} from '../../lib/analytics'
import { VEHICLE_CATALOG } from '../../data/vehicleCatalog'
import { formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

const VEHICLE_COLOR: Record<string, string> = {
  SEDAN: '#22d3ee',
  SUV: '#a855f7',
  VAN: '#fbbf24',
  LUXURY: '#f472b6',
  MINIBUS: '#a3e635',
}

const ORDER_TYPE_COLOR: Record<string, string> = {
  AIRPORT_PICKUP: '#22d3ee',
  AIRPORT_DROPOFF: '#a855f7',
  TOUR_CHARTER: '#a3e635',
}

const GRANULARITIES: Granularity[] = ['daily', 'weekly', 'monthly']

const TOOLTIP_STYLE = {
  background: 'rgba(10,14,30,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#e7e9f5',
  fontSize: 12,
}

function ChipRow({ options, value, onChange, labelFor }: { options: string[]; value: string; onChange: (v: string) => void; labelFor: (v: string) => string }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          data-testid={`analytics-granularity-${opt}`}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
            value === opt ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {labelFor(opt)}
        </button>
      ))}
    </div>
  )
}

export function AnalyticsDashboard() {
  const { t } = useLang()
  const [granularity, setGranularity] = useState<Granularity>('daily')

  const daily = useMemo(() => buildDailyAnalytics(90), [])
  const series = useMemo(() => aggregateSeries(daily, granularity), [daily, granularity])
  const vehicleBreakdown = useMemo(() => buildVehicleBreakdown(daily), [daily])
  const orderTypeBreakdown = useMemo(() => buildOrderTypeBreakdown(daily), [daily])
  const completionSeries = useMemo(() => completionRateSeries(daily).slice(-30), [daily])
  const weekComparison = useMemo(() => buildWeekComparison(daily), [daily])

  const granularityLabel = (g: string) => t(`analytics.granularity.${g}`)

  return (
    <div className="space-y-4" data-testid="analytics-dashboard">
      {/* Week-over-week comparison strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <ComparisonCard
          label={t('analytics.thisWeekRevenue')}
          value={formatTWD(weekComparison.thisWeek.revenue)}
          deltaPct={weekComparison.revenueDeltaPct}
        />
        <ComparisonCard
          label={t('analytics.thisWeekOrders')}
          value={String(weekComparison.thisWeek.orders)}
          deltaPct={weekComparison.ordersDeltaPct}
        />
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-[11px] font-medium text-slate-400">{t('analytics.lastWeekRevenue')}</p>
          <p className="mt-1.5 text-xl font-bold text-slate-300">{formatTWD(weekComparison.lastWeek.revenue)}</p>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-[11px] font-medium text-slate-400">{t('analytics.lastWeekOrders')}</p>
          <p className="mt-1.5 text-xl font-bold text-slate-300">{weekComparison.lastWeek.orders}</p>
        </div>
      </div>

      {/* Revenue over time */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <DollarSign className="h-3.5 w-3.5 text-emerald-300" /> {t('analytics.revenueOverTime')}
          </p>
          <ChipRow options={GRANULARITIES} value={granularity} onChange={(v) => setGranularity(v as Granularity)} labelFor={granularityLabel} />
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatTWD(v)} labelStyle={{ color: '#94a3b8' }} />
              <Area type="monotone" dataKey="revenue" name={t('analytics.revenue')} stroke="#22d3ee" strokeWidth={2} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Order volume trend */}
        <div className="glass-panel rounded-2xl p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <TrendingUp className="h-3.5 w-3.5 text-purple-300" /> {t('analytics.orderVolumeTrend')}
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#94a3b8' }} />
                <Bar dataKey="completed" name={t('analytics.completed')} stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled" name={t('analytics.cancelled')} stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion / cancellation rate trend */}
        <div className="glass-panel rounded-2xl p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <TrendingUp className="h-3.5 w-3.5 text-lime-300" /> {t('analytics.completionTrend')}
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={36} domain={[0, 100]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#94a3b8' }} formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Line type="monotone" dataKey="completionRate" name={t('analytics.completionRate')} stroke="#a3e635" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cancellationRate" name={t('analytics.cancellationRate')} stroke="#f87171" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Breakdown by vehicle type */}
        <div className="glass-panel rounded-2xl p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <PieIcon className="h-3.5 w-3.5 text-amber-300" /> {t('analytics.byVehicleType')}
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <div className="h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={vehicleBreakdown} dataKey="revenue" nameKey="type" innerRadius={42} outerRadius={72} paddingAngle={2}>
                    {vehicleBreakdown.map((entry) => (
                      <Cell key={entry.type} fill={VEHICLE_COLOR[entry.type]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatTWD(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {vehicleBreakdown.map((entry) => (
                <div key={entry.type} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-2 w-2 rounded-full" style={{ background: VEHICLE_COLOR[entry.type] }} />
                    {VEHICLE_CATALOG[entry.type].brand} {VEHICLE_CATALOG[entry.type].model}
                  </span>
                  <span className="font-medium text-slate-400">{formatTWD(entry.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Breakdown by order type */}
        <div className="glass-panel rounded-2xl p-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <PieIcon className="h-3.5 w-3.5 text-cyan-300" /> {t('analytics.byOrderType')}
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderTypeBreakdown} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis
                  type="category"
                  dataKey="type"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                  tickFormatter={(v: string) => t(`type.${v}`).split(' · ')[0]}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => formatTWD(v)} />
                <Bar dataKey="revenue" name={t('analytics.revenue')} radius={[0, 6, 6, 0]}>
                  {orderTypeBreakdown.map((entry) => (
                    <Cell key={entry.type} fill={ORDER_TYPE_COLOR[entry.type]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-500">{t('analytics.footerNote')}</p>
    </div>
  )
}

function ComparisonCard({ label, value, deltaPct }: { label: string; value: string; deltaPct: number }) {
  const positive = deltaPct >= 0
  return (
    <motion.div layout className="glass-panel rounded-2xl p-4">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-xl font-bold text-white">{value}</p>
        <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${positive ? 'bg-emerald-400/15 text-emerald-300' : 'bg-red-400/15 text-red-300'}`}>
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(deltaPct)}%
        </span>
      </div>
    </motion.div>
  )
}
