import { useMemo } from 'react'
import { ListChecks } from 'lucide-react'
import type { Driver, Order } from '../../types'
import { StatusBadge, OrderTypeBadge } from '../ui/OrderBadges'
import { formatDateTime, formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

/** Full job history for the signed-in driver — the Driver App's "Activity"
 * tab, listing every order ever assigned to them in this session (live +
 * seeded), most recent first. */
export function ActivityScreen({ driver, orders }: { driver: Driver; orders: Order[] }) {
  const { t, lang } = useLang()
  const jobs = useMemo(() => orders.filter((o) => o.driverId === driver.id).sort((a, b) => b.createdAt - a.createdAt), [orders, driver.id])

  return (
    <div className="mx-auto max-w-md px-4 pb-6" data-testid="driver-activity-screen">
      <div className="glass-panel rounded-2xl p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <ListChecks className="h-3.5 w-3.5" /> {t('driver.activity.title')}
        </p>
        {jobs.length === 0 && <p className="p-6 text-center text-xs text-slate-500">{t('driver.noJobsToday')}</p>}
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-xl bg-white/[0.03] p-3">
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
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
