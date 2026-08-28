import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  CloudRain,
  Gauge,
  History,
  Percent,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { computeDynamicFareBreakdown, countAvailableVehicles, WEATHER_CONDITIONS, DEMAND_LEVELS } from '../../lib/dynamicPricing'
import { VEHICLE_CATEGORIES, VEHICLE_CATEGORY_CATALOG } from '../../data/vehicleCatalog'
import { REGIONS } from '../../data/locations'
import { formatRelative, formatTWD } from '../../lib/format'
import { ACTIVE_ORDER_STATUSES } from '../../types'
import type { DemandLevel, TaiwanRegion, VehicleCategory, WeatherCondition } from '../../types'
import { useLang } from '../../i18n'

const UPCOMING_STATUSES = new Set(['DRAFT', 'PENDING_PAYMENT', 'PAID', 'SUPPLIER_PENDING'])
const ACTIVE_STATUS_SET = new Set(ACTIVE_ORDER_STATUSES)

/**
 * The client brief's "Dynamic Pricing Service" backend module — reads the
 * exact same simulated weather/demand feed and `computeDynamicFareBreakdown`
 * engine the Customer App booking flow uses, so this is a genuine live view
 * of the pricing the customer sees rather than a separate mocked-up display.
 * Every reading here is explicitly labeled "Demo API simulation" per the
 * brief, and the shape is deliberately API-response-like so a real Weather/
 * Maps/fleet-GPS/supplier-availability/pricing-rules API could replace the
 * data source without touching any downstream consumer.
 */
