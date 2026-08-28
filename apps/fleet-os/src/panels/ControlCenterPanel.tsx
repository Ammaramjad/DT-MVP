import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CalendarClock, Cpu, DollarSign, Gauge, Radar, ShieldAlert, Siren, UserX, Users2 } from 'lucide-react'
import { useFleetStore } from '../store/useFleetStore'
import { computeKpis } from '../lib/selectors'
import { PanelHeader } from '../components/layout/PanelHeader'
import { StatCard } from '../components/ui/StatCard'
import { OrderQueueCard } from '../components/control/OrderQueueCard'
import { DocAlerts } from '../components/control/DocAlerts'
import { NotificationFeed } from '../components/ui/NotificationFeed'
import { FleetMapView } from '../components/map/FleetMapView'
import { CapacityCalendar } from '../components/control/CapacityCalendar'
import { HourlyVolumeChart } from '../components/control/HourlyVolumeChart'
import { DriverScheduleMatrix } from '../components/control/DriverScheduleMatrix'
import { FleetRosterBreakdown } from '../components/control/FleetRosterBreakdown'
import { AnalyticsDashboard } from '../components/control/AnalyticsDashboard'
import { FleetOsNav } from '../components/fleetos/FleetOsNav'
import { EmergencyRescueDrawer } from '../components/control/EmergencyRescueDrawer'
import { useLang } from '../i18n'

type FilterKey = 'ACTIVE' | 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'ALL'

const FILTERS: { key: FilterKey; labelKey: string }[] = [
  { key: 'ACTIVE', labelKey: 'control.filter.active' },
  { key: 'NEW', labelKey: 'control.filter.new' },
  { key: 'IN_PROGRESS', labelKey: 'control.filter.inProgress' },
  { key: 'COMPLETED', labelKey: 'control.filter.completed' },
  { key: 'ALL', labelKey: 'control.filter.all' },
]

type CapacityTab = 'ANALYTICS' | 'FORECAST' | 'SCHEDULE' | 'ROSTER'

const CAPACITY_TABS: { key: CapacityTab; labelKey: string }[] = [
  { key: 'ANALYTICS', labelKey: 'control.tab.analytics' },
  { key: 'FORECAST', labelKey: 'control.tab.forecast' },
  { key: 'SCHEDULE', labelKey: 'control.tab.schedule' },
  { key: 'ROSTER', labelKey: 'control.tab.roster' },
]

