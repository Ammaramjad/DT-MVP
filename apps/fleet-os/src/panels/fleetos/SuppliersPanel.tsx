import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Pause, Play, ShieldOff, Star, Truck } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import type { Supplier, SupplierStatus } from '../../types'
import { useLang } from '../../i18n'

const STATUS_TONE: Record<SupplierStatus, 'green' | 'amber' | 'red'> = { ACTIVE: 'green', PAUSED: 'amber', SUSPENDED: 'red' }

export default function SuppliersPanel() {
  const { t, lang } = useLang()
  const suppliers = useFleetStore((s) => s.suppliers)
  const setSupplierStatus = useFleetStore((s) => s.setSupplierStatus)
  const [selected, setSelected] = useState<Supplier | null>(null)

  const active = suppliers.filter((s) => s.status === 'ACTIVE').length
  const totalOrders = suppliers.reduce((sum, s) => sum + s.activeOrders, 0)
  const avgConfirm = suppliers.length ? Math.round(suppliers.reduce((sum, s) => sum + s.avgConfirmMinutes, 0) / suppliers.length) : 0

  return (
    <FleetOsPage title={t('fleetos.suppliers.title')} subtitle={t('fleetos.suppliers.subtitle')} icon={<Truck className="h-5 w-5" />}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Truck className="h-4 w-4" />} label={t('fleetos.suppliers.activeSuppliers')} value={active} tone="cyan" />
        <StatCard icon={<ShieldOff className="h-4 w-4" />} label={t('fleetos.suppliers.total')} value={suppliers.length} tone="purple" />
        <StatCard icon={<Star className="h-4 w-4" />} label={t('fleetos.suppliers.activeOrders')} value={totalOrders} tone="lime" />
        <StatCard icon={<Mail className="h-4 w-4" />} label={t('fleetos.suppliers.avgConfirm')} value={avgConfirm} suffix=" min" tone="amber" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="glass-panel overflow-hidden rounded-2xl">
          <table className="w-full text-left text-xs" data-testid="suppliers-table">
            <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">{t('fleetos.suppliers.colName')}</th>
                <th className="px-3 py-2.5">{t('fleetos.suppliers.colChannel')}</th>
                <th className="px-3 py-2.5">{t('fleetos.suppliers.colCommission')}</th>
                <th className="px-3 py-2.5">{t('fleetos.suppliers.colOrders')}</th>
                <th className="px-3 py-2.5">{t('fleetos.suppliers.colRating')}</th>
                <th className="px-3 py-2.5">{t('fleetos.suppliers.colStatus')}</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <motion.tr
                  key={s.id}
                  layout
                  onClick={() => setSelected(s)}
                  data-testid="supplier-row"
                  className={`cursor-pointer border-t border-white/5 transition hover:bg-white/[0.03] ${selected?.id === s.id ? 'bg-cyan-400/[0.05]' : ''}`}
                >
                  <td className="px-3 py-2.5 font-medium text-slate-200">{lang === 'zh' ? s.nameZh : s.name}</td>
                  <td className="px-3 py-2.5 text-slate-400">{s.channel}</td>
                  <td className="px-3 py-2.5 text-slate-400">{s.commissionPct}%</td>
                  <td className="px-3 py-2.5 text-slate-400">{s.activeOrders}</td>
                  <td className="px-3 py-2.5 text-amber-300">★ {s.rating.toFixed(1)}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={STATUS_TONE[s.status]}>{t(`fleetos.suppliers.status.${s.status}`)}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSupplierStatus(s.id, s.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')
                        }}
                        data-testid="supplier-toggle-pause"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                        title={s.status === 'ACTIVE' ? t('fleetos.suppliers.pause') : t('fleetos.suppliers.activate')}
                      >
                        {s.status === 'ACTIVE' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSupplierStatus(s.id, 'SUSPENDED')
                        }}
                        data-testid="supplier-suspend"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                        title={t('fleetos.suppliers.suspend')}
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass-panel rounded-2xl p-4" data-testid="supplier-detail-panel">
          {selected ? (
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{lang === 'zh' ? selected.nameZh : selected.name}</h3>
                <Badge tone={STATUS_TONE[selected.status]}>{t(`fleetos.suppliers.status.${selected.status}`)}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400">{selected.contactEmail}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/[0.03] p-2.5">
                  <p className="text-[10px] text-slate-500">{t('fleetos.suppliers.colProducts')}</p>
                  <p className="font-semibold text-slate-200">{selected.productsListed}</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] p-2.5">
                  <p className="text-[10px] text-slate-500">{t('fleetos.suppliers.colCommission')}</p>
                  <p className="font-semibold text-slate-200">{selected.commissionPct}%</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] text-slate-500">{t('fleetos.suppliers.adapterNote')}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setSupplierStatus(selected.id, selected.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}>
                  {selected.status === 'ACTIVE' ? t('fleetos.suppliers.pause') : t('fleetos.suppliers.activate')}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setSupplierStatus(selected.id, 'SUSPENDED')}>
                  {t('fleetos.suppliers.suspend')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-slate-500">{t('fleetos.suppliers.selectHint')}</p>
          )}
        </div>
      </div>
    </FleetOsPage>
  )
}
