import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertOctagon, CalendarClock, CheckCircle2, ChevronDown, GitPullRequestArrow, PhoneCall, Radio } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { StatCard } from '../ui/StatCard'
import { Badge } from '../ui/Badge'
import { OrderTypeBadge, StatusBadge, TierBadge } from '../ui/OrderBadges'
import { formatClock, formatTWD } from '../../lib/format'
import type { Driver, Order, ShiftDay } from '../../types'
import { useLang } from '../../i18n'

type ShiftFilter = 'ALL' | 'DAY' | 'NIGHT'
type StatusFilter = 'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'ANOMALY'

const IN_PROGRESS_SET = new Set<Order['status']>(['ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'PASSENGER_ONBOARD'])

function todayShiftFor(driver: Driver, todayIso: string): ShiftDay | undefined {
  return driver.shiftSchedule.find((s) => s.date === todayIso)
}

/** 本日班表 (Today's Roster) — a driver-grouped view of today's jobs,
 * with reassignment/adjustment counters derived directly from the live
 * order/driver state (rather than a separate audit feed) so it always
 * matches what Fleet OS already knows. Mirrors the reference site's
 * shift-filter + status-filter + per-driver expandable job list. */
export function TodayRosterBoard() {
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const orders = useFleetStore((s) => s.orders)
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const rows = useMemo(() => {
    return drivers
      .map((driver) => {
        const shift = todayShiftFor(driver, todayIso)
        const jobs = orders
          .filter((o) => o.driverId === driver.id)
          .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
        const reassignedJobs = jobs.filter((o) => o.unresponsiveDriverIds.length > 0)
        const inProgressJobs = jobs.filter((o) => IN_PROGRESS_SET.has(o.status))
        const completedJobs = jobs.filter((o) => o.status === 'COMPLETED')
        const isUnresponsive = !!driver.unresponsiveFlagUntil && driver.unresponsiveFlagUntil > Date.now()
        return { driver, shift, jobs, reassignedJobs, inProgressJobs, completedJobs, isUnresponsive }
      })
      .filter((r) => r.shift?.shift !== 'OFF')
  }, [drivers, orders, todayIso])

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (shiftFilter !== 'ALL' && r.shift?.shift !== shiftFilter) return false
      if (statusFilter === 'IN_PROGRESS' && r.inProgressJobs.length === 0) return false
      if (statusFilter === 'COMPLETED' && r.completedJobs.length === 0) return false
      if (statusFilter === 'ANOMALY' && !r.isUnresponsive && r.reassignedJobs.length === 0) return false
      return true
    })
  }, [rows, shiftFilter, statusFilter])

  const dayCount = rows.filter((r) => r.shift?.shift === 'DAY').length
  const nightCount = rows.filter((r) => r.shift?.shift === 'NIGHT').length
  const onDutyTakingOrders = rows.filter((r) => r.driver.status === 'BUSY' || r.driver.status === 'PENDING_RESPONSE').length
  const totalJobs = rows.reduce((sum, r) => sum + r.jobs.length, 0)
  const completedTotal = rows.reduce((sum, r) => sum + r.completedJobs.length, 0)
  const reassignedTotal = rows.reduce((sum, r) => sum + r.reassignedJobs.length, 0)
  const adjustedTotal = rows.filter((r) => r.shift?.adjusted).length

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div data-testid="today-roster-board">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard icon={<CalendarClock className="h-4 w-4" />} label={t('fleetos.todayRoster.shiftsToday')} value={rows.length} tone="cyan" />
        <StatCard icon={<Radio className="h-4 w-4" />} label={t('fleetos.todayRoster.takingOrders')} value={onDutyTakingOrders} tone="purple" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label={t('fleetos.todayRoster.completed')} value={completedTotal} tone="lime" />
        <StatCard icon={<GitPullRequestArrow className="h-4 w-4" />} label={t('fleetos.todayRoster.reassigned')} value={reassignedTotal} tone="amber" />
        <StatCard icon={<AlertOctagon className="h-4 w-4" />} label={t('fleetos.todayRoster.adjustedShifts')} value={adjustedTotal} tone="pink" />
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-slate-500">
        {t('fleetos.todayRoster.shiftBreakdown', { day: dayCount, night: nightCount })} · {t('fleetos.todayRoster.totalJobsNote', { n: totalJobs })}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {(['ALL', 'DAY', 'NIGHT'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setShiftFilter(k)}
            data-testid={`today-roster-shift-filter-${k}`}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${shiftFilter === k ? 'bg-cyan-400/15 text-cyan-300' : 'text-slate-400 hover:bg-white/5'}`}
          >
            {t(`fleetos.todayRoster.shiftFilter.${k}`)}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-white/10" />
        {(['ALL', 'IN_PROGRESS', 'COMPLETED', 'ANOMALY'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setStatusFilter(k)}
            data-testid={`today-roster-status-filter-${k}`}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${statusFilter === k ? 'bg-purple-400/15 text-purple-300' : 'text-slate-400 hover:bg-white/5'}`}
          >
            {t(`fleetos.todayRoster.statusFilter.${k}`)}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-500" data-testid="today-roster-visible-count">
          {t('fleetos.todayRoster.visibleCount', { shown: filteredRows.length, total: rows.length })}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {filteredRows.map(({ driver, shift, jobs, reassignedJobs, inProgressJobs, isUnresponsive }) => {
          const isOpen = expanded.has(driver.id)
          return (
            <div key={driver.id} className="glass-panel overflow-hidden rounded-xl" data-testid="today-roster-driver-row">
              <button onClick={() => toggle(driver.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                <span className="text-base">{driver.avatarEmoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-slate-100">{lang === 'zh' ? driver.nameZh : driver.name}</span>
                    <TierBadge tier={driver.tier} />
                    {isUnresponsive && (
                      <Badge tone="red" pulse>
                        <AlertOctagon className="h-3 w-3" /> {t('fleetos.todayRoster.unresponsive')}
                      </Badge>
                    )}
                    {shift?.adjusted && <Badge tone="pink">{t('fleetos.todayRoster.adjusted')}</Badge>}
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-slate-500">
                    {t(`fleetos.todayRoster.shiftFilter.${shift?.shift ?? 'DAY'}`)} · {driver.phone}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[10.5px] text-slate-400">
                  {reassignedJobs.length > 0 && <Badge tone="amber">{t('fleetos.todayRoster.reassignedCount', { n: reassignedJobs.length })}</Badge>}
                  {inProgressJobs.length > 0 && <Badge tone="cyan">{t('fleetos.todayRoster.inProgressCount', { n: inProgressJobs.length })}</Badge>}
                  <span>{t('fleetos.todayRoster.totalJobsCount', { n: jobs.length })}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/5">
                    <div className="space-y-1.5 p-2.5" data-testid="today-roster-jobs-list">
                      {jobs.length === 0 && <p className="py-3 text-center text-[11px] text-slate-500">{t('fleetos.todayRoster.noJobs')}</p>}
                      {jobs.map((job) => {
                        const wasReassigned = job.unresponsiveDriverIds.length > 0
                        return (
                          <div key={job.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.02] px-2.5 py-2 text-[11px]" data-testid="today-roster-job-row">
                            <span className="font-mono text-slate-400">{formatClock(job.scheduledTime, lang)}</span>
                            <OrderTypeBadge type={job.type} />
                            <span className="text-slate-300">
                              {job.customer.name} · {job.passengers}
                              {lang === 'zh' ? '人' : ' pax'} · {job.orderNo}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-slate-500">
                              {lang === 'zh' ? job.pickup.nameZh : job.pickup.name} → {lang === 'zh' ? job.dropoff.nameZh : job.dropoff.name}
                              {job.waypoints.length > 0 && ` (${t('fleetos.todayRoster.viaStops', { n: job.waypoints.length })})`}
                            </span>
                            {wasReassigned && <Badge tone="amber">{t('fleetos.todayRoster.reassignedTag')}</Badge>}
                            <StatusBadge status={job.status} />
                            <span className="font-semibold text-slate-300">{formatTWD(job.priceEstimate)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
        {filteredRows.length === 0 && (
          <p className="glass-panel rounded-xl p-8 text-center text-xs text-slate-500" data-testid="today-roster-empty">
            <PhoneCall className="mx-auto mb-2 h-5 w-5 text-slate-600" /> {t('fleetos.todayRoster.emptyFiltered')}
          </p>
        )}
      </div>
    </div>
  )
}
