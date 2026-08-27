import { useState } from 'react'
import { motion } from 'framer-motion'
import { Archive, CheckCircle2, FileEdit, Package } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'

const STATUS_TONE = { PUBLISHED: 'green', DRAFT: 'amber', ARCHIVED: 'slate' } as const

export default function CatalogPanel() {
  const { t, lang } = useLang()
  const products = useFleetStore((s) => s.catalogProducts)
  const setCatalogProductStatus = useFleetStore((s) => s.setCatalogProductStatus)

  const [filter, setFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('ALL')
  const filtered = filter === 'ALL' ? products : products.filter((p) => p.status === filter)
  const published = products.filter((p) => p.status === 'PUBLISHED').length

  return (
    <FleetOsPage title={t('fleetos.catalog.title')} subtitle={t('fleetos.catalog.subtitle')} icon={<Package className="h-5 w-5" />}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Package className="h-4 w-4" />} label={t('fleetos.catalog.totalProducts')} value={products.length} tone="cyan" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label={t('fleetos.catalog.published')} value={published} tone="lime" />
        <StatCard icon={<FileEdit className="h-4 w-4" />} label={t('fleetos.catalog.draft')} value={products.filter((p) => p.status === 'DRAFT').length} tone="amber" />
        <StatCard icon={<Archive className="h-4 w-4" />} label={t('fleetos.catalog.archived')} value={products.filter((p) => p.status === 'ARCHIVED').length} tone="purple" />
      </div>

      <div className="mt-4 flex gap-1.5">
        {(['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === f ? 'bg-cyan-400/15 text-cyan-300' : 'text-slate-400 hover:bg-white/5'}`}
          >
            {t(`fleetos.catalog.filter.${f}`)}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="catalog-grid">
        {filtered.map((p) => (
          <motion.div layout key={p.id} className="glass-panel rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">{lang === 'zh' ? p.nameZh : p.name}</p>
                <p className="text-[11px] text-slate-500">{p.routeLabel}</p>
              </div>
              <Badge tone={STATUS_TONE[p.status]}>{t(`fleetos.catalog.filter.${p.status}`)}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">{t(`vehicle.type.${p.vehicleType}`)}</span>
              <span className="font-semibold text-emerald-300">{formatTWD(p.basePrice)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>{t('fleetos.catalog.inventory', { n: p.inventory })}</span>
              <span>{p.region}</span>
            </div>
            <div className="mt-3 flex gap-1.5">
              {p.status !== 'PUBLISHED' && (
                <button
                  onClick={() => setCatalogProductStatus(p.id, 'PUBLISHED')}
                  data-testid="catalog-publish"
                  className="flex-1 rounded-lg bg-emerald-400/10 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-400/20"
                >
                  {t('fleetos.catalog.publish')}
                </button>
              )}
              {p.status !== 'DRAFT' && (
                <button
                  onClick={() => setCatalogProductStatus(p.id, 'DRAFT')}
                  className="flex-1 rounded-lg bg-white/5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/10"
                >
                  {t('fleetos.catalog.unpublish')}
                </button>
              )}
              {p.status !== 'ARCHIVED' && (
                <button
                  onClick={() => setCatalogProductStatus(p.id, 'ARCHIVED')}
                  className="flex-1 rounded-lg bg-white/5 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  {t('fleetos.catalog.archive')}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </FleetOsPage>
  )
}
