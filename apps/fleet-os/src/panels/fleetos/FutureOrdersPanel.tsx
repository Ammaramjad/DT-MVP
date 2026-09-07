import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarClock,
  Plane,
  Building2,
  Ticket,
  Globe,
  Smartphone,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Zap,
  ArrowRight,
  Clock,
  DollarSign,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { TierBadge } from '../../components/ui/OrderBadges'
import { ManualAssignmentModal } from '../../components/fleetos/ManualAssignmentModal'
import { formatTWD } from '../../lib/format'
import { useLang } from '../../i18n'
import type { Order } from '../../types'
import clsx from 'clsx'

type HorizonTab = 'TOMORROW' | 'NEXT_3D' | 'NEXT_7D' | 'NEXT_30D'
type ChannelFilter = 'ALL' | 'AIRLINE' | 'HOTEL' | 'OTA' | 'CORPORATE' | 'DIRECT'
type AssignmentFilter = 'ALL' | 'UNASSIGNED' | 'ASSIGNED'

export default function FutureOrdersPanel() {
  const { lang } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)

  // Filters state
  const [horizon, setHorizon] = useState<HorizonTab>('TOMORROW')
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL')
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter] = useState<string>('ALL')

  // Pre-dispatch modal target order
  const [preAssignOrder, setPreAssignOrder] = useState<Order | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Calculate future orders matching time horizons
  const now = Date.now()
  const oneDayMs = 86400000

  // 1. All future orders across next 30 days
  const allFutureOrders = useMemo(() => {
    return orders.filter((o) => {
      const scheduledMs = new Date(o.scheduledTime).getTime()
      const diffMs = scheduledMs - now
      // Greater than 0ms and within 31 days, and not cancelled/refunded
      return diffMs > 0 && diffMs <= oneDayMs * 31 && !['CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status)
    })
  }, [orders, now])

  // Channel badge classifier helper
  const getChannelBadge = (order: Order) => {
    const notesLower = (order.notes || '').toLowerCase()
    if (order.flightNumber || notesLower.includes('flight') || notesLower.includes('airline') || order.type === 'AIRPORT_PICKUP' || order.type === 'AIRPORT_DROPOFF') {
      if (notesLower.includes('airline') || ['NH', 'JL', 'BR', 'CI', 'KE', 'SQ', 'CX', 'UA', 'AF', 'LH'].some((code) => order.flightNumber?.startsWith(code))) {
        return {
          key: 'AIRLINE' as const,
          label: lang === 'zh' ? '✈️ 航空預約 (EVA/China Airlines)' : '✈️ Airline Pre-Booking',
          color: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
        }
      }
    }
    if (notesLower.includes('hotel') || notesLower.includes('hyatt') || notesLower.includes('w hotel') || order.dropoff.name.includes('Hyatt') || order.dropoff.name.includes('W Hotel')) {
      return {
        key: 'HOTEL' as const,
        label: lang === 'zh' ? '🏨 五星飯店禮賓 (W Hotel/Grand Hyatt)' : '🏨 5-Star Hotel VIP Concierge',
        color: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
      }
    }
    if (['KKday', 'Klook', 'ezTravel', 'Booking.com'].includes(order.channel)) {
      return {
        key: 'OTA' as const,
        label: lang === 'zh' ? `🎟️ OTA 旅遊平台 (${order.channel})` : `🎟️ OTA Travel (${order.channel})`,
        color: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
      }
    }
    if (notesLower.includes('tsmc') || notesLower.includes('mediatek') || notesLower.includes('b2b') || notesLower.includes('science park') || notesLower.includes('procurement') || notesLower.includes('corporate')) {
      return {
        key: 'CORPORATE' as const,
        label: lang === 'zh' ? '🏢 企業差旅 (TSMC/MediaTek B2B)' : '🏢 Corporate B2B (TSMC/MediaTek)',
        color: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
      }
    }
    return {
      key: 'DIRECT' as const,
      label: lang === 'zh' ? '📱 官網 / App 旅客直訂' : '📱 Web / Passenger Mobile App',
      color: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
    }
  }

  // Filtered future orders based on active Horizon Tab, channel, search, and assignment
  const filteredOrders = useMemo(() => {
    return allFutureOrders.filter((order) => {
      const scheduledMs = new Date(order.scheduledTime).getTime()
      const diffMs = scheduledMs - now

      // 1. Horizon filter
      if (horizon === 'TOMORROW') {
        // Today to tomorrow end (up to 48 hours)
        if (diffMs > oneDayMs * 2) return false
      } else if (horizon === 'NEXT_3D') {
        if (diffMs > oneDayMs * 3) return false
      } else if (horizon === 'NEXT_7D') {
        if (diffMs > oneDayMs * 7) return false
      } else if (horizon === 'NEXT_30D') {
        if (diffMs > oneDayMs * 31) return false
      }

      // 2. Channel filter
      if (channelFilter !== 'ALL') {
        const badge = getChannelBadge(order)
        if (badge.key !== channelFilter) return false
      }

      // 3. Assignment filter
      const isAssigned = !!order.driverId && order.status === 'ASSIGNED'
      if (assignmentFilter === 'UNASSIGNED' && isAssigned) return false
      if (assignmentFilter === 'ASSIGNED' && !isAssigned) return false

      // 4. Vehicle category
      if (categoryFilter !== 'ALL' && order.vehicleCategory !== categoryFilter) return false

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchOrderNo = order.orderNo.toLowerCase().includes(q)
        const matchCustomer = order.customer.name.toLowerCase().includes(q) || (order.customer.phone && order.customer.phone.includes(q))
        const matchRoute = order.pickup.name.toLowerCase().includes(q) || order.dropoff.name.toLowerCase().includes(q)
        const matchFlight = order.flightNumber?.toLowerCase().includes(q)
        const matchNotes = order.notes?.toLowerCase().includes(q)
        if (!matchOrderNo && !matchCustomer && !matchRoute && !matchFlight && !matchNotes) return false
      }

      return true
    }).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
  }, [allFutureOrders, horizon, channelFilter, assignmentFilter, categoryFilter, searchQuery, now])

  // Summary Metrics for current Horizon
  const horizonTotalOrders = filteredOrders.length
  const horizonAssignedCount = filteredOrders.filter((o) => !!o.driverId && o.status === 'ASSIGNED').length
  const horizonUnassignedCount = horizonTotalOrders - horizonAssignedCount
  const horizonAssignedRate = horizonTotalOrders > 0 ? Math.round((horizonAssignedCount / horizonTotalOrders) * 100) : 100
  const horizonTotalRevenue = filteredOrders.reduce((sum, o) => sum + (o.priceEstimate || 0), 0)

  return (
    <FleetOsPage
      title={lang === 'zh' ? '未來預約訂單與預先調度中心' : 'Future Scheduled Orders & Pre-Dispatch Hub'}
      subtitle={lang === 'zh' ? '跨平台預約訂單全島排程、時程衝突防呆檢核與 1-Click 預先指派' : 'Advance bookings management, airline/hotel/OTA origin channels & 1-click pre-dispatch'}
      icon={<CalendarClock className="h-5 w-5 text-cyan-400" />}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] rounded-2xl bg-emerald-950/95 border border-emerald-400/60 px-5 py-3 text-xs font-bold text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.35)] flex items-center gap-2.5 backdrop-blur-xl"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary KPI Cards for Current Horizon */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="future-orders-kpi-grid">
        <StatCard
          icon={<CalendarClock className="h-4 w-4" />}
          label={lang === 'zh' ? '未來預約總單數' : 'Total Future Orders'}
          value={horizonTotalOrders}
          tone="cyan"
          testId="future-kpi-total-orders"
        />
        <StatCard
          icon={<UserCheck className="h-4 w-4" />}
          label={lang === 'zh' ? '已預先指派率 %' : 'Assigned Rate %'}
          value={horizonAssignedRate}
          suffix="%"
          tone="lime"
          testId="future-kpi-assigned-rate"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label={lang === 'zh' ? '待派遣預約單' : 'Unassigned Orders'}
          value={horizonUnassignedCount}
          tone="amber"
          active={assignmentFilter === 'UNASSIGNED'}
          activeFilterTag={lang === 'zh' ? '待指派' : 'UNASSIGNED'}
          onClick={() => setAssignmentFilter(assignmentFilter === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
          testId="future-kpi-unassigned"
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label={lang === 'zh' ? '預約總營收預估' : 'Pre-booked Revenue'}
          value={horizonTotalRevenue}
          prefix="NT$"
          tone="purple"
          testId="future-kpi-revenue"
        />
      </div>

      {/* Color-Coded Horizon Tabs */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto" data-testid="horizon-tabs">
          <button
            type="button"
            onClick={() => setHorizon('TOMORROW')}
            data-testid="horizon-tab-tomorrow"
            className={clsx(
              'flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all shadow-md',
              horizon === 'TOMORROW'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-400'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5',
            )}
          >
            <span>🟢</span>
            <span>{lang === 'zh' ? '明日預約 (Tomorrow)' : 'Tomorrow'}</span>
          </button>

          <button
            type="button"
            onClick={() => setHorizon('NEXT_3D')}
            data-testid="horizon-tab-next-3d"
            className={clsx(
              'flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all shadow-md',
              horizon === 'NEXT_3D'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-cyan-500/25 ring-2 ring-cyan-400'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5',
            )}
          >
            <span>🔵</span>
            <span>{lang === 'zh' ? '未來 3 日 (Next 3 Days)' : 'Next 3 Days'}</span>
          </button>

          <button
            type="button"
            onClick={() => setHorizon('NEXT_7D')}
            data-testid="horizon-tab-next-7d"
            className={clsx(
              'flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all shadow-md',
              horizon === 'NEXT_7D'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-purple-500/25 ring-2 ring-purple-400'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5',
            )}
          >
            <span>🟣</span>
            <span>{lang === 'zh' ? '未來 7 日 (Next 7 Days)' : 'Next 7 Days'}</span>
          </button>

          <button
            type="button"
            onClick={() => setHorizon('NEXT_30D')}
            data-testid="horizon-tab-next-30d"
            className={clsx(
              'flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all shadow-md',
              horizon === 'NEXT_30D'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/25 ring-2 ring-orange-400'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5',
            )}
          >
            <span>🟠</span>
            <span>{lang === 'zh' ? '本月預約總覽 (Next 30 Days)' : 'Next 30 Days'}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'zh' ? '搜尋預約姓名、航班、路線…' : 'Search passenger, flight, route…'}
            data-testid="future-orders-search-input"
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
          />
        </div>
      </div>

      {/* Secondary Channel and Assignment Badges Strip */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
        {/* Origin Channel Pills */}
        <div className="flex flex-wrap items-center gap-1.5" data-testid="channel-badges-filter">
          <span className="text-[11px] font-bold text-slate-400 mr-1">{lang === 'zh' ? '來源通路:' : 'Channel:'}</span>
          {[
            { key: 'ALL', labelZh: '全部通路', labelEn: 'All Channels', icon: Globe },
            { key: 'AIRLINE', labelZh: '✈️ 航空預約 (EVA/China Airlines)', labelEn: '✈️ Airlines', icon: Plane },
            { key: 'HOTEL', labelZh: '🏨 五星飯店 (W Hotel/Hyatt)', labelEn: '🏨 5-Star Hotel', icon: Building2 },
            { key: 'OTA', labelZh: '🎟️ OTA (Klook/KKday/ezTravel)', labelEn: '🎟️ OTA Travel', icon: Ticket },
            { key: 'CORPORATE', labelZh: '🏢 企業 B2B (TSMC/聯發科)', labelEn: '🏢 TSMC / B2B', icon: Building2 },
            { key: 'DIRECT', labelZh: '📱 官網/App 直訂', labelEn: '📱 Web/App Direct', icon: Smartphone },
          ].map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setChannelFilter(c.key as ChannelFilter)}
              data-testid={`channel-filter-${c.key.toLowerCase()}`}
              className={clsx(
                'rounded-xl px-2.5 py-1 text-[11px] font-medium transition flex items-center gap-1 border',
                channelFilter === c.key
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-sm shadow-cyan-500/20 font-bold'
                  : 'bg-white/[0.03] text-slate-400 border-white/5 hover:text-white hover:bg-white/[0.08]',
              )}
            >
              <span>{lang === 'zh' ? c.labelZh : c.labelEn}</span>
            </button>
          ))}
        </div>

        {/* Assignment Status Filter Buttons */}
        <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] p-1 border border-white/5">
          <button
            type="button"
            onClick={() => setAssignmentFilter('ALL')}
            className={clsx(
              'rounded-lg px-2.5 py-1 text-[11px] font-bold transition',
              assignmentFilter === 'ALL' ? 'bg-cyan-500/30 text-cyan-200' : 'text-slate-400 hover:text-white',
            )}
          >
            {lang === 'zh' ? '全部狀態' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setAssignmentFilter('UNASSIGNED')}
            data-testid="filter-unassigned-badge-btn"
            className={clsx(
              'rounded-lg px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1',
              assignmentFilter === 'UNASSIGNED'
                ? 'bg-rose-500/30 text-rose-200 border border-rose-500/40'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span>{lang === 'zh' ? '待指派 (Needs Dispatch)' : 'Needs Dispatch'}</span>
          </button>
          <button
            type="button"
            onClick={() => setAssignmentFilter('ASSIGNED')}
            className={clsx(
              'rounded-lg px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1',
              assignmentFilter === 'ASSIGNED'
                ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{lang === 'zh' ? '已排定 (Assigned)' : 'Assigned'}</span>
          </button>
        </div>
      </div>

      {/* Orders Cards Grid */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5" data-testid="future-orders-card-grid">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900/60 p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-cyan-400/80 mb-3" />
            <h3 className="text-base font-bold text-white">
              {lang === 'zh' ? '目前無符合條件的未來預約訂單' : 'No Future Orders Found in this View'}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {lang === 'zh' ? '請嘗試切換其他預約時間週期、來源通路或清除搜尋字串。' : 'Try switching horizon tabs or clearing search filters.'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const channelBadge = getChannelBadge(order)
            const isAssigned = !!order.driverId && order.status === 'ASSIGNED'
            const assignedDriver = isAssigned ? drivers.find((d) => d.id === order.driverId) : null
            const assignedVehicle = isAssigned && assignedDriver ? vehicles.find((v) => v.id === assignedDriver.vehicleId) : null
            const scheduledDate = new Date(order.scheduledTime)

            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                data-testid={`future-order-card-${order.id}`}
                className={clsx(
                  'relative flex flex-col justify-between rounded-3xl border p-4 shadow-xl backdrop-blur-xl transition hover:border-cyan-400/50',
                  isAssigned
                    ? 'border-emerald-500/30 bg-slate-950/80 shadow-emerald-950/20'
                    : 'border-rose-500/40 bg-slate-950/90 shadow-[0_0_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30',
                )}
              >
                {/* Card Top: Date & Flight / Channel Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-cyan-300">
                          {order.orderNo}
                        </span>
                        <span className="text-[11px] font-mono text-slate-300 font-bold bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-cyan-400" />
                          {scheduledDate.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric', weekday: 'short' })} · {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className={clsx('rounded-lg px-2 py-0.5 text-[10.5px] font-bold border', channelBadge.color)}>
                          {channelBadge.label}
                        </span>
                        {order.flightNumber && (
                          <span className="rounded-lg bg-sky-950/80 border border-sky-400/40 px-2 py-0.5 text-[10.5px] font-mono font-bold text-sky-200 flex items-center gap-1">
                            <Plane className="h-3 w-3" />
                            {order.flightNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Prominent Assignment Status Badge */}
                    {isAssigned ? (
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 px-2.5 py-1 text-[10.5px] font-bold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{lang === 'zh' ? '已排定司機' : 'Assigned'}</span>
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1 rounded-full bg-rose-500/25 border border-rose-400/60 px-2.5 py-1 text-[10.5px] font-black text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{lang === 'zh' ? '待派遣預約' : 'Needs Dispatch'}</span>
                      </span>
                    )}
                  </div>

                  {/* Route & Passenger Info */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-white font-medium">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="h-3 w-0.5 bg-white/20" />
                        <span className="h-2 w-2 rounded-full bg-rose-400" />
                      </div>
                      <div className="truncate space-y-0.5 flex-1">
                        <p className="truncate text-slate-300"><span className="text-slate-500 text-[10px]">PICKUP:</span> {order.pickup.name}</p>
                        <p className="truncate text-white font-bold"><span className="text-slate-500 text-[10px]">DROPOFF:</span> {order.dropoff.name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.03] p-2.5 text-xs border border-white/5">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{lang === 'zh' ? '乘客姓名 & 電話' : 'Passenger'}</p>
                        <p className="font-bold text-white truncate mt-0.5">{order.customer.name}</p>
                        <p className="text-[10.5px] font-mono text-slate-400 truncate">{order.customer.phone || '+886 912-345-678'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{lang === 'zh' ? '車種 & 預估車資' : 'Tier & Fare'}</p>
                        <p className="font-bold text-cyan-300 truncate mt-0.5">{order.vehicleCategory.replace('_', ' ')}</p>
                        <p className="text-sm font-black text-emerald-400 font-mono">{formatTWD(order.priceEstimate)}</p>
                      </div>
                    </div>

                    {order.notes && (
                      <p className="rounded-xl bg-white/[0.02] border border-white/5 px-2.5 py-1.5 text-[11px] text-slate-300 line-clamp-2">
                        💬 {order.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Assigned Driver Details OR 1-Click Pre-Dispatch Action */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  {isAssigned && assignedDriver ? (
                    <div className="flex items-center justify-between gap-2 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 p-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg border border-white/10">
                          {assignedDriver.avatarEmoji}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{lang === 'zh' ? assignedDriver.nameZh : assignedDriver.name}</span>
                            <TierBadge tier={assignedDriver.tier} />
                          </div>
                          <p className="text-[10.5px] text-emerald-300 font-mono">
                            {assignedVehicle ? `${assignedVehicle.plate} · ` : ''}
                            {assignedDriver.workingHours ? `${assignedDriver.workingHours.shiftStart}-${assignedDriver.workingHours.shiftEnd}` : '09:00-18:00'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreAssignOrder(order)}
                        data-testid={`change-driver-btn-${order.orderNo}`}
                        className="rounded-xl bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 transition"
                      >
                        {lang === 'zh' ? '更換司機' : 'Reassign'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPreAssignOrder(order)}
                      data-testid={`preassign-btn-${order.orderNo}`}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-purple-600 to-cyan-500 py-2.5 px-3 text-xs font-black text-white shadow-lg shadow-rose-500/25 transition hover:brightness-110 active:scale-[0.98]"
                    >
                      <Zap className="h-4 w-4" />
                      <span>{lang === 'zh' ? '預先指派司機 (Pre-Assign Chauffeur)' : 'Pre-Assign Driver'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Interactive 1-Click Pre-Dispatch Assignment Modal */}
      {preAssignOrder && (
        <ManualAssignmentModal
          isOpen={!!preAssignOrder}
          order={preAssignOrder}
          onClose={() => {
            setPreAssignOrder(null)
            showToast(
              lang === 'zh'
                ? `✅ 預約訂單已順利指派完成！`
                : `✅ Advance booking successfully assigned!`,
            )
          }}
        />
      )}
    </FleetOsPage>
  )
}
