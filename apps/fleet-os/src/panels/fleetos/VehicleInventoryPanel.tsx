import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  History,
  MapPin,
  Package,
  RotateCcw,
  ShieldAlert,
  Truck,
  Wrench,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { VEHICLE_CATEGORIES, VEHICLE_CATEGORY_CATALOG } from '../../data/vehicleCatalog'
import { REGIONS } from '../../data/locations'
import { vehicleOperationalStatus, buildZoneCategorySupply } from '../../lib/fleetVehicles'
import { formatRelative, driverStatusLabel } from '../../lib/format'
import type { TaiwanRegion, VehicleCategory, VehicleFeature, VehicleOperationalStatus } from '../../types'
import { useLang } from '../../i18n'

const FEATURES: VehicleFeature[] = ['CHILD_SEAT', 'WHEELCHAIR_ACCESS', 'VIP_INTERIOR', 'WIFI', 'MEET_AND_GREET', 'LARGE_LUGGAGE']

const STATUS_TONE: Record<VehicleOperationalStatus, 'green' | 'cyan' | 'amber' | 'slate' | 'red' | 'purple'> = {
  AVAILABLE: 'green',
  ASSIGNED: 'cyan',
  EN_ROUTE: 'cyan',
  OCCUPIED: 'purple',
  OFFLINE: 'slate',
  MAINTENANCE: 'amber',
  DOCUMENT_ISSUE: 'red',
}

const TOOLTIP_STYLE = {
  background: 'rgba(10,14,30,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#e7e9f5',
  fontSize: 12,
}

/**
 * The client brief's Fleet & Vehicle Inventory Backend — the source of truth
 * behind both the customer-facing vehicle-selection grid (`VehicleOptionsGrid`)
 * and the dispatch matching engine (`lib/dispatch.ts`). Editing a vehicle's
 * category/zone/features/maintenance state here immediately changes what
 * customers can book and which drivers the matcher will offer a trip to —
 * there is no separate "customer view" of this data to fall out of sync.
 */
