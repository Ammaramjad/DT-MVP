import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Search,
  ShieldAlert,
  X,
  Zap,
} from 'lucide-react'
import type { Driver, Order } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { TierBadge } from '../ui/OrderBadges'
import { evaluateDriverOrderConflict, type ConflictCheckResult } from '../../lib/scheduleConflict'
import { formatTWD, formatClock } from '../../lib/format'

interface ManualAssignmentModalProps {
  /** Mode 1: Order -> Driver (assigning a driver to an order) */
  order?: Order | null
  /** Mode 2: Driver -> Order (assigning an order to a driver) */
  driver?: Driver | null
  isOpen: boolean
  onClose: () => void
}

export function ManualAssignmentModal({
  order: initialOrder,
  driver: initialDriver,
  isOpen,
  onClose,
}: ManualAssignmentModalProps) {
  const { lang, t } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const forceAssignOrder = useFleetStore((s) => s.forceAssignOrder)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [forceOverride, setForceOverride] = useState(false)

  // Determine mode
  const isOrderToDriver = !!initialOrder
  const targetOrder = initialOrder ?? orders.find((o) => o.id === selectedOrderId) ?? null
  const targetDriver = initialDriver ?? drivers.find((d) => d.id === selectedDriverId) ?? null

  // Active unassigned/pending orders for Driver -> Order selection
  const unassignedOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        ['CONFIRMED', 'DRIVER_MATCHING'].includes(o.status) ||
        (o.status === 'ASSIGNED' && o.driverId !== initialDriver?.id),
    )
  }, [orders, initialDriver])

  // Conflict evaluation for current pair
  const conflictResult: ConflictCheckResult | null = useMemo(() => {
    if (!targetOrder || !targetDriver) return null
    return evaluateDriverOrderConflict(targetDriver, targetOrder, orders)
  }, [targetOrder, targetDriver, orders])

  // Evaluated drivers list when in Order -> Driver mode
  const scoredDrivers = useMemo(() => {
    if (!targetOrder) return []
    const q = searchQuery.trim().toLowerCase()

    return drivers
      .map((d) => {
        const vehicle = vehicles.find((v) => v.id === d.vehicleId)
        const assignedOrderCount = orders.filter(
          (o) =>
            o.driverId === d.id &&
            !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status),
        ).length

        const conflict = evaluateDriverOrderConflict(d, targetOrder, orders)
        return {
          driver: d,
          vehicle,
          assignedOrderCount,
          conflict,
        }
      })
      .filter(({ driver: d, vehicle: v }) => {
        if (!q) return true
        return (
          d.name.toLowerCase().includes(q) ||
          d.nameZh.includes(q) ||
          d.phone.includes(q) ||
          (v && v.plate.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => {
        // Recommend conflict-free first, then online/available, then lower assigned order count
        if (a.conflict.hasConflict !== b.conflict.hasConflict) {
          return a.conflict.hasConflict ? 1 : -1
        }
        if (a.driver.status === 'AVAILABLE' && b.driver.status !== 'AVAILABLE') return -1
        if (a.driver.status !== 'AVAILABLE' && b.driver.status === 'AVAILABLE') return 1
        return a.assignedOrderCount - b.assignedOrderCount
      })
  }, [drivers, vehicles, orders, targetOrder, searchQuery])

  if (!isOpen) return null

  const handleExecuteAssignment = () => {
    if (!targetOrder || !targetDriver) return

    if (conflictResult?.hasConflict && !forceOverride) {
      setForceOverride(true)
      return
    }

    forceAssignOrder(targetOrder.id, targetDriver.id)
    onClose()
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none"
        data-testid="manual-assignment-modal"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl border border-cyan-500/40 bg-slate-900/98 p-6 shadow-2xl shadow-cyan-500/20 text-white overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>
                    {isOrderToDriver
                      ? (lang === 'zh' ? '智慧手動指派司機 (Smart Order Assignment)' : 'Smart Manual Order Assignment')
                      : (lang === 'zh' ? '為司機指派任務訂單 (Assign Order to Driver)' : 'Assign Order to Driver')}
                  </span>
                  <span className="rounded bg-cyan-400/20 px-2 py-0.5 text-[10.5px] font-mono text-cyan-300 border border-cyan-400/30">
                    AI CONFLICT GUARD
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isOrderToDriver
                    ? (lang === 'zh' ? `目前選定訂單：${targetOrder?.orderNo} (${targetOrder?.pickup.name} ➔ ${targetOrder?.dropoff.name})` : `Selected Order: ${targetOrder?.orderNo}`)
                    : (lang === 'zh' ? `目標司機：${targetDriver?.nameZh || targetDriver?.name} (${targetDriver?.tier})` : `Target Driver: ${targetDriver?.name}`)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              data-testid="close-assignment-modal-btn"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Context Banner */}
          {targetOrder && (
            <div className="mt-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 p-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-700/50">
                  {targetOrder.orderNo}
                </span>
                <span className="text-xs text-slate-200">
                  {targetOrder.pickup.name} ➔ {targetOrder.dropoff.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="flex items-center gap-1 font-mono text-cyan-200">
                  <Clock className="h-3 w-3" />
                  {formatClock(targetOrder.scheduledTime, lang)}
                </span>
                <span className="font-semibold text-white">
                  {formatTWD(targetOrder.priceEstimate)}
                </span>
                <Badge tone="cyan">{t(`vehicle.category.${targetOrder.vehicleCategory}`)}</Badge>
              </div>
            </div>
          )}

          {/* Conflict Warnings if target driver + order selected */}
          {conflictResult?.hasConflict && (
            <div className="mt-3 space-y-2 shrink-0" data-testid="assignment-conflict-alert">
              {conflictResult.isOutsideShift && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-300">
                      {lang === 'zh' ? '班表時段衝突警示 (Outside Shift Warning)' : 'Outside Shift Hours Warning'}
                    </p>
                    <p className="text-[11.5px] text-amber-200/90 mt-0.5">
                      {conflictResult.outsideShiftMessage}
                    </p>
                  </div>
                </div>
              )}

              {conflictResult.isOverlapConflict && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-300">
                      {lang === 'zh' ? '雙重預約 / 行程重疊衝突 (Trip Overlap / Double-Booking Conflict)' : 'Trip Overlap / Double-Booking Conflict'}
                    </p>
                    <p className="text-[11.5px] text-rose-200/90 mt-0.5">
                      {conflictResult.overlapMessage}
                    </p>
                    <p className="text-[10.5px] text-rose-300/70 mt-1">
                      {lang === 'zh' ? '※ 系統要求行程前後至少保留 2 小時緩衝時間以避免誤點。' : '※ Dispatch engine enforces a 2-hour minimum buffer between trips.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 1: Order -> Driver Selection List */}
          {isOrderToDriver && (
            <div className="mt-3 flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={lang === 'zh' ? '搜尋司機姓名、電話或車牌…' : 'Search driver name, phone, plate…'}
                    data-testid="assignment-driver-search-input"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/40"
                  />
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {scoredDrivers.length} {lang === 'zh' ? '位符合車隊司機' : 'drivers found'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 rounded-xl" data-testid="assignment-driver-list">
                {scoredDrivers.map(({ driver: d, vehicle: v, assignedOrderCount, conflict }) => {
                  const isSelected = selectedDriverId === d.id
                  return (
                    <div
                      key={d.id}
                      onClick={() => {
                        setSelectedDriverId(d.id)
                        setForceOverride(false)
                      }}
                      data-testid={`assign-driver-card-${d.id}`}
                      data-has-conflict={conflict.hasConflict ? 'true' : 'false'}
                      className={`flex flex-col gap-2 rounded-xl border p-3 cursor-pointer transition ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/15 ring-1 ring-cyan-400'
                          : conflict.hasConflict
                          ? 'border-amber-500/30 bg-amber-950/10 hover:bg-amber-950/20'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{d.avatarEmoji}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{lang === 'zh' ? d.nameZh : d.name}</span>
                              <TierBadge tier={d.tier} />
                              <Badge tone={d.status === 'AVAILABLE' ? 'green' : d.status === 'BUSY' ? 'amber' : 'slate'}>
                                {t(`driverStatus.${d.status}`)}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {d.phone} · 車輛：<span className="font-mono text-slate-300">{v?.plate || '—'}</span> ({v ? t(`vehicle.category.${v.category}`) : '—'})
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            {d.workingHours && (
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-slate-700">
                                班表: {d.workingHours.shiftStart}-{d.workingHours.shiftEnd}
                              </span>
                            )}
                            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-300 font-mono">
                              已排 {assignedOrderCount} 單
                            </span>
                          </div>
                          {conflict.hasConflict ? (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-400">
                              <AlertTriangle className="h-3 w-3" />
                              {conflict.isOverlapConflict ? '行程衝突 (Overlap)' : '非當值時段 (Off-Shift)'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              推薦司機 (Conflict-Free)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mode 2: Driver -> Order Selection List */}
          {!isOrderToDriver && (
            <div className="mt-3 flex-1 flex flex-col min-h-0">
              <p className="text-xs font-semibold text-slate-300 mb-2">
                {lang === 'zh' ? '選擇待派單 / 待調整訂單：' : 'Select Unassigned or Pending Order:'}
              </p>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 rounded-xl" data-testid="assignment-order-list">
                {unassignedOrders.map((o) => {
                  const isSelected = selectedOrderId === o.id
                  const conflict = targetDriver ? evaluateDriverOrderConflict(targetDriver, o, orders) : null
                  return (
                    <div
                      key={o.id}
                      onClick={() => {
                        setSelectedOrderId(o.id)
                        setForceOverride(false)
                      }}
                      data-testid={`assign-order-card-${o.id}`}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/15 ring-1 ring-cyan-400'
                          : conflict?.hasConflict
                          ? 'border-amber-500/30 bg-amber-950/10 hover:bg-amber-950/20'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-300">{o.orderNo}</span>
                          <span className="text-xs text-white">{o.customer.name}</span>
                          <Badge tone="cyan">{t(`vehicle.category.${o.vehicleCategory}`)}</Badge>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          {o.pickup.name} ➔ {o.dropoff.name}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs text-slate-200 block">
                          {formatClock(o.scheduledTime, lang)}
                        </span>
                        <span className="font-bold text-white text-xs">
                          {formatTWD(o.priceEstimate)}
                        </span>
                        {conflict?.hasConflict && (
                          <span className="block text-[10px] text-amber-400 font-semibold mt-0.5">
                            ⚠️ 存在排程衝突
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 shrink-0">
            <div>
              {conflictResult?.hasConflict && (
                <span className="text-xs text-amber-400 flex items-center gap-1 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {forceOverride
                    ? (lang === 'zh' ? '已解除警示，可強制指派' : 'Override unlocked. Ready to force assign.')
                    : (lang === 'zh' ? '檢測到時間衝突，請點擊強制指派確認' : 'Schedule conflict detected.')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={onClose}>
                {lang === 'zh' ? '取消' : 'Cancel'}
              </Button>

              {conflictResult?.hasConflict ? (
                <Button
                  size="sm"
                  data-testid="force-assign-btn"
                  onClick={handleExecuteAssignment}
                  className="bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold border border-amber-400/40 shadow-lg shadow-rose-900/40"
                >
                  <ShieldAlert className="h-4 w-4 mr-1" />
                  {forceOverride
                    ? (lang === 'zh' ? '確認強制指派 (Confirm Force Assignment)' : 'Confirm Force Assignment')
                    : (lang === 'zh' ? '強制覆寫指派 (Force Override Assignment)' : 'Force Override Assignment')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  data-testid="confirm-assignment-btn"
                  disabled={!targetOrder || !targetDriver}
                  onClick={handleExecuteAssignment}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {lang === 'zh' ? '確認指派司機 (Confirm Assignment)' : 'Confirm Assignment'}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
