import { useMemo, useState } from 'react'
import { AlertTriangle, Plane, PlaneLanding, PlaneTakeoff, RefreshCw } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { FlightBadge } from '../../components/ui/OrderBadges'
import { formatClock } from '../../lib/format'
import type { FlightInfo, Order } from '../../types'
import { useLang } from '../../i18n'

interface FlightRow {
  flightInfo: FlightInfo
  orders: Order[]
  direction: 'ARRIVAL' | 'DEPARTURE' | 'MIXED'
  driverNames: string[]
}

const MAJOR_DELAY_MINUTES = 90

/** 航班看板 (Flight Board) — every today's flight linked to at least one
 * order, aggregated live from the shared order list (rather than a separate
 * flight feed) so it always matches what dispatch/drivers are actually
 * seeing. Mirrors the reference site's flight table: route direction,
 * terminal/gate, scheduled vs. estimated time, delay severity, linked-order
 * count, and the drivers already matched to that flight's orders. */
export default function FlightBoardPanel() {
  const { t, lang } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const refreshMinutes = useFleetStore((s) => s.operatingParams.flightBoardRefreshMinutes)
  const [lastUpdated, setLastUpdated] = useState(() => Date.now())

  const rows = useMemo<FlightRow[]>(() => {
    const groups = new Map<string, Order[]>()
    for (const order of orders) {
      if (!order.flightNumber || !order.flightInfo) continue
      const list = groups.get(order.flightNumber) ?? []
      list.push(order)
      groups.set(order.flightNumber, list)
    }

    const result: FlightRow[] = []
    for (const [, group] of groups) {
      const flightInfo = group[0].flightInfo!
      const arrivals = group.filter((o) => o.type === 'AIRPORT_PICKUP').length
      const departures = group.filter((o) => o.type === 'AIRPORT_DROPOFF').length
      const direction: FlightRow['direction'] = arrivals > 0 && departures > 0 ? 'MIXED' : departures > arrivals ? 'DEPARTURE' : 'ARRIVAL'
      const driverIds = Array.from(new Set(group.map((o) => o.driverId).filter((id): id is string => !!id)))
      const driverNames = driverIds.map((id) => {
        const d = drivers.find((dr) => dr.id === id)
        return d ? (lang === 'zh' ? d.nameZh : d.name) : id
      })
      result.push({ flightInfo, orders: group, direction, driverNames })
    }

    return result.sort((a, b) => new Date(a.flightInfo.scheduledTime).getTime() - new Date(b.flightInfo.scheduledTime).getTime())
  }, [orders, drivers, lang])

  const totalLinkedOrders = rows.reduce((sum, r) => sum + r.orders.length, 0)
  const delayedCount = rows.filter((r) => r.flightInfo.status === 'DELAYED' || r.flightInfo.status === 'DIVERTED').length
  const majorDelayCount = rows.filter((r) => r.flightInfo.status === 'DIVERTED' || (r.flightInfo.status === 'DELAYED' && r.flightInfo.delayMinutes >= MAJOR_DELAY_MINUTES)).length

  const handleRefresh = () => {
    useFleetStore.getState().tick()
    setLastUpdated(Date.now())
  }

  const rowTone = (r: FlightRow) => {
    if (r.flightInfo.status === 'DIVERTED' || (r.flightInfo.status === 'DELAYED' && r.flightInfo.delayMinutes >= MAJOR_DELAY_MINUTES)) return 'bg-red-500/[0.07]'
    if (r.flightInfo.status === 'DELAYED') return 'bg-amber-400/[0.06]'
    if (r.flightInfo.status === 'LANDED') return 'opacity-55'
    return ''
  }

  return (
    <FleetOsPage
      title={t('fleetos.flights.title')}
      subtitle={t('fleetos.flights.subtitle')}
      icon={<Plane className="h-5 w-5" />}
      right={
        <button
          onClick={handleRefresh}
          data-testid="flightboard-refresh"
          className="flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-white/15 hover:bg-white/14"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {t('fleetos.flights.refreshNow')}
        </button>
      }
    >
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Plane className="h-4 w-4" />} label={t('fleetos.flights.tracked')} value={rows.length} tone="cyan" />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label={t('fleetos.flights.delayed')} value={delayedCount} tone="amber" />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label={t('fleetos.flights.majorDelay')} value={majorDelayCount} tone="red" />
        <StatCard icon={<PlaneLanding className="h-4 w-4" />} label={t('fleetos.flights.linkedOrders')} value={totalLinkedOrders} tone="purple" />
      </div>

      <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-slate-500" data-testid="flightboard-updated-note">
        <span>{t('fleetos.flights.lastUpdated', { time: formatClock(new Date(lastUpdated).toISOString(), lang) })}</span>
        <span>{t('fleetos.flights.autoRefreshNote', { n: refreshMinutes })}</span>
      </div>

      <div className="mt-2 glass-panel overflow-hidden rounded-2xl">
        <table className="w-full text-left text-xs" data-testid="flightboard-table">
          <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">{t('fleetos.flights.colFlight')}</th>
              <th className="px-3 py-2.5">{t('fleetos.flights.colDirection')}</th>
              <th className="px-3 py-2.5">{t('fleetos.flights.colGate')}</th>
              <th className="px-3 py-2.5">{t('fleetos.flights.colScheduled')}</th>
              <th className="px-3 py-2.5">{t('fleetos.flights.colEstimated')}</th>
              <th className="px-3 py-2.5">{t('fleetos.flights.colStatus')}</th>
              <th className="px-3 py-2.5">{t('fleetos.flights.colOrders')}</th>
              <th className="px-3 py-2.5">{t('fleetos.flights.colDrivers')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.flightInfo.flightNumber} className={`border-t border-white/5 ${rowTone(r)}`} data-testid="flightboard-row">
                <td className="px-3 py-2.5">
                  <p className="font-semibold text-slate-200">{r.flightInfo.flightNumber}</p>
                  <p className="text-[10.5px] text-slate-500">{r.flightInfo.airline}</p>
                </td>
                <td className="px-3 py-2.5">
                  <Badge tone={r.direction === 'ARRIVAL' ? 'cyan' : r.direction === 'DEPARTURE' ? 'purple' : 'slate'}>
                    {r.direction === 'ARRIVAL' ? <PlaneLanding className="h-3 w-3" /> : <PlaneTakeoff className="h-3 w-3" />}
                    {t(`fleetos.flights.direction.${r.direction}`)}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-slate-400">{r.flightInfo.gate}</td>
                <td className="px-3 py-2.5 text-slate-300">{formatClock(r.flightInfo.scheduledTime, lang)}</td>
                <td className="px-3 py-2.5 text-slate-300">
                  {formatClock(r.flightInfo.estimatedTime, lang)}
                  {r.flightInfo.delayMinutes > 0 && <span className="ml-1 text-amber-400">+{r.flightInfo.delayMinutes}m</span>}
                </td>
                <td className="px-3 py-2.5">
                  <FlightBadge status={r.flightInfo.status} />
                </td>
                <td className="px-3 py-2.5 font-medium text-slate-200">{r.orders.length}</td>
                <td className="px-3 py-2.5 text-slate-400">
                  {r.driverNames.length ? r.driverNames.slice(0, 2).join('、') + (r.driverNames.length > 2 ? ` +${r.driverNames.length - 2}` : '') : t('fleetos.flights.unassigned')}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-slate-500">
                  {t('fleetos.flights.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 px-1 text-[11px] text-slate-500">{t('fleetos.flights.legendNote')}</p>
      <p className="px-1 text-[10.5px] text-slate-600">{t('fleetos.flights.dataSourceNote')}</p>
    </FleetOsPage>
  )
}