export default function VehicleInventoryPanel() {
  const { t, lang } = useLang()
  const vehicles = useFleetStore((s) => s.vehicles)
  const drivers = useFleetStore((s) => s.drivers)
  const suppliers = useFleetStore((s) => s.suppliers)
  const categoryPriceOverrides = useFleetStore((s) => s.categoryPriceOverrides)
  const setCategoryPriceOverride = useFleetStore((s) => s.setCategoryPriceOverride)
  const setVehicleMaintenance = useFleetStore((s) => s.setVehicleMaintenance)
  const setVehicleServiceZone = useFleetStore((s) => s.setVehicleServiceZone)
  const setVehicleCategory = useFleetStore((s) => s.setVehicleCategory)
  const toggleVehicleFeature = useFleetStore((s) => s.toggleVehicleFeature)
  const globalAuditLog = useFleetStore((s) => s.globalAuditLog)

  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers])
  const [selectedId, setSelectedId] = useState<string | null>(vehicles[0]?.id ?? null)
  const [maintHours, setMaintHours] = useState(4)
  const [maintReason, setMaintReason] = useState('')
  const [categoryDraft, setCategoryDraft] = useState<Record<VehicleCategory, { baseFare: number; perKmRate: number; perMinRate: number }>>(() =>
    Object.fromEntries(VEHICLE_CATEGORIES.map((c) => [c, categoryPriceOverrides[c] ?? { baseFare: VEHICLE_CATEGORY_CATALOG[c].baseFare, perKmRate: VEHICLE_CATEGORY_CATALOG[c].perKmRate, perMinRate: VEHICLE_CATEGORY_CATALOG[c].perMinRate }])) as Record<
      VehicleCategory,
      { baseFare: number; perKmRate: number; perMinRate: number }
    >,
  )

  const statuses = useMemo(() => vehicles.map((v) => vehicleOperationalStatus(v, driverById.get(v.driverId))), [vehicles, driverById])
  const availableCount = statuses.filter((s) => s === 'AVAILABLE').length
  const maintenanceCount = statuses.filter((s) => s === 'MAINTENANCE').length
  const docIssueCount = statuses.filter((s) => s === 'DOCUMENT_ISSUE').length

  const supply = useMemo(() => buildZoneCategorySupply(vehicles, drivers), [vehicles, drivers])
  const chartData = useMemo(
    () =>
      REGIONS.map((r) => {
        const rows = supply.filter((s) => s.region === r.key)
        return { region: t(`region.${r.key}`), total: rows.reduce((sum, s) => sum + s.total, 0), available: rows.reduce((sum, s) => sum + s.available, 0) }
      }),
    [supply, t],
  )

  const selected = vehicles.find((v) => v.id === selectedId) ?? null
  const selectedDriver = selected ? driverById.get(selected.driverId) : undefined
  const selectedStatus = selected ? vehicleOperationalStatus(selected, selectedDriver) : null

  const vehicleAuditLog = useMemo(
    () => globalAuditLog.filter((e) => e.targetType === 'Vehicle' || e.targetType === 'VehicleCategory').slice(0, 40),
    [globalAuditLog],
  )

  const applyCategoryOverride = (category: VehicleCategory) => {
    setCategoryPriceOverride(category, categoryDraft[category], 'fleet.manager')
  }
  const resetCategoryOverride = (category: VehicleCategory) => {
    const base = VEHICLE_CATEGORY_CATALOG[category]
    setCategoryDraft((d) => ({ ...d, [category]: { baseFare: base.baseFare, perKmRate: base.perKmRate, perMinRate: base.perMinRate } }))
    setCategoryPriceOverride(category, { baseFare: base.baseFare, perKmRate: base.perKmRate, perMinRate: base.perMinRate }, 'fleet.manager')
  }

  return (
    <FleetOsPage title={t('fleetos.vehicles.title')} subtitle={t('fleetos.vehicles.subtitle')} icon={<Truck className="h-5 w-5" />}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Car className="h-4 w-4" />} label={t('fleetos.vehicles.totalVehicles')} value={vehicles.length} tone="cyan" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label={t('fleetos.vehicles.available')} value={availableCount} tone="lime" />
        <StatCard icon={<Wrench className="h-4 w-4" />} label={t('fleetos.vehicles.inMaintenance')} value={maintenanceCount} tone="amber" />
        <StatCard icon={<ShieldAlert className="h-4 w-4" />} label={t('fleetos.vehicles.docIssues')} value={docIssueCount} tone={docIssueCount > 0 ? 'red' : 'lime'} />
      </div>

      <div className="mt-4 glass-panel rounded-2xl p-4">
        <p className="mb-3 text-sm font-semibold text-white">{t('fleetos.vehicles.categoryCatalogueTitle')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="vehicle-category-catalogue">
          {VEHICLE_CATEGORIES.map((category) => {
            const entry = VEHICLE_CATEGORY_CATALOG[category]
            const draft = categoryDraft[category]
            const overridden = categoryPriceOverrides[category] !== undefined
            return (
              <motion.div layout key={category} className="rounded-xl border border-white/10 bg-white/[0.02] p-3" data-testid={`vehicle-category-card-${category}`}>
                <div className="flex gap-2.5">
                  <img src={entry.photo} alt="" className="h-14 w-16 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-bold text-white">{t(`vehicle.category.${category}`)}</p>
                      {entry.isVip && <Badge tone="purple">VIP</Badge>}
                    </div>
                    <p className="truncate text-[10.5px] text-slate-400">
                      {entry.brand} {entry.model}
                    </p>
                    <p className="text-[10px] text-slate-500">{t('fleetos.vehicles.capacityShort', { pax: entry.maxPassengers, bags: entry.maxLuggage })}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.features.map((f) => (
                    <span key={f} className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9.5px] text-slate-400">
                      {t(`vehicle.feature.${f}`)}
                    </span>
                  ))}
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                  <MiniNumberField label={t('fleetos.vehicles.baseFare')} value={draft.baseFare} onChange={(v) => setCategoryDraft((d) => ({ ...d, [category]: { ...d[category], baseFare: v } }))} />
                  <MiniNumberField label={t('fleetos.vehicles.perKm')} value={draft.perKmRate} onChange={(v) => setCategoryDraft((d) => ({ ...d, [category]: { ...d[category], perKmRate: v } }))} />
                  <MiniNumberField label={t('fleetos.vehicles.perMin')} value={draft.perMinRate} onChange={(v) => setCategoryDraft((d) => ({ ...d, [category]: { ...d[category], perMinRate: v } }))} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{overridden ? t('fleetos.vehicles.overridden') : t('fleetos.vehicles.catalogDefault')}</span>
                  <div className="flex gap-1">
                    <button onClick={() => resetCategoryOverride(category)} data-testid={`vehicle-category-reset-${category}`} className="rounded-md bg-white/5 px-1.5 py-1 text-[10px] text-slate-400 hover:bg-white/10">
                      <RotateCcw className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => applyCategoryOverride(category)}
                      data-testid={`vehicle-category-save-${category}`}
                      className="rounded-md bg-cyan-400/15 px-2 py-1 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-400/25"
                    >
                      {t('fleetos.vehicles.save')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 glass-panel rounded-2xl p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-white">
          <MapPin className="h-4 w-4 text-cyan-300" /> {t('fleetos.vehicles.supplyChartTitle')}
        </p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="region" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#94a3b8' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="total" name={t('fleetos.vehicles.chartTotal')} fill="#475569" radius={[4, 4, 0, 0]} />
              <Bar dataKey="available" name={t('fleetos.vehicles.chartAvailable')} fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="glass-panel overflow-hidden rounded-2xl">
          <p className="p-4 pb-0 text-sm font-semibold text-white">{t('fleetos.vehicles.fleetTitle')}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs" data-testid="vehicle-inventory-table">
              <thead className="text-[10.5px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">{t('fleetos.vehicles.colPlate')}</th>
                  <th className="px-3 py-2.5">{t('fleetos.vehicles.colDriver')}</th>
                  <th className="px-3 py-2.5">{t('fleetos.vehicles.colCategory')}</th>
                  <th className="px-3 py-2.5">{t('fleetos.vehicles.colZone')}</th>
                  <th className="px-3 py-2.5">{t('fleetos.vehicles.colStatus')}</th>
                  <th className="px-3 py-2.5">{t('fleetos.vehicles.colCompliance')}</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => {
                  const driver = driverById.get(v.driverId)
                  const status = vehicleOperationalStatus(v, driver)
                  return (
                    <motion.tr
                      key={v.id}
                      layout
                      onClick={() => setSelectedId(v.id)}
                      data-testid="vehicle-inventory-row"
                      className={`cursor-pointer border-t border-white/5 transition hover:bg-white/[0.03] ${selectedId === v.id ? 'bg-cyan-400/[0.05]' : ''}`}
                    >
                      <td className="px-3 py-2.5 font-mono text-slate-200">{v.plate}</td>
                      <td className="px-3 py-2.5 text-slate-400">{driver ? (lang === 'zh' ? driver.nameZh : driver.name) : '—'}</td>
                      <td className="px-3 py-2.5 text-slate-300">{t(`vehicle.category.${v.category}`)}</td>
                      <td className="px-3 py-2.5 text-slate-400">{t(`region.${v.serviceZone}`)}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={STATUS_TONE[status]}>{t(`fleetos.vehicles.status.${status}`)}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        {v.insuranceStatus === 'VALID' && v.complianceStatus === 'OK' ? (
                          <Badge tone="green">{t('fleetos.vehicles.complianceOk')}</Badge>
                        ) : (
                          <Badge tone="red">{t('fleetos.vehicles.complianceFlagged')}</Badge>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4" data-testid="vehicle-detail-panel">
          {selected && selectedStatus ? (
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-sm font-bold text-white">{selected.plate}</h3>
                <Badge tone={STATUS_TONE[selectedStatus]}>{t(`fleetos.vehicles.status.${selectedStatus}`)}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {selectedDriver ? `${lang === 'zh' ? selectedDriver.nameZh : selectedDriver.name} · ${driverStatusLabel(selectedDriver.status, lang)}` : t('fleetos.vehicles.noDriverAssigned')}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/[0.03] p-2.5">
                  <p className="text-[10px] text-slate-500">{t('fleetos.vehicles.colCategory')}</p>
                  <select
                    value={selected.category}
                    onChange={(e) => setVehicleCategory(selected.id, e.target.value as VehicleCategory)}
                    data-testid="vehicle-detail-category-select"
                    className="mt-1 w-full rounded-md border border-white/10 bg-transparent text-[11px] font-semibold text-slate-200 outline-none"
                  >
                    {VEHICLE_CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-slate-900">
                        {t(`vehicle.category.${c}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-lg bg-white/[0.03] p-2.5">
                  <p className="text-[10px] text-slate-500">{t('fleetos.vehicles.colZone')}</p>
                  <select
                    value={selected.serviceZone}
                    onChange={(e) => setVehicleServiceZone(selected.id, e.target.value as TaiwanRegion)}
                    data-testid="vehicle-detail-zone-select"
                    className="mt-1 w-full rounded-md border border-white/10 bg-transparent text-[11px] font-semibold text-slate-200 outline-none"
                  >
                    {REGIONS.map((r) => (
                      <option key={r.key} value={r.key} className="bg-slate-900">
                        {t(`region.${r.key}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-lg bg-white/[0.03] p-2.5">
                  <p className="text-[10px] text-slate-500">{t('fleetos.vehicles.colCapacity')}</p>
                  <p className="font-semibold text-slate-200">{t('fleetos.vehicles.capacityShort', { pax: selected.capacity, bags: selected.luggageCapacity })}</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] p-2.5">
                  <p className="text-[10px] text-slate-500">{t('fleetos.vehicles.colCompliance')}</p>
                  <p className="text-[11px] text-slate-300">
                    {t('fleetos.vehicles.insurance')}: {t(`fleetos.vehicles.docStatus.${selected.insuranceStatus}`)} · {t('fleetos.vehicles.compliance')}:{' '}
                    {t(`fleetos.vehicles.complianceStatus.${selected.complianceStatus}`)}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{t('fleetos.vehicles.features')}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {FEATURES.map((f) => {
                  const active = selected.features.includes(f)
                  return (
                    <button
                      key={f}
                      onClick={() => toggleVehicleFeature(selected.id, f)}
                      data-testid={`vehicle-detail-feature-${f}`}
                      className={`rounded-full px-2 py-1 text-[10.5px] font-medium ring-1 transition ${
                        active ? 'bg-cyan-400/15 text-cyan-300 ring-cyan-400/30' : 'bg-white/5 text-slate-500 ring-white/10 hover:text-slate-300'
                      }`}
                    >
                      {t(`vehicle.feature.${f}`)}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 rounded-xl bg-white/[0.03] p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                  <Wrench className="h-3.5 w-3.5 text-amber-300" /> {t('fleetos.vehicles.maintenanceBlock')}
                </p>
                {selected.maintenanceUntil && selected.maintenanceUntil > Date.now() ? (
                  <div className="text-[11px] text-amber-300">
                    <p>{t('fleetos.vehicles.blockedUntil', { time: new Date(selected.maintenanceUntil).toLocaleString(lang === 'zh' ? 'zh-TW' : 'en-US') })}</p>
                    {selected.maintenanceReason && <p className="mt-0.5 text-slate-400">{selected.maintenanceReason}</p>}
                    <Button size="sm" variant="secondary" className="mt-2" onClick={() => setVehicleMaintenance(selected.id, null, '', 'fleet.manager')} data-testid="vehicle-detail-clear-maintenance">
                      {t('fleetos.vehicles.clearMaintenance')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10.5px] text-slate-500">{t('fleetos.vehicles.maintenanceHint')}</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={maintHours}
                        onChange={(e) => setMaintHours(Number(e.target.value))}
                        data-testid="vehicle-detail-maintenance-hours"
                        className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-slate-100 outline-none"
                      />
                      <input
                        value={maintReason}
                        onChange={(e) => setMaintReason(e.target.value)}
                        placeholder={t('fleetos.vehicles.maintenanceReasonPlaceholder')}
                        data-testid="vehicle-detail-maintenance-reason"
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-slate-100 outline-none"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setVehicleMaintenance(selected.id, maintHours, maintReason || t('fleetos.vehicles.maintenanceDefaultReason'), 'fleet.manager')}
                      data-testid="vehicle-detail-block-maintenance"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" /> {t('fleetos.vehicles.blockForMaintenance')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-slate-500">{t('fleetos.vehicles.selectHint')}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="glass-panel rounded-2xl p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-white">
            <Package className="h-4 w-4 text-cyan-300" /> {t('fleetos.vehicles.supplierInventoryTitle')}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="vehicle-supplier-inventory">
            {suppliers.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] p-2.5 text-xs">
                <div>
                  <p className="font-medium text-slate-200">{lang === 'zh' ? s.nameZh : s.name}</p>
                  <p className="text-[10.5px] text-slate-500">{t('fleetos.vehicles.supplierProductsListed', { n: s.productsListed })}</p>
                </div>
                <Badge tone={s.status === 'ACTIVE' ? 'green' : s.status === 'PAUSED' ? 'amber' : 'red'}>{t(`fleetos.suppliers.status.${s.status}`)}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel max-h-[420px] overflow-y-auto rounded-2xl p-3" data-testid="vehicle-audit-log">
          <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <History className="h-3.5 w-3.5" /> {t('fleetos.vehicles.auditTrail')}
          </p>
          <ol className="space-y-1.5">
            {vehicleAuditLog.map((entry) => (
              <li key={entry.id} className="rounded-lg px-2 py-1.5 text-[11px] hover:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
                  <span className="text-slate-500">{entry.actor}</span>
                  <span className="ml-auto shrink-0 text-slate-500">{formatRelative(entry.at, lang)}</span>
                </div>
                <p className="mt-0.5 pl-3.5 text-slate-300">{entry.action}</p>
              </li>
            ))}
            {vehicleAuditLog.length === 0 && <li className="p-6 text-center text-slate-500">{t('fleetos.admin.noAuditEntries')}</li>}
          </ol>
        </div>
      </div>
    </FleetOsPage>
  )
}

function MiniNumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[9px] text-slate-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-[10.5px] text-slate-100 outline-none focus:border-cyan-400/50"
      />
    </label>
  )
}
