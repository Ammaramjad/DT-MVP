import { useMemo, useState } from 'react'
import { ListChecks, MessageSquareWarning, Search } from 'lucide-react'
import type { Driver, Order } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { StatusBadge, OrderTypeBadge } from '../ui/OrderBadges'
import { formatDateTime, formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

/** Full, searchable job history for the signed-in driver — the Driver
 * App's "Activity" tab, listing every order ever assigned to them in this
 * session (live + seeded), most recent first, with a receipt search and a
 * per-trip issue-reporting action (client brief: "driver trip history with
 * searchable receipts and issue reporting"). */
export function ActivityScreen({ driver, orders }: { driver: Driver; orders: Order[] }) {
  const { t, lang } = useLang()
  const createSupportTicket = useFleetStore((s) => s.createSupportTicket)
  const [query, setQuery] = useState('')
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())

  const jobs = useMemo(() => orders.filter((o) => o.driverId === driver.id).sort((a, b) => b.createdAt - a.createdAt), [orders, driver.id])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter((job) => job.orderNo.toLowerCase().includes(q) || job.pickup.name.toLowerCase().includes(q) || job.dropoff.name.toLowerCase().includes(q) || job.pickup.nameZh.includes(q) || job.dropoff.nameZh.includes(q))
  }, [jobs, query])

  return (
    <div className="mx-auto max-w-md px-4 pb-6" data-testid="driver-activity-screen">
      <div className="glass-panel rounded-2xl p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <ListChecks className="h-3.5 w-3.5" /> {t('driver.activity.title')}
        </p>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('driver.activity.searchPlaceholder')}
            data-testid="driver-activity-search"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
          />
        </div>
        {filtered.length === 0 && <p className="p-6 text-center text-xs text-slate-500">{t('driver.noJobsToday')}</p>}
        <div className="space-y-2">
          {filtered.map((job) => (
            <div key={job.id} className="rounded-xl bg-white/[0.03] p-3" data-testid="driver-activity-job-row">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-200">{job.orderNo}</span>
                <StatusBadge status={job.status} />
              </div>
              <p className="mt-1.5 truncate text-xs text-slate-400">
                {(lang === 'zh' ? job.pickup.nameZh : job.pickup.name)} → {(lang === 'zh' ? job.dropoff.nameZh : job.dropoff.name)}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <OrderTypeBadge type={job.type} />
                <span>{formatDateTime(job.scheduledTime, lang)}</span>
                <span className="font-semibold text-slate-300">{formatTWD(job.priceEstimate)}</span>
              </div>
              {job.status === 'COMPLETED' && (
                <div className="mt-2 flex justify-end">
                  {reportedIds.has(job.id) ? (
                    <span className="text-[10.5px] font-medium text-cyan-300">{t('driver.activity.issueReported')}</span>
                  ) : (
                    <button
                      onClick={() => {
                        createSupportTicket(job.id, job.customer.name, t('driver.activity.issueSubject', { orderNo: job.orderNo }), 'Driver Operations')
                        setReportedIds((prev) => new Set(prev).add(job.id))
                      }}
                      data-testid="driver-activity-report-issue"
                      className="flex items-center gap-1 text-[10.5px] font-medium text-slate-400 hover:text-amber-300"
                    >
                      <MessageSquareWarning className="h-3 w-3" /> {t('driver.activity.reportIssue')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
