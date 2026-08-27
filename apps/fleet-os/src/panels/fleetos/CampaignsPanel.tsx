import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pause, Play, Sparkles, Tag, TrendingUp } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { useLang } from '../../i18n'

const STATUS_TONE = { ACTIVE: 'green', SCHEDULED: 'cyan', ENDED: 'slate', PAUSED: 'amber' } as const

export default function CampaignsPanel() {
  const { t, lang } = useLang()
  const campaigns = useFleetStore((s) => s.campaigns)
  const setCampaignStatus = useFleetStore((s) => s.setCampaignStatus)
  const [selected, setSelected] = useState<string | null>(campaigns[0]?.id ?? null)

  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length
  const totalUsage = campaigns.reduce((sum, c) => sum + c.usedCount, 0)

  return (
    <FleetOsPage title={t('fleetos.campaigns.title')} subtitle={t('fleetos.campaigns.subtitle')} icon={<Sparkles className="h-5 w-5" />}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Sparkles className="h-4 w-4" />} label={t('fleetos.campaigns.active')} value={activeCampaigns} tone="lime" />
        <StatCard icon={<Tag className="h-4 w-4" />} label={t('fleetos.campaigns.total')} value={campaigns.length} tone="cyan" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label={t('fleetos.campaigns.totalUsage')} value={totalUsage} tone="purple" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="campaigns-grid">
        {campaigns.map((c) => {
          const usagePct = Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100))
          return (
            <motion.div
              layout
              key={c.id}
              onClick={() => setSelected(c.id)}
              data-testid="campaign-card"
              className={`glass-panel cursor-pointer rounded-2xl p-4 transition ${selected === c.id ? 'ring-1 ring-cyan-400/40' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-bold text-cyan-300">{c.code}</p>
                  <p className="text-xs text-slate-400">{lang === 'zh' ? c.nameZh : c.name}</p>
                </div>
                <Badge tone={STATUS_TONE[c.status]}>{t(`fleetos.campaigns.status.${c.status}`)}</Badge>
              </div>
              <p className="mt-3 text-lg font-bold text-white">{c.kind === 'PERCENT' ? `${c.value}% off` : `NT$${c.value} off`}</p>
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10.5px] text-slate-500">
                  <span>{t('fleetos.campaigns.usage', { used: c.usedCount, limit: c.usageLimit })}</span>
                  <span>{usagePct}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-cyan-400" style={{ width: `${usagePct}%` }} />
                </div>
              </div>
              <p className="mt-2 text-[10.5px] text-slate-500">{t('fleetos.campaigns.perUserLimit', { n: c.perUserLimit })}</p>
              <div className="mt-3 flex gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCampaignStatus(c.id, c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')
                  }}
                  data-testid="campaign-toggle"
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/10"
                >
                  {c.status === 'ACTIVE' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {c.status === 'ACTIVE' ? t('fleetos.campaigns.pause') : t('fleetos.campaigns.activate')}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </FleetOsPage>
  )
}
