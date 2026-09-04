import { useMemo, useState } from 'react'
import { AlertTriangle, Plane, PlaneLanding, PlaneTakeoff, RefreshCw, Sliders, CheckCircle2 } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FlightBadge } from '../../components/ui/OrderBadges'
import { formatClock } from '../../lib/format'
import type { FlightInfo, FlightStatusKind, Order } from '../../types'
import { useLang } from '../../i18n'
import { AnimatePresence, motion } from 'framer-motion'

interface FlightRow {
  flightInfo: FlightInfo
  orders: Order[]
  direction: 'ARRIVAL' | 'DEPARTURE' | 'MIXED'
  driverNames: string[]
}

const MAJOR_DELAY_MINUTES = 90

export default function FlightBoardPanel() {
  const { t, lang } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const refreshMinutes = useFleetStore((s) => s.operatingParams.flightBoardRefreshMinutes)
  const simulateFlightRadarUpdate = useFleetStore((s) => s.simulateFlightRadarUpdate)
  const [lastUpdated, setLastUpdated] = useState(() => Date.now())
  const [actionAlert, setActionAlert] = useState<string | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<FlightInfo | null>(null)
  const [customDelayMin, setCustomDelayMin] = useState(45)

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
    setActionAlert(lang === 'zh' ? '已刷新即時雷達飛航數據與抵達時間。' : 'Flight radar & estimated ETA synced.')
    setTimeout(() => setActionAlert(null), 3000)
  }

  const handleSimulateFlight = (flightNumber: string, status: FlightStatusKind, delayMinutes?: number) => {
    simulateFlightRadarUpdate(flightNumber, status, delayMinutes)
    setActionAlert(
      lang === 'zh'
        ? `航班 ${flightNumber} 雷達狀態已更新為【${status}】${delayMinutes ? ` (+${delayMinutes}分鐘)` : ''}，接送司機與訂單已同步。`
        : `Flight ${flightNumber} radar updated to [${status}]${delayMinutes ? ` (+${delayMinutes}m)` : ''}. Driver & passengers updated.`,
    )
    setTimeout(() => setActionAlert(null), 4000)
    setSelectedFlight(null)
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
      {/* Action Alert Banner */}
      <AnimatePresence>
        {actionAlert && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mb-4 mt-2 flex items-center justify-between gap-3 rounded-2xl border border-cyan-500/40 bg-cyan-950/80 p-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-xl"
            data-testid="flightboard-action-alert"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0" />
              <p className="text-sm font-bold text-cyan-200">{actionAlert}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionAlert(null)}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-200"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
              <th className="px-3 py-2.5 text-right">{lang === 'zh' ? '模擬雷達 (Simulate)' : 'Simulate'}</th>
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
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSimulateFlight(r.flightInfo.flightNumber, 'DELAYED', 45)}
                      data-testid={`simulate-delay-${r.flightInfo.flightNumber}`}
                      className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                      title={lang === 'zh' ? '模擬延誤+45分' : 'Simulate +45m Delay'}
                    >
                      +45m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulateFlight(r.flightInfo.flightNumber, 'LANDED')}
                      data-testid={`simulate-landed-${r.flightInfo.flightNumber}`}
                      className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
                      title={lang === 'zh' ? '模擬已降落' : 'Simulate Landed'}
                    >
                      {lang === 'zh' ? '降落' : 'Landed'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFlight(r.flightInfo)}
                      data-testid={`simulate-modal-${r.flightInfo.flightNumber}`}
                      className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                      title={lang === 'zh' ? '自訂雷達' : 'Custom'}
                    >
                      <Sliders className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-slate-500">
                  {t('fleetos.flights.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 px-1 text-[11px] text-slate-500">{t('fleetos.flights.legendNote')}</p>
      <p className="px-1 text-[10.5px] text-slate-600">{t('fleetos.flights.dataSourceNote')}</p>

      {/* Flight Radar Simulation Custom Modal */}
      {selectedFlight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl shadow-cyan-500/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Plane className="h-6 w-6 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">{selectedFlight.flightNumber} ({selectedFlight.airline})</h3>
                  <p className="text-xs text-slate-400">Gate {selectedFlight.gate}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFlight(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300">
                  {lang === 'zh' ? '選擇雷達狀態 (Radar Status)' : 'Select Flight Status'}
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(['ON_TIME', 'DELAYED', 'LANDED', 'DIVERTED'] as FlightStatusKind[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleSimulateFlight(selectedFlight.flightNumber, st, st === 'DELAYED' ? customDelayMin : 0)}
                      className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left text-xs font-bold text-white hover:border-cyan-400 hover:bg-cyan-500/10"
                    >
                      <FlightBadge status={st} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">
                  {lang === 'zh' ? `自訂延誤時間: +${customDelayMin} 分鐘` : `Custom Delay: +${customDelayMin} min`}
                </label>
                <input
                  type="range"
                  min={10}
                  max={240}
                  step={5}
                  value={customDelayMin}
                  onChange={(e) => setCustomDelayMin(Number(e.target.value))}
                  className="mt-2 w-full accent-cyan-400"
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                  <span>+10m</span>
                  <span>+60m</span>
                  <span>+120m</span>
                  <span>+240m (Major)</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setSelectedFlight(null)}
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </Button>
                <Button
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                  onClick={() => handleSimulateFlight(selectedFlight.flightNumber, 'DELAYED', customDelayMin)}
                >
                  {lang === 'zh' ? `確認設定 (+${customDelayMin}分)` : `Confirm Delay (+${customDelayMin}m)`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </FleetOsPage>
  )
}
