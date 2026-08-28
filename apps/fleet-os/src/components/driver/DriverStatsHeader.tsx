import { motion } from 'framer-motion'
import { CheckCircle2, TrendingUp, XCircle, Zap } from 'lucide-react'
import type { DriverStats } from '../../types'
import { StatCounter } from '../ui/StatCounter'
import { useLang } from '../../i18n'

export function DriverStatsHeader({ stats }: { stats: DriverStats }) {
  const { t } = useLang()
  const resolvedAllTime = stats.acceptedAllTime + stats.declinedAllTime + stats.missedAllTime
  const completionRate = resolvedAllTime === 0 ? 100 : Math.round((stats.acceptedAllTime / resolvedAllTime) * 100)

  return (
    <div className="glass-panel-glow rounded-3xl p-4 shadow-2xl backdrop-blur-2xl" data-testid="driver-stats-header">
      <div className="flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-cyan-400">
          <Zap className="h-3 w-3" /> {t('driver.myStats')}
        </p>
        <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-300">
          <TrendingUp className="h-3 w-3" /> {t('driver.completion', { n: completionRate })}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-2.5">
          <p className="text-xl font-black text-cyan-300">
            <StatCounter value={stats.totalToday} />
          </p>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{t('driver.today')}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-2.5">
          <p className="text-xl font-black text-purple-300">
            <StatCounter value={stats.totalWeek} />
          </p>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{t('driver.thisWeek')}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-2.5">
          <p className="text-xl font-black text-slate-100">
            <StatCounter value={stats.totalAllTime} />
          </p>
          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{t('driver.allTime')}</p>
        </div>
      </div>
      <motion.div layout className="mt-3 flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950/40 px-3.5 py-2 text-[11px] font-semibold">
        <span className="flex items-center gap-1.5 text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" /> {t('driver.acceptedToday', { n: stats.acceptedToday })}
        </span>
        <span className="flex items-center gap-1.5 text-rose-300">
          <XCircle className="h-3.5 w-3.5" /> {t('driver.declinedMissedToday', { n: stats.declinedToday + stats.missedToday })}
        </span>
      </motion.div>
    </div>
  )
}
