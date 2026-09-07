import { useState, useMemo } from 'react'
import type { DragEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Flame,
  MapPin,
  Search,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { TierBadge, FlightBadge } from '../../components/ui/OrderBadges'
import { evaluateDriverOrderConflict, type ConflictCheckResult } from '../../lib/scheduleConflict'
import { formatTWD, formatClock } from '../../lib/format'
import { useLang } from '../../i18n'
import type { Driver, Order } from '../../types'
import clsx from 'clsx'

export default function DispatchBoardPanel() {
  const { lang, t } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const forceAssignOrder = useFleetStore((s) => s.forceAssignOrder)

  // Filters & State
  const [orderQuery, setOrderQuery] = useState('')
  const [driverQuery, setDriverQuery] = useState('')
  const [driverStatusFilter, setDriverStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'BUSY' | 'ON_SHIFT'>('ALL')
  const [orderCategoryFilter] = useState<string>('ALL')
  const [timeHorizonFilter, setTimeHorizonFilter] = useState<'ALL' | 'TOMORROW' | 'NEXT_3D' | 'NEXT_7D' | 'NEXT_30D'>('ALL')
  const [channelFilter, setChannelFilter] = useState<string>('ALL')

  // Drag state
  const [draggedOrder, setDraggedOrder] = useState<Order | null>(null)
  const [draggedDriver, setDraggedDriver] = useState<Driver | null>(null)
  const [hoveredTargetDriverId, setHoveredTargetDriverId] = useState<string | null>(null)
  const [hoveredTargetOrderId, setHoveredTargetOrderId] = useState<string | null>(null)

  // Conflict confirmation dialog state
  const [pendingAssignment, setPendingAssignment] = useState<{
    order: Order
    driver: Driver
    conflict: ConflictCheckResult
  } | null>(null)

  const [assignmentToast, setAssignmentToast] = useState<{
    type: 'SUCCESS' | 'WARNING'
    title: string
    message: string
  } | null>(null)

  const showToast = (type: 'SUCCESS' | 'WARNING', title: string, message: string) => {
    setAssignmentToast({ type, title, message })
    setTimeout(() => {
      setAssignmentToast(null)
    }, 4000)
  }

  // 1. Filtered unassigned / pending orders for the Orders shelf
  const unassignedOrders = useMemo(() => {
    const now = Date.now()
    const oneDayMs = 86400000

    return orders
      .filter((o) => {
        const isPending = ['CONFIRMED', 'DRIVER_MATCHING'].includes(o.status)
        if (!isPending) return false
        if (orderCategoryFilter !== 'ALL' && o.vehicleCategory !== orderCategoryFilter) return false

        // Channel filter
        if (channelFilter !== 'ALL') {
          if (channelFilter === 'AIRLINE_FLIGHT' && !o.flightNumber && !o.notes.includes('Airline')) return false
          if (channelFilter === 'HOTEL' && !o.notes.includes('Hotel')) return false
          if (channelFilter === 'OTA' && !['KKday', 'Klook', 'ezTravel', 'Booking.com'].includes(o.channel)) return false
          if (channelFilter === 'CORPORATE' && !o.notes.includes('TSMC') && !o.notes.includes('Corporate') && !o.notes.includes('Science Park')) return false
          if (channelFilter === 'DIRECT' && !['Website', 'LINE@'].includes(o.channel)) return false
        }

        // Time horizon filter
        if (timeHorizonFilter !== 'ALL') {
          const scheduledMs = new Date(o.scheduledTime).getTime()
          const diffMs = scheduledMs - now
          if (timeHorizonFilter === 'TOMORROW') {
            if (diffMs < 0 || diffMs > oneDayMs * 2) return false
          } else if (timeHorizonFilter === 'NEXT_3D') {
            if (diffMs < 0 || diffMs > oneDayMs * 3) return false
          } else if (timeHorizonFilter === 'NEXT_7D') {
            if (diffMs < 0 || diffMs > oneDayMs * 7) return false
          } else if (timeHorizonFilter === 'NEXT_30D') {
            if (diffMs < 0 || diffMs > oneDayMs * 30) return false
          }
        }

        if (orderQuery.trim()) {
          const q = orderQuery.toLowerCase()
          return (
            o.orderNo.toLowerCase().includes(q) ||
            o.customer.name.toLowerCase().includes(q) ||
            o.pickup.name.toLowerCase().includes(q) ||
            o.dropoff.name.toLowerCase().includes(q) ||
            (o.flightNumber && o.flightNumber.toLowerCase().includes(q)) ||
            (o.notes && o.notes.toLowerCase().includes(q))
          )
        }
        return true
      })
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
  }, [orders, orderCategoryFilter, orderQuery, timeHorizonFilter, channelFilter])

  // 2. Filtered drivers list with active trips count
  const filteredDrivers = useMemo(() => {
    return drivers
      .map((d) => {
        const vehicle = vehicles.find((v) => v.id === d.vehicleId)
        const assignedOrders = orders.filter(
          (o) =>
            o.driverId === d.id &&
            !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status),
        )
        return {
          driver: d,
          vehicle,
          assignedOrders,
          assignedCount: assignedOrders.length,
        }
      })
      .filter(({ driver: d, vehicle: v }) => {
        if (driverStatusFilter === 'AVAILABLE' && d.status !== 'AVAILABLE') return false
        if (driverStatusFilter === 'BUSY' && d.status !== 'BUSY') return false
        if (driverStatusFilter === 'ON_SHIFT' && !d.workingHours?.onShift) return false

        if (driverQuery.trim()) {
          const q = driverQuery.toLowerCase()
          return (
            d.name.toLowerCase().includes(q) ||
            d.nameZh.includes(q) ||
            d.phone.includes(q) ||
            (v && v.plate.toLowerCase().includes(q))
          )
        }
        return true
      })
      .sort((a, b) => {
        if (a.driver.status === 'AVAILABLE' && b.driver.status !== 'AVAILABLE') return -1
        if (a.driver.status !== 'AVAILABLE' && b.driver.status === 'AVAILABLE') return 1
        return a.assignedCount - b.assignedCount
      })
  }, [drivers, vehicles, orders, driverStatusFilter, driverQuery])

  // Execute assignment with Instant Conflict Guard
  const handleAssign = (order: Order, driver: Driver, skipGuard = false) => {
    const conflict = evaluateDriverOrderConflict(driver, order, orders)

    if (conflict.hasConflict && !skipGuard) {
      // Trigger interactive conflict override dialog
      setPendingAssignment({ order, driver, conflict })
      return
    }

    // Direct conflict-free assign or force override
    forceAssignOrder(order.id, driver.id)
    setPendingAssignment(null)
    setDraggedOrder(null)
    setDraggedDriver(null)
    setHoveredTargetDriverId(null)
    setHoveredTargetOrderId(null)

    showToast(
      conflict.hasConflict ? 'WARNING' : 'SUCCESS',
      lang === 'zh' ? '✅ 派單成功' : '✅ Assignment Confirmed',
      lang === 'zh'
        ? `已成功將訂單 ${order.orderNo} 指派給司機 ${driver.nameZh || driver.name}${conflict.hasConflict ? ' (已強制覆寫衝突)' : ''}`
        : `Order ${order.orderNo} assigned to ${driver.name}${conflict.hasConflict ? ' (override)' : ''}`,
    )
  }

  return (
    <FleetOsPage
      title={lang === 'zh' ? '雙向拖曳派車看板 (Order ↔ Driver Dispatch Board)' : 'Interactive Drag & Drop Dispatch Board'}
      subtitle={
        lang === 'zh'
          ? '直覺雙向拖曳派單 · 1-Click 快速指派 · 2小時重疊與司機班表衝突即時防護機制'
          : 'Dual-way Drag & Drop Assignment (Order ↔ Driver) with Instant 2-Hour Conflict Guard & Shift Verification'
      }
      icon={<ArrowLeftRight className="h-5 w-5 text-cyan-400" />}
      right={
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 text-xs font-mono text-cyan-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span>{unassignedOrders.length} {lang === 'zh' ? '筆待派訂單' : 'Pending Orders'}</span>
          </span>
        </div>
      }
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {assignmentToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={clsx(
              'fixed top-20 right-6 z-[900] max-w-md rounded-2xl p-4 shadow-2xl border backdrop-blur-xl',
              assignmentToast.type === 'SUCCESS'
                ? 'bg-emerald-950/90 border-emerald-400/40 text-emerald-200 shadow-emerald-950/80'
                : 'bg-amber-950/90 border-amber-400/40 text-amber-200 shadow-amber-950/80',
            )}
            data-testid="dispatch-assignment-toast"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-base">
                {assignmentToast.type === 'SUCCESS' ? '🚀' : '⚠️'}
              </span>
              <div className="flex-1 min-w-0">
                <h5 className="font-bold text-sm text-white">{assignmentToast.title}</h5>
                <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{assignmentToast.message}</p>
              </div>
              <button
                onClick={() => setAssignmentToast(null)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Board Container */}
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-12 select-none" data-testid="dispatch-board-container">
        {/* LEFT COLUMN: ORDERS SHELF (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col h-[calc(100vh-185px)] min-h-[580px] rounded-2xl border border-white/10 bg-slate-950/90 backdrop-blur-xl p-3.5 shadow-2xl overflow-hidden">
          {/* Header & Controls */}
          <div className="border-b border-white/10 pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold text-xs">
                  📦
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{lang === 'zh' ? '待指派訂單庫' : 'Unassigned Orders Shelf'}</span>
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.2 text-[10.5px] font-mono text-cyan-300">
                      {unassignedOrders.length}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {lang === 'zh' ? '可拖曳訂單至右側司機，或將司機拖曳至此處' : 'Drag order onto driver or drag driver onto order'}
                  </p>
                </div>
              </div>
              <NavLink
                to="/fleet-os/future-orders"
                data-testid="link-to-future-orders-center"
                className="flex items-center gap-1 rounded-xl bg-cyan-500/15 border border-cyan-400/30 px-2.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/25 transition"
              >
                <span>📅 {lang === 'zh' ? '預約中心' : 'Future Hub'}</span>
                <span className="text-xs">➔</span>
              </NavLink>
            </div>

            <div className="mt-3 space-y-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder={lang === 'zh' ? '搜尋訂單號、乘客、航班 (如 CI006)、來源…' : 'Search orders, routes, flight, source…'}
                  data-testid="dispatch-order-search-input"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
                />
              </div>

              {/* Future Booking Date & Channel Horizon Quick Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Time Horizon Pills */}
                <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/5 text-[10px] overflow-x-auto">
                  {[
                    { key: 'ALL', labelZh: '全部日期', labelEn: 'All' },
                    { key: 'TOMORROW', labelZh: '明日預約', labelEn: 'Tomorrow' },
                    { key: 'NEXT_3D', labelZh: '未來3天', labelEn: 'Next 3D' },
                    { key: 'NEXT_7D', labelZh: '未來7天', labelEn: 'Next 7D' },
                    { key: 'NEXT_30D', labelZh: '未來30天', labelEn: 'Next 30D' },
                  ].map((h) => (
                    <button
                      key={h.key}
                      type="button"
                      onClick={() => setTimeHorizonFilter(h.key as any)}
                      data-testid={`dispatch-horizon-filter-${h.key.toLowerCase()}`}
                      className={clsx(
                        'rounded-lg px-2 py-0.5 font-bold transition shrink-0',
                        timeHorizonFilter === h.key
                          ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-sm'
                          : 'text-slate-400 hover:text-white',
                      )}
                    >
                      {lang === 'zh' ? h.labelZh : h.labelEn}
                    </button>
                  ))}
                </div>

                {/* Channel Source Dropdown */}
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  data-testid="dispatch-channel-source-filter"
                  className="rounded-xl border border-white/10 bg-slate-900/90 px-2 py-1 text-[10.5px] text-slate-200 outline-none focus:border-cyan-400/40"
                >
                  <option value="ALL">{lang === 'zh' ? '全通路來源 (All Sources)' : 'All Channel Sources'}</option>
                  <option value="AIRLINE_FLIGHT">{lang === 'zh' ? '✈️ 航空預約接送 (Airline Flight)' : 'Airline Flight Pre-booking'}</option>
                  <option value="HOTEL">{lang === 'zh' ? '🏨 飯店禮賓接待 (Hotel Concierge)' : 'Hotel Concierge'}</option>
                  <option value="OTA">{lang === 'zh' ? '🎫 Klook / KKday / OTA' : 'Klook/KKday OTA'}</option>
                  <option value="CORPORATE">{lang === 'zh' ? '🏢 台積電/企業商務差旅 (B2B)' : 'TSMC/Corporate B2B'}</option>
                  <option value="DIRECT">{lang === 'zh' ? '📱 官網/LINE@ 直客預約' : 'Web/App Booking'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Draggable Orders List */}
          <div
            className="flex-1 overflow-y-auto pt-3 space-y-2.5 pr-1 scrollbar-thin"
            data-testid="orders-shelf-list"
          >
            {unassignedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2 opacity-60" />
                <p className="font-bold text-slate-400">{lang === 'zh' ? '所有訂單皆已派遣完成！' : 'All orders dispatched!'}</p>
                <p className="text-[11px] mt-1">{lang === 'zh' ? '即時排程庫目前無待處理訂單' : 'No pending unassigned orders'}</p>
              </div>
            ) : (
              unassignedOrders.map((order) => {
                const isDraggingThisOrder = draggedOrder?.id === order.id
                const isTargetForDriverDrag = hoveredTargetOrderId === order.id && !!draggedDriver
                
                // Real-time conflict preview if hovering a dragged driver over this order
                const dragConflict = draggedDriver ? evaluateDriverOrderConflict(draggedDriver, order, orders) : null

                return (
                  <div
                    key={order.id}
                    draggable
                    onDragStart={(e: DragEvent<HTMLDivElement>) => {
                      setDraggedOrder(order)
                      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'ORDER', id: order.id }))
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => {
                      setDraggedOrder(null)
                      setHoveredTargetDriverId(null)
                    }}
                    onDragOver={(e: DragEvent<HTMLDivElement>) => {
                      e.preventDefault()
                      if (draggedDriver && hoveredTargetOrderId !== order.id) {
                        setHoveredTargetOrderId(order.id)
                      }
                    }}
                    onDragLeave={() => {
                      if (hoveredTargetOrderId === order.id) {
                        setHoveredTargetOrderId(null)
                      }
                    }}
                    onDrop={(e: DragEvent<HTMLDivElement>) => {
                      e.preventDefault()
                      if (draggedDriver) {
                        handleAssign(order, draggedDriver)
                      }
                    }}
                    data-testid={`dispatch-order-card-${order.id}`}
                    data-order-no={order.orderNo}
                    className={clsx(
                      'relative rounded-xl border p-3 cursor-grab active:cursor-grabbing transition shadow-md group',
                      isDraggingThisOrder && 'opacity-40 border-cyan-400 scale-[0.98]',
                      isTargetForDriverDrag
                        ? dragConflict?.hasConflict
                          ? 'border-amber-400/80 bg-amber-950/60 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-2 ring-amber-400/50'
                          : 'border-emerald-400/80 bg-emerald-950/60 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-2 ring-emerald-400/50'
                        : 'border-white/10 bg-slate-900/80 hover:bg-slate-850 hover:border-cyan-400/40',
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                          {order.orderNo}
                        </span>
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-300">
                          {order.channel}
                        </span>
                        <Badge tone="cyan">{t(`vehicle.category.${order.vehicleCategory}`)}</Badge>
                        {order.flightNumber && (
                          <span className="flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300 border border-amber-500/30">
                            ✈ {order.flightNumber}
                          </span>
                        )}
                        {order.flightInfo && <FlightBadge status={order.flightInfo.status} />}
                      </div>
                      <span className="font-bold text-emerald-400 text-xs font-mono">
                        {formatTWD(order.priceEstimate)}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="mt-2 text-xs text-slate-200">
                      <div className="flex items-start gap-1.5 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
                        <span className="truncate">{order.pickup.name}</span>
                        <span className="text-slate-500 shrink-0">➔</span>
                        <span className="truncate">{order.dropoff.name}</span>
                      </div>
                    </div>

                    {/* Details row */}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-300">{order.customer.name}</span>
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="flex items-center gap-1 font-mono text-cyan-300">
                          <Clock className="h-3 w-3" />
                          {formatClock(order.scheduledTime, lang)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 group-hover:text-cyan-300 transition flex items-center gap-1">
                          <span>⇄ 拖曳指派</span>
                        </span>
                      </div>
                    </div>

                    {/* Drag-Hover Preview Conflict Alert */}
                    {isTargetForDriverDrag && dragConflict?.hasConflict && (
                      <div className="mt-2 rounded-lg bg-amber-950/80 border border-amber-500/40 p-2 text-[10.5px] text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{dragConflict.outsideShiftMessage || dragConflict.overlapMessage}</span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DRIVERS GRID / DROP TARGET (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col h-[calc(100vh-185px)] min-h-[580px] rounded-2xl border border-white/10 bg-slate-950/90 backdrop-blur-xl p-3.5 shadow-2xl overflow-hidden">
          {/* Header & Controls */}
          <div className="border-b border-white/10 pb-3 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 border border-purple-400/30 font-bold text-xs">
                  🧑🏻‍✈️
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{lang === 'zh' ? '司機排程與接單庫' : 'Online & Available Drivers'}</span>
                    <span className="rounded-full bg-purple-500/20 px-2 py-0.2 text-[10.5px] font-mono text-purple-300">
                      {filteredDrivers.length}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {lang === 'zh' ? '即時班表與2小時排程防護 · 支援雙向拖曳與 1-Click 快速指派' : 'Shift hours & 2hr conflict protection · Drag & Drop / 1-Click Assign'}
                  </p>
                </div>
              </div>

              {/* Status filter tabs */}
              <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 border border-white/10">
                {(['ALL', 'AVAILABLE', 'BUSY', 'ON_SHIFT'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setDriverStatusFilter(k)}
                    className={clsx(
                      'rounded-lg px-2.5 py-1 text-[10.5px] font-medium transition',
                      driverStatusFilter === k
                        ? 'bg-purple-500/30 text-purple-200 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white',
                    )}
                  >
                    {k === 'ALL' ? (lang === 'zh' ? '全部' : 'All') :
                     k === 'AVAILABLE' ? (lang === 'zh' ? '空車' : 'Available') :
                     k === 'BUSY' ? (lang === 'zh' ? '有任務' : 'Busy') : (lang === 'zh' ? '值班中' : 'On Shift')}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={driverQuery}
                  onChange={(e) => setDriverQuery(e.target.value)}
                  placeholder={lang === 'zh' ? '搜尋司機姓名、電話或車牌號碼…' : 'Filter driver by name, vehicle plate…'}
                  data-testid="dispatch-driver-search-input"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-400/50"
                />
              </div>
            </div>
          </div>

          {/* Drivers Grid (Drop Targets) */}
          <div
            className="flex-1 overflow-y-auto pt-3 grid grid-cols-1 md:grid-cols-2 gap-3 pr-1 scrollbar-thin"
            data-testid="drivers-drop-grid"
          >
            {filteredDrivers.map(({ driver, vehicle, assignedOrders, assignedCount }) => {
              const isDraggingThisDriver = draggedDriver?.id === driver.id
              const isTargetForOrderDrag = hoveredTargetDriverId === driver.id && !!draggedOrder

              // Instant Conflict Guard evaluation if hovering a dragged order
              const conflict = draggedOrder ? evaluateDriverOrderConflict(driver, draggedOrder, orders) : null

              return (
                <div
                  key={driver.id}
                  draggable
                  onDragStart={(e: DragEvent<HTMLDivElement>) => {
                    setDraggedDriver(driver)
                    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'DRIVER', id: driver.id }))
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => {
                    setDraggedDriver(null)
                    setHoveredTargetOrderId(null)
                  }}
                  onDragOver={(e: DragEvent<HTMLDivElement>) => {
                    e.preventDefault()
                    if (draggedOrder && hoveredTargetDriverId !== driver.id) {
                      setHoveredTargetDriverId(driver.id)
                    }
                  }}
                  onDragLeave={() => {
                    if (hoveredTargetDriverId === driver.id) {
                      setHoveredTargetDriverId(null)
                    }
                  }}
                  onDrop={(e: DragEvent<HTMLDivElement>) => {
                    e.preventDefault()
                    if (draggedOrder) {
                      handleAssign(draggedOrder, driver)
                    }
                  }}
                  data-testid={`dispatch-driver-card-${driver.id}`}
                  data-driver-name={driver.name}
                  className={clsx(
                    'relative rounded-xl border p-3.5 transition flex flex-col justify-between shadow-lg cursor-grab active:cursor-grabbing',
                    isDraggingThisDriver && 'opacity-40 border-purple-400 scale-[0.98]',
                    isTargetForOrderDrag
                      ? conflict?.hasConflict
                        ? 'border-amber-400/90 bg-amber-950/60 shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-2 ring-amber-400'
                        : 'border-emerald-400/90 bg-emerald-950/60 shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400'
                      : 'border-white/10 bg-slate-900/90 hover:border-purple-400/40 hover:bg-slate-850',
                  )}
                >
                  <div>
                    {/* Driver Top Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl shadow-inner border border-white/15">
                          {driver.avatarEmoji}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-white">
                              {lang === 'zh' ? driver.nameZh : driver.name}
                            </h4>
                            <TierBadge tier={driver.tier} />
                          </div>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{vehicle ? `${vehicle.plate} (${vehicle.category})` : '車輛待指派'}</span>
                          </p>
                        </div>
                      </div>

                      <Badge tone={driver.status === 'AVAILABLE' ? 'green' : driver.status === 'BUSY' ? 'amber' : 'slate'}>
                        {t(`driverStatus.${driver.status}`)}
                      </Badge>
                    </div>

                    {/* Shift & Assigned Trip Count */}
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/5 p-2 text-xs">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Clock className="h-3.5 w-3.5 text-cyan-300" />
                        <span className="text-[11px]">
                          {driver.workingHours
                            ? `${driver.workingHours.shiftStart} - ${driver.workingHours.shiftEnd}`
                            : '08:00 - 18:00'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono">
                        <span className="text-slate-400">已排行程:</span>
                        <span className={clsx('font-bold', assignedCount > 0 ? 'text-amber-300' : 'text-emerald-400')}>
                          {assignedCount} 筆
                        </span>
                      </div>
                    </div>

                    {/* Assigned orders mini timeline */}
                    {assignedOrders.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {assignedOrders.slice(0, 2).map((ao) => (
                          <div
                            key={ao.id}
                            className="flex items-center justify-between rounded bg-white/[0.02] border border-white/5 px-2 py-1 text-[10.5px] text-slate-300 font-mono"
                          >
                            <span className="text-cyan-300 font-bold">{ao.orderNo}</span>
                            <span>{new Date(ao.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-slate-400 truncate max-w-[90px]">{ao.dropoff.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Live Drag-Over Conflict Flag */}
                    {isTargetForOrderDrag && conflict?.hasConflict && (
                      <div className="mt-2.5 rounded-xl border border-amber-500/40 bg-amber-950/70 p-2.5 text-xs text-amber-200" data-testid="drag-conflict-warning">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            {conflict.isOutsideShift && (
                              <p className="font-semibold text-amber-300">{conflict.outsideShiftMessage}</p>
                            )}
                            {conflict.isOverlapConflict && (
                              <p className="font-semibold text-rose-300">{conflict.overlapMessage}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 1-Click Quick-Assign Button for mobile/touch fallback */}
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500">
                      ★ {driver.rating.toFixed(1)} · {driver.completedTrips} 趟
                    </span>

                    {unassignedOrders.length > 0 && (
                      <Button
                        size="sm"
                        data-testid={`quick-assign-driver-btn-${driver.id}`}
                        onClick={() => handleAssign(unassignedOrders[0], driver)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold px-2.5 py-1"
                        title={lang === 'zh' ? '1-Click 快速指派首筆待派訂單' : '1-Click Quick Assign'}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        <span>{lang === 'zh' ? '1-Click 指派' : 'Quick Assign'}</span>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Interactive Conflict Confirmation Dialog */}
      <AnimatePresence>
        {pendingAssignment && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none" data-testid="conflict-override-dialog">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative flex flex-col w-full max-w-lg rounded-2xl border-2 border-amber-500/60 bg-slate-900/98 p-6 shadow-2xl shadow-amber-950/80 text-white overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <AlertTriangle className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {lang === 'zh' ? '⚠️ 排程衝突警示 (Schedule Conflict Guard)' : '⚠️ Schedule Conflict Detected'}
                    </h3>
                    <p className="text-xs text-amber-200/80">
                      {lang === 'zh' ? '檢測到司機工時或訂單時段重疊衝突' : 'Driver shift or 2-hour overlapping trip conflict'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPendingAssignment(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Conflict details */}
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-amber-950/50 border border-amber-500/40 p-3.5 text-xs text-amber-200 space-y-2">
                  {pendingAssignment.conflict.isOutsideShift && (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-300">
                          {pendingAssignment.conflict.outsideShiftMessage}
                        </p>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {lang === 'zh' ? '此訂單預約時段已超出該司機之當日排定值班時段。' : 'Order pickup time falls outside driver active shift hours.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {pendingAssignment.conflict.isOverlapConflict && (
                    <div className="flex items-start gap-2 pt-2 border-t border-amber-500/20">
                      <Flame className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-300">
                          {pendingAssignment.conflict.overlapMessage}
                        </p>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          {lang === 'zh' ? '在 2 小時安全緩衝期內，司機已有排定之其他行程，指派可能導致延誤。' : 'Driver has existing booking within 2-hour window.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-slate-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">目標訂單:</span>
                    <span className="font-mono text-cyan-300 font-bold">{pendingAssignment.order.orderNo} ({formatClock(pendingAssignment.order.scheduledTime, lang)})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">目標司機:</span>
                    <span className="font-bold text-white">{pendingAssignment.driver.nameZh || pendingAssignment.driver.name}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setPendingAssignment(null)}
                  data-testid="cancel-conflict-assignment-btn"
                >
                  {lang === 'zh' ? '取消並重選其他司機' : 'Cancel & Pick Another Driver'}
                </Button>
                <Button
                  onClick={() => handleAssign(pendingAssignment.order, pendingAssignment.driver, true)}
                  data-testid="force-override-conflict-btn"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  <Zap className="h-4 w-4 mr-1.5" />
                  {lang === 'zh' ? '確認強制覆寫指派 (Resolve & Force Override)' : 'Resolve & Force Override'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FleetOsPage>
  )
}
