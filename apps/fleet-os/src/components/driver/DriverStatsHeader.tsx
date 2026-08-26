import { motion } from 'framer-motion'
import { CheckCircle2, TrendingUp, XCircle } from 'lucide-react'
import type { DriverStats } from '../../types'
import { StatCounter } from '../ui/StatCounter'
import { useLang } from '../../i18n'

export function DriverStatsHeader({ stats }: { stats: DriverStats }) {
  const { t } = useLang()
  const resolvedAllTime = stats.acceptedAllTime + stats.declinedAllTime + stats.missedAllTime
  const completionRate = resolvedAllTime === 0 ? 100 : Math.round((stats.acceptedAllTime / resolvedAllTime) * 100)

  return (
    <div className="glass-panel rounded-2xl p-3.5" data-testid="driver-stats-header">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t('driver.myStats')}</p>
        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-300">
          <TrendingUp className="h-3 w-3" /> {t('driver.completion', { n: completionRate })}
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/[0.03] p-2">
          <p className="text-lg font-bold text-cyan-300">
            <StatCounter value={stats.totalToday} />
          </p>
          <p className="text-[10px] text-slate-500">{t('driver.today')}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-2">
          <p className="text-lg font-bold text-purple-300">
            <StatCounter value={stats.totalWeek} />
          </p>
          <p className="text-[10px] text-slate-500">{t('driver.thisWeek')}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-2">
          <p className="text-lg font-bold text-slate-200">
            <StatCounter value={stats.totalAllTime} />
          </p>
          <p className="text-[10px] text-slate-500">{t('driver.allTime')}</p>
        </div>
      </div>
      <motion.div layout className="mt-2.5 flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-[11px]">
        <span className="flex items-center gap-1.5 text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" /> {t('driver.acceptedToday', { n: stats.acceptedToday })}
        </span>
        <span className="flex items-center gap-1.5 text-red-300">
          <XCircle className="h-3.5 w-3.5" /> {t('driver.declinedMissedToday', { n: stats.declinedToday + stats.missedToday })}
        </span>
      </motion.div>
    </div>
  )
}