export default function ControlCenterPanel() {
  const { t, lang } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const autoDispatchEnabled = useFleetStore((s) => s.autoDispatchEnabled)
  const ambientOrdersEnabled = useFleetStore((s) => s.ambientOrdersEnabled)
  const setAutoDispatch = useFleetStore((s) => s.setAutoDispatch)
  const setAmbientOrders = useFleetStore((s) => s.setAmbientOrders)
  const focusOrderId = useFleetStore((s) => s.focusOrderId)
  const setFocusOrder = useFleetStore((s) => s.setFocusOrder)

  const [filter, setFilter] = useState<FilterKey>('ACTIVE')
  const [capacityTab, setCapacityTab] = useState<CapacityTab>('ANALYTICS')
  const [emergencyDrawerOrderId, setEmergencyDrawerOrderId] = useState<string | null>(null)

  const activeEmergencyOrders = useMemo(
    () => orders.filter((o) => o.incidentReportedAt && o.emergencyStatus !== 'RESOLVED' && !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status)),
    [orders],
  )

  const kpis = useMemo(() => computeKpis(orders, drivers), [orders, drivers])

  const filteredOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => b.createdAt - a.createdAt)
    switch (filter) {
      case 'NEW':
        return sorted.filter((o) => o.status === 'CONFIRMED')
      case 'IN_PROGRESS':
        return sorted.filter((o) =>
          ['DRIVER_MATCHING', 'ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'PASSENGER_ONBOARD'].includes(o.status),
        )
      case 'COMPLETED':
        return sorted.filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED' || o.status === 'REFUNDED' || o.status === 'FAILED')
      case 'ACTIVE':
        return sorted.filter((o) => !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status))
      default:
        return sorted
    }
  }, [orders, filter])

  return (
    <div className="min-h-screen bg-mission-950 bg-noise pb-28 text-white">
      <PanelHeader
        title={t('control.title')}
        subtitle={t('control.subtitle')}
        icon={<Radar className="h-5 w-5" />}
        right={
          <div className="hidden items-center gap-2 sm:flex">
            <ToggleChip label={t('control.autoDispatch')} active={autoDispatchEnabled} onClick={() => setAutoDispatch(!autoDispatchEnabled)} icon={<Cpu className="h-3 w-3" />} />
            <ToggleChip label={t('control.liveDemoOrders')} active={ambientOrdersEnabled} onClick={() => setAmbientOrders(!ambientOrdersEnabled)} icon={<Radar className="h-3 w-3" />} />
          </div>
        }
      />

      <div className="mt-3 flex items-center gap-2 px-4 sm:hidden">
        <ToggleChip label={t('control.autoDispatch')} active={autoDispatchEnabled} onClick={() => setAutoDispatch(!autoDispatchEnabled)} icon={<Cpu className="h-3 w-3" />} />
        <ToggleChip label={t('control.liveOrders')} active={ambientOrdersEnabled} onClick={() => setAmbientOrders(!ambientOrdersEnabled)} icon={<Radar className="h-3 w-3" />} />
      </div>

      <div className="px-4 pt-3 sm:px-6">
        <FleetOsNav />
      </div>

      {/* Flashing/pulsing high-visibility emergency incident banner if any active ride reports an emergency */}
      {activeEmergencyOrders.length > 0 && (
        <div className="mt-4 px-4 sm:px-6" data-testid="emergency-incident-banner">
          {activeEmergencyOrders.map((emOrder) => {
            const origDriver = drivers.find((d) => d.id === emOrder.originalDriverId || d.id === emOrder.driverId)
            const timeElapsedSec = Math.floor((Date.now() - (emOrder.incidentReportedAt ?? Date.now())) / 1000)
            return (
              <div
                key={emOrder.id}
                className="relative overflow-hidden rounded-2xl border-2 border-rose-500 bg-rose-950/60 p-4 shadow-2xl shadow-rose-950/80 backdrop-blur-xl"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/50">
                      <Siren className="h-6 w-6 animate-pulse" />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500"></span>
                      </span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white tracking-wider">{emOrder.orderNo}</span>
                        <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 ring-1 ring-rose-500/40">
                          {emOrder.incidentType ? t(`driver.emergency.type${emOrder.incidentType === 'MEDICAL_EMERGENCY' ? 'Medical' : emOrder.incidentType === 'BREAKDOWN' ? 'Breakdown' : emOrder.incidentType === 'ROAD_BLOCK' ? 'RoadBlock' : 'Accident'}`) : 'EMERGENCY'}
                        </span>
                        <span className="text-[11px] text-rose-300/80 font-mono">+{timeElapsedSec}s</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-200">
                        {t('control.emergency.bannerMsg', {
                          driver: origDriver ? `${origDriver.name} (${origDriver.nameZh})` : 'Driver',
                          passenger: emOrder.customer.name,
                          status: emOrder.incidentDetails?.passengerSafe ? t('driver.emergency.passengerSafe') : t('driver.emergency.passengerInjured'),
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setEmergencyDrawerOrderId(emOrder.id)}
                      data-testid={`open-rescue-drawer-btn-${emOrder.orderNo}`}
                      className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-500/40 transition hover:bg-rose-600 active:scale-95"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      {emOrder.emergencyStatus === 'RESCUE_DISPATCHED' || emOrder.emergencyStatus === 'RESCUE_EN_ROUTE'
                        ? t('control.emergency.manageRescueBtn')
                        : t('control.emergency.dispatchRescueBtn')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-6">
        <StatCard icon={<Gauge className="h-4 w-4" />} label={t('control.kpi.activeOrders')} value={kpis.activeOrders} tone="cyan" />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label={t('control.kpi.unassigned')} value={kpis.unassignedOrders} tone="amber" />
        <StatCard icon={<Users2 className="h-4 w-4" />} label={t('control.kpi.availableDrivers')} value={kpis.availableDrivers} tone="purple" />
        <StatCard icon={<UserX className="h-4 w-4" />} label={t('control.kpi.anomalies')} value={kpis.anomalies} tone="red" />
        <StatCard icon={<DollarSign className="h-4 w-4" />} label={t('control.kpi.revenueToday')} value={kpis.todayRevenue} prefix="NT$" tone="lime" />
        <StatCard icon={<CalendarClock className="h-4 w-4" />} label={t('control.kpi.onLeaveToday')} value={kpis.onLeaveToday} tone="pink" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 px-4 sm:px-6 lg:grid-cols-[1.05fr_1.35fr_0.85fr]">
        <div className="glass-panel flex max-h-[640px] flex-col rounded-2xl p-3">
          <div className="mb-2 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  filter === f.key ? 'bg-cyan-400/15 text-cyan-300' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {filteredOrders.map((order) => (
                <OrderQueueCard key={order.id} order={order} focused={order.id === focusOrderId} onFocus={() => setFocusOrder(order.id)} />
              ))}
            </AnimatePresence>
            {filteredOrders.length === 0 && <p className="p-6 text-center text-xs text-slate-500">{t('control.noOrders')}</p>}
          </div>
        </div>

        <div className="glass-panel flex flex-col rounded-2xl p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('control.liveFleetMap')}</p>
            <span className="text-[11px] text-slate-500">{t('control.vehiclesEnRoute', { n: drivers.filter((d) => d.status === 'BUSY').length })}</span>
          </div>
          <div className="h-[420px] flex-1 lg:h-full">
            <FleetMapView />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="glass-panel flex flex-1 flex-col rounded-2xl p-3">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('control.notificationFeed')}</p>
            <div className="max-h-[300px] flex-1">
              <NotificationFeed limit={20} />
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-3">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('control.docAlerts')}</p>
            <DocAlerts />
          </div>
        </div>
      </div>

      <div className="mt-4 px-4 sm:px-6">
        <div className="glass-panel rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
            {CAPACITY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCapacityTab(tab.key)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  capacityTab === tab.key ? 'bg-cyan-400/15 text-cyan-300' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
            <span className="ml-auto hidden text-[10px] text-slate-500 sm:inline">{t('control.referenceNote')}</span>
          </div>

          <AnimatePresence mode="wait">
            {capacityTab === 'ANALYTICS' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AnalyticsDashboard />
              </motion.div>
            )}
            {capacityTab === 'FORECAST' && (
              <motion.div key="forecast" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                <CapacityCalendar />
                <HourlyVolumeChart />
              </motion.div>
            )}
            {capacityTab === 'SCHEDULE' && (
              <motion.div key="schedule" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <DriverScheduleMatrix />
              </motion.div>
            )}
            {capacityTab === 'ROSTER' && (
              <motion.div key="roster" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <FleetRosterBreakdown />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 px-4 text-center text-[11px] text-slate-500 sm:px-6">{t('control.footerNote')}</div>

      {/* Emergency Rescue Dispatch Drawer */}
      <AnimatePresence>
        {emergencyDrawerOrderId && (
          <EmergencyRescueDrawer
            order={orders.find((o) => o.id === emergencyDrawerOrderId) || orders[0]}
            onClose={() => setEmergencyDrawerOrderId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ToggleChip({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 transition ${
        active ? 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30' : 'bg-white/5 text-slate-400 ring-white/10'
      }`}
    >
      {icon}
      {label}
      <span className={`ml-1 h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
    </motion.button>
  )
}
