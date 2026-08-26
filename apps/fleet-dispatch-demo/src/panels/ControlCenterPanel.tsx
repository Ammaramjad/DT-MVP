import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CalendarClock, Cpu, DollarSign, Gauge, Radar, UserX, Users2 } from 'lucide-react'
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

type FilterKey = 'ACTIVE' | 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'ALL'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ACTIVE', label: 'Active' },
  { key: 'NEW', label: 'New' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'ALL', label: 'All' },
]

type CapacityTab = 'FORECAST' | 'SCHEDULE' | 'ROSTER'

const CAPACITY_TABS: { key: CapacityTab; label: string }[] = [
  { key: 'FORECAST', label: 'Capacity Forecast' },
  { key: 'SCHEDULE', label: 'Driver Schedule' },
  { key: 'ROSTER', label: 'Fleet Roster' },
]

export default function ControlCenterPanel() {
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const autoDispatchEnabled = useFleetStore((s) => s.autoDispatchEnabled)
  const ambientOrdersEnabled = useFleetStore((s) => s.ambientOrdersEnabled)
  const setAutoDispatch = useFleetStore((s) => s.setAutoDispatch)
  const setAmbientOrders = useFleetStore((s) => s.setAmbientOrders)
  const focusOrderId = useFleetStore((s) => s.focusOrderId)
  const setFocusOrder = useFleetStore((s) => s.setFocusOrder)

  const [filter, setFilter] = useState<FilterKey>('ACTIVE')
  const [capacityTab, setCapacityTab] = useState<CapacityTab>('FORECAST')

  const kpis = useMemo(() => computeKpis(orders, drivers), [orders, drivers])

  const filteredOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => b.createdAt - a.createdAt)
    switch (filter) {
      case 'NEW':
        return sorted.filter((o) => o.status === 'NEW')
      case 'IN_PROGRESS':
        return sorted.filter((o) =>
          ['PENDING_DRIVER_RESPONSE', 'ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status),
        )
      case 'COMPLETED':
        return sorted.filter((o) => o.status === 'COMPLETED' || o.status === 'CANCELLED')
      case 'ACTIVE':
        return sorted.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status))
      default:
        return sorted
    }
  }, [orders, filter])

  return (
    <div className="min-h-screen bg-mission-950 bg-noise pb-28 text-white">
      <PanelHeader
        title="Central Control System"
        subtitle="走瘋派車 · 中央調度系統 · Mission Control"
        icon={<Radar className="h-5 w-5" />}
        right={
          <div className="hidden items-center gap-2 sm:flex">
            <ToggleChip label="Auto-Dispatch" active={autoDispatchEnabled} onClick={() => setAutoDispatch(!autoDispatchEnabled)} icon={<Cpu className="h-3 w-3" />} />
            <ToggleChip label="Live Demo Orders" active={ambientOrdersEnabled} onClick={() => setAmbientOrders(!ambientOrdersEnabled)} icon={<Radar className="h-3 w-3" />} />
          </div>
        }
      />

      <div className="mt-3 flex items-center gap-2 px-4 sm:hidden">
        <ToggleChip label="Auto-Dispatch" active={autoDispatchEnabled} onClick={() => setAutoDispatch(!autoDispatchEnabled)} icon={<Cpu className="h-3 w-3" />} />
        <ToggleChip label="Live Orders" active={ambientOrdersEnabled} onClick={() => setAmbientOrders(!ambientOrdersEnabled)} icon={<Radar className="h-3 w-3" />} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-6">
        <StatCard icon={<Gauge className="h-4 w-4" />} label="Active Orders" value={kpis.activeOrders} tone="cyan" />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Unassigned" value={kpis.unassignedOrders} tone="amber" />
        <StatCard icon={<Users2 className="h-4 w-4" />} label="Available Drivers" value={kpis.availableDrivers} tone="purple" />
        <StatCard icon={<UserX className="h-4 w-4" />} label="Anomalies" value={kpis.anomalies} tone="red" />
        <StatCard icon={<DollarSign className="h-4 w-4" />} label="Revenue Today" value={kpis.todayRevenue} prefix="NT$" tone="lime" />
        <StatCard icon={<CalendarClock className="h-4 w-4" />} label="On Leave Today" value={kpis.onLeaveToday} tone="pink" />
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
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {filteredOrders.map((order) => (
                <OrderQueueCard key={order.id} order={order} focused={order.id === focusOrderId} onFocus={() => setFocusOrder(order.id)} />
              ))}
            </AnimatePresence>
            {filteredOrders.length === 0 && <p className="p-6 text-center text-xs text-slate-500">No orders in this view.</p>}
          </div>
        </div>

        <div className="glass-panel flex flex-col rounded-2xl p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Fleet Map</p>
            <span className="text-[11px] text-slate-500">{drivers.filter((d) => d.status === 'BUSY').length} vehicles en route</span>
          </div>
          <div className="h-[420px] flex-1 lg:h-full">
            <FleetMapView />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="glass-panel flex flex-1 flex-col rounded-2xl p-3">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Multi-Channel Notification Feed</p>
            <div className="max-h-[300px] flex-1">
              <NotificationFeed limit={20} />
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-3">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Driver Document Alerts</p>
            <DocAlerts />
          </div>
        </div>
      </div>

      <div className="mt-4 px-4 sm:px-6">
        <div className="glass-panel rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
            {CAPACITY_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setCapacityTab(t.key)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  capacityTab === t.key ? 'bg-cyan-400/15 text-cyan-300' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
            <span className="ml-auto hidden text-[10px] text-slate-500 sm:inline">Modelled after the reference Fleet OS scheduling dashboard</span>
          </div>

          <AnimatePresence mode="wait">
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

      <div className="mt-4 px-4 text-center text-[11px] text-slate-500 sm:px-6">
        Simulated dispatch engine · priority: owned fleet → paid members → outside contractors · pricing auto-calculated from distance, time &amp; vehicle type
      </div>
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
