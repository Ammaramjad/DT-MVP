import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  MapPin,
  Plane,
  User,
  Users2,
  X,
  Zap,
  CheckCircle2,
} from 'lucide-react'
import type { CapacityDay, Driver, Order } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import { TierBadge } from '../ui/OrderBadges'
import { Button } from '../ui/Button'
import { formatClock, formatTWD } from '../../lib/format'

interface DayCapacityModalProps {
  day: CapacityDay | null
  onClose: () => void
}

export function DayCapacityModal({ day, onClose }: DayCapacityModalProps) {
  const { lang, t } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const forceAssignOrder = useFleetStore((s) => s.forceAssignOrder)

  const [activeTab, setActiveTab] = useState<'BOOKINGS' | 'ROSTER'>('BOOKINGS')
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<Order | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Orders matching this date
  const dayOrders = useMemo(() => {
    if (!day) return []
    const targetDateStr = day.date // YYYY-MM-DD
    return orders.filter((o) => {
      const orderDateStr = o.scheduledTime.slice(0, 10)
      return orderDateStr === targetDateStr
    }).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
  }, [day, orders])

  // Drivers scheduled on duty for this date
  const dayDrivers = useMemo(() => {
    if (!day) return { dayShift: [] as Driver[], nightShift: [] as Driver[], onLeave: [] as Driver[] }
    const targetDateStr = day.date
    const dayShift: Driver[] = []
    const nightShift: Driver[] = []
    const onLeave: Driver[] = []

    drivers.forEach((d) => {
      const shiftDay = d.shiftSchedule.find((s) => s.date === targetDateStr)
      if (shiftDay?.shift === 'OFF') {
        onLeave.push(d)
      } else if (shiftDay?.shift === 'NIGHT' || d.workingHours?.shiftType === 'NIGHT') {
        nightShift.push(d)
      } else {
        dayShift.push(d)
      }
    })

    return { dayShift, nightShift, onLeave }
  }, [day, drivers])

  if (!day) return null

  const dateObj = new Date(day.date)
  const weekdayName = dateObj.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const deficitOrSurplus = day.scheduledDrivers - day.orderCount
  const isDeficit = deficitOrSurplus < 0

  const handlePreDispatch = (orderId: string, driverId: string) => {
    if (!orderId || !driverId) return
    const targetDriver = drivers.find((d) => d.id === driverId)
    const targetOrder = orders.find((o) => o.id === orderId)
    if (!targetDriver || !targetOrder) return

    forceAssignOrder(orderId, driverId)
    setSelectedOrderForDispatch(null)
    setSelectedDriverId('')
    setToastMessage(
      lang === 'zh'
        ? `✅ 已成功提前指派預約訂單 ${targetOrder.orderNo} 給司機 ${targetDriver.nameZh || targetDriver.name}！`
        : `✅ Order ${targetOrder.orderNo} successfully pre-assigned to ${targetDriver.name}!`,
    )
    setTimeout(() => setToastMessage(null), 3500)
  }

  const allAvailableDriversOnDuty = [...dayDrivers.dayShift, ...dayDrivers.nightShift]

  return (
    <div className="fixed inset-0 z-[850] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl" data-testid="day-capacity-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.18 }}
        className="relative flex flex-col h-[85vh] max-h-[720px] w-full max-w-4xl rounded-3xl border border-cyan-400/30 bg-slate-900/95 shadow-2xl backdrop-blur-2xl text-white overflow-hidden"
      >
        {/* Toast alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-[900] rounded-2xl bg-emerald-950/90 border border-emerald-400/50 px-4 py-2.5 text-xs font-bold text-emerald-200 shadow-2xl flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Strip */}
        <div className="border-b border-white/10 bg-slate-950/70 p-5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">{weekdayName}</h3>
                  <span className="font-mono text-xs text-slate-400 font-bold">({day.date})</span>
                  {day.isPeak && (
                    <span className="rounded-full bg-pink-500/20 border border-pink-400/40 px-2 py-0.5 text-[10px] font-bold text-pink-300">
                      ⚡ {lang === 'zh' ? '尖峰爆量日' : 'PEAK DAY'}
                    </span>
                  )}
                  {day.isToday && (
                    <span className="rounded-full bg-cyan-500/20 border border-cyan-400/40 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                      {lang === 'zh' ? '今日' : 'TODAY'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'zh' ? '單日量能深度拆解 · 未來預約排程看板 · 1-Click 提前預派司機' : 'Daily capacity breakdown, advance bookings & 1-click pre-dispatch'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              data-testid="close-day-capacity-modal"
              className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/5">
              <span className="text-[10.5px] uppercase font-bold text-slate-400">{lang === 'zh' ? '總預約需求 (Demand)' : 'Total Demand'}</span>
              <p className="text-lg font-black text-cyan-300 mt-0.5">{day.orderCount} <span className="text-xs font-normal text-slate-400">{t('control.orders')}</span></p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/5">
              <span className="text-[10.5px] uppercase font-bold text-slate-400">{lang === 'zh' ? '排定出勤司機 (Supply)' : 'Scheduled Supply'}</span>
              <p className="text-lg font-black text-purple-300 mt-0.5">{day.scheduledDrivers} <span className="text-xs font-normal text-slate-400">Drivers</span></p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/5">
              <span className="text-[10.5px] uppercase font-bold text-slate-400">{lang === 'zh' ? '運力盈虧 (Balance)' : 'Capacity Gap'}</span>
              <p className={`text-lg font-black mt-0.5 ${isDeficit ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isDeficit ? `${deficitOrSurplus} (缺口)` : `+${deficitOrSurplus} (充裕)`}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-3 border border-white/5">
              <span className="text-[10.5px] uppercase font-bold text-slate-400">{lang === 'zh' ? '當日休假 (On Leave)' : 'On Leave'}</span>
              <p className="text-lg font-black text-amber-300 mt-0.5">{day.onLeave} <span className="text-xs font-normal text-slate-400">Drivers</span></p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 pt-3 shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('BOOKINGS')}
              data-testid="day-modal-tab-bookings"
              className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'BOOKINGS'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plane className="h-3.5 w-3.5" />
              <span>{lang === 'zh' ? `未來預約行程清單 (${dayOrders.length} 筆)` : `Future Scheduled Bookings (${dayOrders.length})`}</span>
            </button>
            <button
              onClick={() => setActiveTab('ROSTER')}
              data-testid="day-modal-tab-roster"
              className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'ROSTER'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users2 className="h-3.5 w-3.5" />
              <span>{lang === 'zh' ? `當日值班排表 (早班 ${dayDrivers.dayShift.length} / 夜班 ${dayDrivers.nightShift.length})` : `On-Duty Roster (${allAvailableDriversOnDuty.length})`}</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {activeTab === 'BOOKINGS' && (
            <div className="space-y-3" data-testid="day-future-orders-list">
              {dayOrders.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  <Plane className="h-8 w-8 mx-auto mb-2 text-slate-600 opacity-60" />
                  <p className="font-bold text-slate-400">{lang === 'zh' ? '此日期尚未有預約行程資料' : 'No pre-booked trips recorded for this date yet.'}</p>
                  <p className="text-[11px] mt-1 text-slate-500">{lang === 'zh' ? '隨行銷與 OTA 串接將自動持續匯入' : 'Inbound bookings from OTA channels will appear here automatically.'}</p>
                </div>
              ) : (
                dayOrders.map((order) => {
                  const assignedDriver = drivers.find((d) => d.id === order.driverId)
                  const isAssigned = !!assignedDriver

                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-cyan-400/40 shadow-lg space-y-3"
                      data-testid={`day-order-card-${order.id}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                            {order.orderNo}
                          </span>
                          <span className="rounded-lg bg-white/5 px-2 py-0.5 text-[10.5px] font-semibold text-slate-300 border border-white/10">
                            {order.channel}
                          </span>
                          <TierBadge tier={order.vehicleCategory as any} />
                          {order.flightNumber && (
                            <span className="flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[10.5px] text-amber-300 border border-amber-500/30">
                              ✈ {order.flightNumber}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-emerald-400">{formatTWD(order.priceEstimate)}</span>
                          <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold border ${
                            isAssigned
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-400/40 animate-pulse'
                          }`}>
                            {isAssigned ? (
                              <span>✓ {lang === 'zh' ? `已指派: ${assignedDriver.nameZh || assignedDriver.name}` : `Assigned: ${assignedDriver.name}`}</span>
                            ) : (
                              <span>⚠️ {lang === 'zh' ? '尚未指派司機 (Unassigned)' : 'Unassigned'}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Route & Passenger Details */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-slate-300 font-medium">
                            <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            <span className="font-mono text-cyan-200">{formatClock(order.scheduledTime, lang)}</span>
                          </div>
                          <div className="flex items-start gap-2 text-slate-200">
                            <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                            <span className="font-bold">{lang === 'zh' ? order.pickup.nameZh : order.pickup.name}</span>
                            <span className="text-slate-500">➔</span>
                            <span className="font-bold">{lang === 'zh' ? order.dropoff.nameZh : order.dropoff.name}</span>
                          </div>
                        </div>

                        <div className="space-y-1 text-slate-400 text-[11.5px] sm:border-l sm:border-white/5 sm:pl-3">
                          <p className="flex items-center gap-1.5">
                            <User className="h-3 w-3 text-slate-500" />
                            <span className="text-slate-200 font-semibold">{order.customer.name}</span>
                            <span className="font-mono text-slate-400">({order.customer.phone})</span>
                          </p>
                          {order.notes && <p className="text-slate-400 italic truncate max-w-xs">{order.notes}</p>}
                        </div>
                      </div>

                      {/* 1-Click Pre-Dispatch Action Strip */}
                      <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                        <div className="text-[11px] text-slate-400">
                          {isAssigned ? (
                            <span className="text-emerald-300 font-medium">
                              {lang === 'zh' ? `指定出車司機: ${assignedDriver.nameZh} (${assignedDriver.phone})` : `Assigned driver: ${assignedDriver.name}`}
                            </span>
                          ) : (
                            <span className="text-amber-300">
                              {lang === 'zh' ? '此預約訂單尚未鎖定司機，可點擊預先指派' : 'Available for advance dispatcher pre-assignment'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {selectedOrderForDispatch?.id === order.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedDriverId}
                                onChange={(e) => setSelectedDriverId(e.target.value)}
                                data-testid={`select-preassign-driver-${order.id}`}
                                className="rounded-xl border border-cyan-400/50 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-400"
                              >
                                <option value="">{lang === 'zh' ? '選擇當日值班司機…' : 'Select On-Duty Driver…'}</option>
                                {allAvailableDriversOnDuty.slice(0, 30).map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.avatarEmoji} {d.nameZh || d.name} ({d.id}) - {d.workingHours?.shiftType || 'DAY'}
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={!selectedDriverId}
                                onClick={() => handlePreDispatch(order.id, selectedDriverId)}
                                data-testid={`confirm-preassign-btn-${order.id}`}
                                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                              >
                                {lang === 'zh' ? '確認指派' : 'Confirm'}
                              </Button>
                              <button
                                onClick={() => {
                                  setSelectedOrderForDispatch(null)
                                  setSelectedDriverId('')
                                }}
                                className="text-xs text-slate-400 hover:text-white px-1.5"
                              >
                                {lang === 'zh' ? '取消' : 'Cancel'}
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedOrderForDispatch(order)}
                              data-testid={`open-preassign-btn-${order.id}`}
                              className="flex items-center gap-1.5 border-purple-400/30 bg-purple-500/15 text-purple-200 hover:bg-purple-500/25 text-xs"
                            >
                              <Zap className="h-3 w-3 text-purple-400" />
                              <span>{isAssigned ? (lang === 'zh' ? '更換預派司機' : 'Reassign') : (lang === 'zh' ? '1-Click 預先指派司機' : 'Pre-Assign Driver')}</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'ROSTER' && (
            <div className="space-y-4" data-testid="day-roster-breakdown">
              {/* Day Shift Section */}
              <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/60 p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                    <span>☀️ {lang === 'zh' ? '日間常規 / 早班執勤名單 (Day & Morning Shifts)' : 'Day Shift Roster'}</span>
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.2 text-[10px] font-mono text-cyan-300">
                      {dayDrivers.dayShift.length} 名司機
                    </span>
                  </h4>
                  <span className="text-[11px] text-slate-400">06:00 - 18:00</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {dayDrivers.dayShift.slice(0, 24).map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-2 border border-white/5 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{d.avatarEmoji}</span>
                        <div className="truncate">
                          <p className="font-bold text-white truncate">{d.nameZh || d.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{d.id} · ★{d.rating.toFixed(1)}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                        {lang === 'zh' ? '值勤' : 'Duty'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Night Shift Section */}
              <div className="rounded-2xl border border-purple-400/20 bg-slate-950/60 p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-bold text-purple-300 flex items-center gap-2">
                    <span>🌙 {lang === 'zh' ? '夜間紅眼執勤名單 (Night Shift)' : 'Night Shift Roster'}</span>
                    <span className="rounded-full bg-purple-500/20 px-2 py-0.2 text-[10px] font-mono text-purple-300">
                      {dayDrivers.nightShift.length} 名司機
                    </span>
                  </h4>
                  <span className="text-[11px] text-slate-400">18:00 - 03:00</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {dayDrivers.nightShift.slice(0, 18).map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-2 border border-white/5 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{d.avatarEmoji}</span>
                        <div className="truncate">
                          <p className="font-bold text-white truncate">{d.nameZh || d.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{d.id} · ★{d.rating.toFixed(1)}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 shrink-0">
                        {lang === 'zh' ? '夜班' : 'Night'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave Section */}
              <div className="rounded-2xl border border-amber-400/20 bg-slate-950/60 p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <span>☕ {lang === 'zh' ? '休假 / 例休名單 (On Leave / Rest Day)' : 'On Leave / Rest'}</span>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[10px] font-mono text-amber-300">
                      {dayDrivers.onLeave.length} 名司機
                    </span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Rest & HoS Reset</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {dayDrivers.onLeave.slice(0, 12).map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] p-2 border border-white/5 text-xs opacity-75">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{d.avatarEmoji}</span>
                        <div className="truncate">
                          <p className="font-bold text-slate-300 truncate">{d.nameZh || d.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{d.id}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                        {lang === 'zh' ? '休假' : 'Leave'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-slate-950/80 p-3.5 px-5 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            {lang === 'zh' ? '💡 調度小技巧：可於此處提前排定未來預約機場趟次，減少當日即時派單運力緊繃。' : '💡 Tip: Pre-assigning future airport trips relieves same-day dispatch crunch.'}
          </span>
          <Button size="sm" variant="secondary" onClick={onClose}>
            {t('common.done')}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