export default function PricingDynamicPanel() {
  const { t, lang } = useLang()
  const zoneConditions = useFleetStore((s) => s.zoneConditions)
  const pricingRules = useFleetStore((s) => s.pricingRules)
  const updatePricingRules = useFleetStore((s) => s.updatePricingRules)
  const setZoneCondition = useFleetStore((s) => s.setZoneCondition)
  const vehicles = useFleetStore((s) => s.vehicles)
  const drivers = useFleetStore((s) => s.drivers)
  const orders = useFleetStore((s) => s.orders)
  const globalAuditLog = useFleetStore((s) => s.globalAuditLog)

  const [previewCategory, setPreviewCategory] = useState<VehicleCategory>('VAN_6')
  const [draft, setDraft] = useState(pricingRules)

  const previewEntry = VEHICLE_CATEGORY_CATALOG[previewCategory]

  const zoneRows = useMemo(
    () =>
      zoneConditions.map((zc) => {
        const availableVehiclesInZone = countAvailableVehicles(vehicles, drivers, zc.region, previewCategory, previewEntry.underlyingType)
        const fareBreakdown = computeDynamicFareBreakdown({
          category: previewEntry,
          distanceKm: 30,
          durationMin: 40,
          isAirport: true,
          pickupZone: zc.region,
          scheduledTimeIso: new Date().toISOString(),
          availableVehiclesInZone,
          weather: zc.weather,
          demand: zc.demand,
          rules: pricingRules,
        })
        return { zone: zc, availableVehiclesInZone, fareBreakdown }
      }),
    [zoneConditions, vehicles, drivers, previewCategory, previewEntry, pricingRules],
  )

  const surgeZoneCount = zoneRows.filter((r) => r.fareBreakdown.appliedSurchargePct > 0).length
  const avgMultiplier = zoneRows.length ? Math.round(zoneRows.reduce((sum, r) => sum + r.fareBreakdown.appliedSurchargePct, 0) / zoneRows.length) : 0
  const fairnessAlertCount = zoneRows.filter((r) => r.fareBreakdown.fairnessCapApplied).length

  const tripRows = useMemo(
    () =>
      [...orders]
        .filter((o) => ACTIVE_STATUS_SET.has(o.status) || UPCOMING_STATUSES.has(o.status))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10),
    [orders],
  )

  const pricingAuditLog = useMemo(() => globalAuditLog.filter((e) => e.targetType === 'PricingRules' || e.targetType === 'ZoneCondition').slice(0, 40), [globalAuditLog])

  const saveDraft = () => {
    updatePricingRules(draft, 'fleet.manager')
  }
  const resetDraft = () => setDraft(pricingRules)

  return (
    <FleetOsPage
      title={t('fleetos.pricingDynamic.title')}
      subtitle={t('fleetos.pricingDynamic.subtitle')}
      icon={<Gauge className="h-5 w-5" />}
      right={
        <Badge tone="amber" pulse>
          {t('fleetos.pricingDynamic.demoApiLabel')}
        </Badge>
      }
    >
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Gauge className="h-4 w-4" />} label={t('fleetos.pricingDynamic.zonesTotal')} value={zoneConditions.length} tone="cyan" />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label={t('fleetos.pricingDynamic.zonesSurge')} value={surgeZoneCount} tone="amber" />
        <StatCard icon={<Percent className="h-4 w-4" />} label={t('fleetos.pricingDynamic.avgMultiplier')} value={avgMultiplier} suffix="%" tone="purple" />
        <StatCard icon={<ShieldAlert className="h-4 w-4" />} label={t('fleetos.pricingDynamic.fairnessAlerts')} value={fairnessAlertCount} tone={fairnessAlertCount > 0 ? 'red' : 'lime'} />
      </div>

      <div className="mt-4 glass-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <CloudRain className="h-4 w-4 text-cyan-300" /> {t('fleetos.pricingDynamic.zoneTableTitle')}
          </p>
          <label className="flex items-center gap-2 text-[11px] text-slate-400">
            {t('fleetos.pricingDynamic.previewCategory')}
            <select
              value={previewCategory}
              onChange={(e) => setPreviewCategory(e.target.value as VehicleCategory)}
              data-testid="pricing-preview-category"
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
            >
              {VEHICLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`vehicle.category.${c}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">{t('fleetos.pricingDynamic.zoneTableHint', { category: t(`vehicle.category.${previewCategory}`) })}</p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs" data-testid="pricing-zone-table">
            <thead className="text-[10.5px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colZone')}</th>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colWeather')}</th>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colDemand')}</th>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colAvailable')}</th>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colMultiplier')}</th>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colCustomerPrice')}</th>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colSupplierPrice')}</th>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colMargin')}</th>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colAlert')}</th>
              </tr>
            </thead>
            <tbody>
              {zoneRows.map(({ zone, availableVehiclesInZone, fareBreakdown }) => (
                <tr key={zone.region} className="border-t border-white/5" data-testid="pricing-zone-row">
                  <td className="px-2 py-2 font-medium text-slate-200">{t(`region.${zone.region}`)}</td>
                  <td className="px-2 py-2">
                    <select
                      value={zone.weather}
                      onChange={(e) => setZoneCondition(zone.region, { weather: e.target.value as WeatherCondition })}
                      data-testid="pricing-zone-weather-select"
                      className="rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 text-[11px] text-slate-100 outline-none focus:border-cyan-400/50"
                    >
                      {WEATHER_CONDITIONS.map((w) => (
                        <option key={w} value={w}>
                          {t(`pricing.weather.${w}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={zone.demand}
                      onChange={(e) => setZoneCondition(zone.region, { demand: e.target.value as DemandLevel })}
                      data-testid="pricing-zone-demand-select"
                      className="rounded-lg border border-white/10 bg-white/5 px-1.5 py-1 text-[11px] text-slate-100 outline-none focus:border-cyan-400/50"
                    >
                      {DEMAND_LEVELS.map((d) => (
                        <option key={d} value={d}>
                          {t(`pricing.demandLevel.${d}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-slate-300">{availableVehiclesInZone}</td>
                  <td className="px-2 py-2">
                    <span className={fareBreakdown.appliedSurchargePct > 0 ? 'font-semibold text-amber-300' : 'text-slate-400'}>+{fareBreakdown.appliedSurchargePct}%</span>
                  </td>
                  <td className="px-2 py-2 font-semibold text-emerald-300">{formatTWD(fareBreakdown.total)}</td>
                  <td className="px-2 py-2 text-slate-400">{formatTWD(fareBreakdown.supplierPrice)}</td>
                  <td className="px-2 py-2 text-slate-400">{formatTWD(fareBreakdown.platformMargin)}</td>
                  <td className="px-2 py-2">
                    {fareBreakdown.fairnessCapApplied ? (
                      <Badge tone="red">
                        <AlertTriangle className="h-3 w-3" /> {t('fleetos.pricingDynamic.capped')}
                      </Badge>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 glass-panel rounded-2xl p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-white">
          <Banknote className="h-4 w-4 text-cyan-300" /> {t('fleetos.pricingDynamic.tripsTitle')}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs" data-testid="pricing-trips-table">
            <thead className="text-[10.5px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colOrder')}</th>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colCategory')}</th>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colZone')}</th>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colStatus')}</th>
                <th className="px-2 py-2">{t('fleetos.pricingDynamic.colCustomerPrice')}</th>
              </tr>
            </thead>
            <tbody>
              {tripRows.map((o) => (
                <tr key={o.id} className="border-t border-white/5" data-testid="pricing-trip-row">
                  <td className="px-2 py-2 font-mono text-slate-200">{o.orderNo}</td>
                  <td className="px-2 py-2 text-slate-300">{t(`vehicle.category.${o.vehicleCategory}`)}</td>
                  <td className="px-2 py-2 text-slate-400">{o.pickup.region ? t(`region.${o.pickup.region}`) : '—'}</td>
                  <td className="px-2 py-2">
                    <Badge tone={ACTIVE_STATUS_SET.has(o.status) ? 'cyan' : 'slate'}>{t(`status.${o.status}`)}</Badge>
                  </td>
                  <td className="px-2 py-2 font-semibold text-emerald-300">{formatTWD(o.priceEstimate)}</td>
                </tr>
              ))}
              {tripRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                    {t('fleetos.pricingDynamic.noTrips')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="glass-panel rounded-2xl p-4">
          <p className="mb-1 text-sm font-semibold text-white">{t('fleetos.pricingDynamic.rulesTitle')}</p>
          <p className="mb-3 text-[11px] text-slate-500">{t('fleetos.pricingDynamic.rulesHint')}</p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumberField label={t('fleetos.pricingDynamic.maxSurge')} suffix="%" value={draft.maxSurgeMultiplierPct} onChange={(v) => setDraft((d) => ({ ...d, maxSurgeMultiplierPct: v }))} testId="rule-max-surge" />
            <NumberField
              label={t('fleetos.pricingDynamic.minAvailable')}
              value={draft.minAvailableVehiclesBeforeSurge}
              onChange={(v) => setDraft((d) => ({ ...d, minAvailableVehiclesBeforeSurge: v }))}
              testId="rule-min-available"
            />
            <NumberField
              label={t('fleetos.pricingDynamic.lowAvailabilitySurcharge')}
              suffix="%"
              value={draft.lowAvailabilitySurchargePct}
              onChange={(v) => setDraft((d) => ({ ...d, lowAvailabilitySurchargePct: v }))}
              testId="rule-low-availability"
            />
            <NumberField label={t('fleetos.pricingDynamic.vipSurcharge')} suffix="%" value={draft.vipSurchargePct} onChange={(v) => setDraft((d) => ({ ...d, vipSurchargePct: v }))} testId="rule-vip" />
            <NumberField label={t('fleetos.pricingDynamic.nightSurcharge')} suffix="%" value={draft.nightSurchargePct} onChange={(v) => setDraft((d) => ({ ...d, nightSurchargePct: v }))} testId="rule-night-pct" />
            <NumberField label={t('fleetos.pricingDynamic.nightStart')} value={draft.nightStartHour} onChange={(v) => setDraft((d) => ({ ...d, nightStartHour: v }))} testId="rule-night-start" />
            <NumberField label={t('fleetos.pricingDynamic.nightEnd')} value={draft.nightEndHour} onChange={(v) => setDraft((d) => ({ ...d, nightEndHour: v }))} testId="rule-night-end" />
            <NumberField label={t('fleetos.pricingDynamic.holidaySurcharge')} suffix="%" value={draft.holidaySurchargePct} onChange={(v) => setDraft((d) => ({ ...d, holidaySurchargePct: v }))} testId="rule-holiday" />
            <NumberField label={t('fleetos.pricingDynamic.rounding')} suffix=" TWD" value={draft.roundingIncrement} onChange={(v) => setDraft((d) => ({ ...d, roundingIncrement: v }))} testId="rule-rounding" />
          </div>

          <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('fleetos.pricingDynamic.weatherRules')}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {WEATHER_CONDITIONS.map((w) => (
              <NumberField
                key={w}
                label={t(`pricing.weather.${w}`)}
                suffix="%"
                value={draft.weatherSurchargePct[w]}
                onChange={(v) => setDraft((d) => ({ ...d, weatherSurchargePct: { ...d.weatherSurchargePct, [w]: v } }))}
                testId={`rule-weather-${w}`}
              />
            ))}
          </div>

          <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('fleetos.pricingDynamic.demandRules')}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DEMAND_LEVELS.map((d) => (
              <NumberField
                key={d}
                label={t(`pricing.demandLevel.${d}`)}
                suffix="%"
                value={draft.demandSurchargePct[d]}
                onChange={(v) => setDraft((prev) => ({ ...prev, demandSurchargePct: { ...prev.demandSurchargePct, [d]: v } }))}
                testId={`rule-demand-${d}`}
              />
            ))}
          </div>

          <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('fleetos.pricingDynamic.zoneSurcharges')}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {REGIONS.map((r) => (
              <NumberField
                key={r.key}
                label={t(`region.${r.key}`)}
                suffix=" TWD"
                value={draft.zoneSurcharges[r.key as TaiwanRegion]}
                onChange={(v) => setDraft((prev) => ({ ...prev, zoneSurcharges: { ...prev.zoneSurcharges, [r.key]: v } }))}
                testId={`rule-zone-${r.key}`}
              />
            ))}
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-[11px] font-medium text-slate-400">{t('fleetos.pricingDynamic.transparencyMessage')}</label>
            <textarea
              value={lang === 'zh' ? draft.transparencyMessageZh : draft.transparencyMessage}
              onChange={(e) => setDraft((d) => (lang === 'zh' ? { ...d, transparencyMessageZh: e.target.value } : { ...d, transparencyMessage: e.target.value }))}
              rows={2}
              data-testid="rule-transparency-message"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
            />
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button onClick={resetDraft} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10">
              {t('fleetos.pricingDynamic.discard')}
            </button>
            <button
              onClick={saveDraft}
              data-testid="pricing-save-rules"
              className="rounded-lg bg-cyan-400/15 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/25"
            >
              {t('fleetos.pricingDynamic.approveAndSave')}
            </button>
          </div>
        </div>

        <div className="glass-panel max-h-[720px] overflow-y-auto rounded-2xl p-3" data-testid="pricing-audit-log">
          <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <History className="h-3.5 w-3.5" /> {t('fleetos.pricingDynamic.auditTrail')}
          </p>
          <ol className="space-y-1.5">
            {pricingAuditLog.map((entry) => (
              <li key={entry.id} className="rounded-lg px-2 py-1.5 text-[11px] hover:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                  <span className="text-slate-500">{entry.actor}</span>
                  <span className="ml-auto shrink-0 text-slate-500">{formatRelative(entry.at, lang)}</span>
                </div>
                <p className="mt-0.5 pl-3.5 text-slate-300">{entry.action}</p>
              </li>
            ))}
            {pricingAuditLog.length === 0 && <li className="p-6 text-center text-slate-500">{t('fleetos.admin.noAuditEntries')}</li>}
          </ol>
        </div>
      </div>
    </FleetOsPage>
  )
}

function NumberField({ label, value, onChange, suffix, testId }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; testId?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          data-testid={testId}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
        />
        {suffix && <span className="shrink-0 text-[10px] text-slate-500">{suffix}</span>}
      </div>
    </label>
  )
}
