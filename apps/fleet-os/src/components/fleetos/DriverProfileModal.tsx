import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Car,
  CheckCircle2,
  Coffee,
  DollarSign,
  FileCheck2,
  Phone,
  Plane,
  Power,
  ShieldAlert,
  ShieldCheck,
  Star,
  X,
  Zap,
  BadgeDollarSign,
  Sunrise,
  Sun,
  Moon,
  Sliders,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { StatCard } from '../ui/StatCard'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { TierBadge, StatusBadge } from '../ui/OrderBadges'
import { formatTWD, formatDateTime } from '../../lib/format'
import type { Driver, DriverWorkingShiftType, Vehicle } from '../../types'
import { useLang } from '../../i18n'
import clsx from 'clsx'

export type DriverModalTab =
  | 'OVERVIEW'
  | 'DISPATCH'
  | 'SHIFT'
  | 'SAFETY_HOS'
  | 'FINANCIALS'
  | 'COMPLIANCE'

interface DriverProfileModalProps {
  driver: Driver | null
  vehicle?: Vehicle | null
  isOpen: boolean
  onClose: () => void
  initialTab?: DriverModalTab
}

export function DriverProfileModal({
  driver,
  vehicle,
  isOpen,
  onClose,
  initialTab = 'OVERVIEW',
}: DriverProfileModalProps) {
  const { lang, t } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const setDriverAvailability = useFleetStore((s) => s.setDriverAvailability)
  const toggleDriverBreakMode = useFleetStore((s) => s.toggleDriverBreakMode)
  const updateDriverShift = useFleetStore((s) => s.updateDriverShift)
  const setDriverWorkingMode = useFleetStore((s) => s.setDriverWorkingMode)
  const setDriverAirportPreference = useFleetStore((s) => s.setDriverAirportPreference)

  const [activeTab, setActiveTab] = useState<DriverModalTab>(initialTab)
  const [actionAlert, setActionAlert] = useState<string | null>(null)

  // Shift editing state
  const [shiftType, setShiftType] = useState<DriverWorkingShiftType>(driver?.workingHours?.shiftType || 'DAY')
  const [shiftStart, setShiftStart] = useState(driver?.workingHours?.shiftStart || '09:00')
  const [shiftEnd, setShiftEnd] = useState(driver?.workingHours?.shiftEnd || '18:00')
  const [breakStart, setBreakStart] = useState(driver?.workingHours?.breakStart || '12:30')
  const [breakEnd, setBreakEnd] = useState(driver?.workingHours?.breakEnd || '13:30')

  if (!isOpen || !driver) return null

  const showAlert = (msg: string) => {
    setActionAlert(msg)
    setTimeout(() => setActionAlert(null), 3500)
  }

  // Related orders
  const driverOrders = orders.filter((o) => o.driverId === driver.id)
  const activeOrders = driverOrders.filter((o) =>
    ['ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'PASSENGER_ONBOARD'].includes(o.status),
  )
  const completedOrders = driverOrders.filter((o) => o.status === 'COMPLETED')
  const airportTransfersCount = driverOrders.filter(
    (o) => o.status === 'COMPLETED' && (o.pickup.isAirport || o.dropoff.isAirport),
  ).length

  // Financial calculations
  const todayRevenue = completedOrders.reduce((sum, o) => sum + (o.priceEstimate || 0), 0)
  const commissionRate = driver.tier === 'OWNED_FLEET' ? 0.15 : driver.tier === 'PAID_MEMBER' ? 0.12 : 0.20
  const monthlyEstimatedGross = (driver.completedTrips || 120) * 1650
  const netEarningsToday = Math.round(todayRevenue * (1 - commissionRate))

  // Safety & Fatigue (MOTC HoS limit: 8 continuous hours = 480 mins)
  const serviceMinsToday = driver.serviceMinutesToday ?? 160
  const isResting = driver.breakMode || driver.status === 'BREAK'
  const continuousDrivingHours = (serviceMinsToday / 60).toFixed(1)
  const fatigueRiskLevel = serviceMinsToday >= 420 ? 'CRITICAL' : serviceMinsToday >= 330 ? 'HIGH' : serviceMinsToday >= 240 ? 'MODERATE' : 'NORMAL'

  const handleApplyPresetShift = (type: DriverWorkingShiftType, s: string, e: string, bs: string, be: string) => {
    setShiftType(type)
    setShiftStart(s)
    setShiftEnd(e)
    setBreakStart(bs)
    setBreakEnd(be)
    updateDriverShift(driver.id, {
      shiftType: type,
      shiftStart: s,
      shiftEnd: e,
      breakStart: bs,
      breakEnd: be,
      onShift: true,
    })
    showAlert(
      lang === 'zh'
        ? `司機 ${driver.nameZh} 班表已成功更新為【${type === 'MORNING' ? '早班' : type === 'DAY' ? '常規日間班' : '夜間紅眼班'}】 (${s} - ${e})`
        : `Shift updated to ${type} (${s} - ${e})`,
    )
  }

  const handleToggleBreak = () => {
    toggleDriverBreakMode(driver.id)
    showAlert(
      lang === 'zh'
        ? isResting
          ? `已解除強制休息，司機 ${driver.nameZh} 已恢復正常派單出車！`
          : `已啟動交通部工時防呆：強制司機 ${driver.nameZh} 進入 30 分鐘中斷休息！`
        : isResting
          ? `Rest break ended for ${driver.name}`
          : `Forced MOTC rest break activated for ${driver.name}`,
    )
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" data-testid="driver-profile-modal">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-cyan-500/30 bg-slate-950 p-6 shadow-2xl text-white space-y-5"
      >
        {/* Header with Driver Identity */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-3xl border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
              {driver.avatarEmoji}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-wide">
                  {lang === 'zh' ? driver.nameZh : driver.name}
                </h2>
                {driver.nameZh && driver.name && driver.nameZh !== driver.name && (
                  <span className="text-sm font-medium text-slate-400">({driver.name})</span>
                )}
                <TierBadge tier={driver.tier} />
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400 font-mono">
                <span>ID: {driver.id}</span>
                <span>·</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Phone className="h-3 w-3 text-cyan-400" /> {driver.phone}
                </span>
                <span>·</span>
                {vehicle && (
                  <span className="flex items-center gap-1 font-bold text-cyan-300">
                    <Car className="h-3 w-3" /> {vehicle.plate} ({t(`vehicle.category.${vehicle.category}`)})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Online Status Toggle */}
            <button
              onClick={() => {
                const next = driver.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE'
                setDriverAvailability(driver.id, next)
                showAlert(lang === 'zh' ? `司機狀態切換為【${next}】` : `Driver status set to ${next}`)
              }}
              data-testid="modal-toggle-online-btn"
              className={clsx(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition',
                driver.status === 'AVAILABLE'
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white',
              )}
            >
              <Power className="h-3.5 w-3.5" />
              <span>{driver.status === 'AVAILABLE' ? (lang === 'zh' ? '可接單' : 'Online') : (lang === 'zh' ? '離線' : 'Offline')}</span>
            </button>

            <button
              onClick={onClose}
              data-testid="close-driver-profile-modal"
              className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Action Alert Notification */}
        <AnimatePresence>
          {actionAlert && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/80 px-3.5 py-2.5 text-xs text-cyan-200"
              data-testid="driver-modal-alert"
            >
              <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>{actionAlert}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs Bar (All 6 Specialized Tabs) */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/10 pb-2 scrollbar-none" data-testid="driver-modal-tabs">
          {[
            { id: 'OVERVIEW', labelZh: '🎛️ 總覽與車輛規格', labelEn: 'Overview & Vehicle' },
            { id: 'DISPATCH', labelZh: '🛰️ 派單任務與進行中訂單', labelEn: 'Rides & Dispatch' },
            { id: 'SHIFT', labelZh: '📅 輪班時段與排班管理', labelEn: 'Shift & Schedule' },
            { id: 'SAFETY_HOS', labelZh: '🛡️ 交通部工時與疲勞監控 (HoS)', labelEn: 'Safety & MOTC HoS' },
            { id: 'FINANCIALS', labelZh: '💰 營收拆帳與即時提現錢包', labelEn: 'Earnings & Splits' },
            { id: 'COMPLIANCE', labelZh: '📑 證件合規與 OCR 審查', labelEn: 'Compliance & OCR' },
          ].map(({ id, labelZh, labelEn }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as DriverModalTab)}
              data-testid={`driver-tab-${id.toLowerCase()}`}
              className={clsx(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap',
                activeTab === id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
              )}
            >
              {lang === 'zh' ? labelZh : labelEn}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview & Vehicle */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-4" data-testid="driver-tab-overview-content">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={<Star className="h-4 w-4 fill-amber-400 text-amber-400" />} label={lang === 'zh' ? '乘客評鑑 CSAT' : 'Rating'} value={driver.rating} suffix=" ★" tone="amber" />
              <StatCard icon={<Car className="h-4 w-4" />} label={lang === 'zh' ? '累計完成趟數' : 'Total Trips'} value={driver.completedTrips} tone="cyan" />
              <StatCard icon={<Plane className="h-4 w-4" />} label={lang === 'zh' ? '機場接送專車' : 'Airport Trips'} value={airportTransfersCount} tone="purple" />
              <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label={lang === 'zh' ? '出車前點檢合格' : 'Pre-Trip Inspection'} value={100} suffix="%" tone="lime" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Vehicle Specs Card */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Car className="h-4 w-4" /> {lang === 'zh' ? '指派車輛規格與配備' : 'Assigned Vehicle Specs'}
                  </h3>
                  <span className="font-mono font-bold text-sm text-white bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-700">
                    {vehicle?.plate || 'UNASSIGNED'}
                  </span>
                </div>

                {vehicle ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{lang === 'zh' ? '車種類別' : 'Category'}</span>
                      <span className="font-bold text-white">{t(`vehicle.category.${vehicle.category}`)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{lang === 'zh' ? '核定乘客人數' : 'Passenger Capacity'}</span>
                      <span className="font-bold text-slate-200">{vehicle.capacity} {lang === 'zh' ? '人座' : 'Pax'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{lang === 'zh' ? '行李箱乘載上限' : 'Luggage Capacity'}</span>
                      <span className="font-bold text-slate-200">{vehicle.luggageCapacity} {lang === 'zh' ? '件大行李' : 'Bags'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{lang === 'zh' ? '主服務分區' : 'Service Zone'}</span>
                      <span className="font-bold text-cyan-300 font-mono">{vehicle.serviceZone}</span>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[11px] font-semibold text-slate-400 mb-1.5">{lang === 'zh' ? '車載配備與標籤' : 'Features & Badges'}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {vehicle.features.map((f) => (
                          <span key={f} className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-[10.5px] text-slate-300 font-mono">
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">尚未指定車輛</p>
                )}
              </div>

              {/* Working Mode & Preferences */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Sliders className="h-4 w-4" /> {lang === 'zh' ? '調度優先權與接單模式' : 'Dispatch Preferences'}
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">{lang === 'zh' ? '接單偏好權重 (Working Mode)' : 'Working Mode'}</label>
                    <select
                      value={driver.workingMode}
                      onChange={(e) => {
                        setDriverWorkingMode(driver.id, e.target.value as any)
                        showAlert(lang === 'zh' ? `已更新偏好為【${e.target.value}】` : `Updated working mode to ${e.target.value}`)
                      }}
                      data-testid="driver-working-mode-select"
                      className="w-full rounded-xl border border-white/10 bg-slate-900 p-2 text-xs text-white outline-none focus:border-cyan-400/50"
                    >
                      <option value="AIRPORT_PRIORITY">{lang === 'zh' ? '🛫 機場專車優先 (Airport Priority)' : 'Airport Priority'}</option>
                      <option value="CITY_PRIORITY">{lang === 'zh' ? '🏙️ 市區短程接送優先 (City Priority)' : 'City Priority'}</option>
                      <option value="ANY">{lang === 'zh' ? '🌐 全區域綜合派單 (Any)' : 'Any'}</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-2.5 border border-white/5">
                    <div>
                      <p className="font-bold text-white text-xs">{lang === 'zh' ? '桃機/松機航班雷達即時連動' : 'Airport Flight Radar Sync'}</p>
                      <p className="text-[10px] text-slate-400">{lang === 'zh' ? '航班降落延誤時優先通知' : 'Prioritize gate arrival alerts'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setDriverAirportPreference(driver.id, !driver.airportPreference)
                        showAlert(lang === 'zh' ? '已切換機場偏好設定' : 'Toggled airport preference')
                      }}
                      className={clsx(
                        'rounded-lg px-2.5 py-1 text-xs font-bold transition',
                        driver.airportPreference ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'bg-white/5 text-slate-500',
                      )}
                    >
                      {driver.airportPreference ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Rides & Dispatch */}
        {activeTab === 'DISPATCH' && (
          <div className="space-y-4" data-testid="driver-tab-dispatch-content">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '目前執行中任務與歷史調度紀錄' : 'Active & Historical Order Assignments'}
              </h3>
              <span className="font-mono text-xs text-cyan-300 font-bold">
                {activeOrders.length} ACTIVE / {driverOrders.length} TOTAL
              </span>
            </div>

            {activeOrders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> {lang === 'zh' ? '進行中即時任務' : 'Current Active Assignment'}
                </p>
                {activeOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">{order.orderNo}</span>
                        <StatusBadge status={order.status} />
                        {order.flightNumber && (
                          <span className="rounded-lg bg-cyan-500/20 px-2 py-0.5 font-mono text-[11px] text-cyan-300 border border-cyan-400/40">
                            ✈ {order.flightNumber}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-emerald-300 text-sm">
                        {formatTWD(order.priceEstimate)}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{lang === 'zh' ? '上車地點' : 'Pickup'}:</span>
                        <span className="font-medium text-white">{lang === 'zh' ? order.pickup.nameZh : order.pickup.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{lang === 'zh' ? '下車地點' : 'Dropoff'}:</span>
                        <span className="font-medium text-white">{lang === 'zh' ? order.dropoff.nameZh : order.dropoff.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                        <span>乘客: {order.customer.name} ({order.customer.phone})</span>
                        <span>·</span>
                        <span>預約時間: {order.scheduledTime.slice(0, 16).replace('T', ' ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400">{lang === 'zh' ? '最近完成之歷史行程' : 'Recent Completed Rides'}</p>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {completedOrders.slice(0, 8).map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-white">{o.orderNo}</span>
                      <span className="text-slate-400 truncate max-w-[240px]">
                        {(lang === 'zh' ? o.pickup.nameZh : o.pickup.name)} → {(lang === 'zh' ? o.dropoff.nameZh : o.dropoff.name)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-400">{o.scheduledTime.slice(0, 10)}</span>
                      <span className="font-bold text-emerald-300">{formatTWD(o.priceEstimate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Shift & Schedule */}
        {activeTab === 'SHIFT' && (
          <div className="space-y-4" data-testid="driver-tab-shift-content">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '1鍵輪班設定與時段調整' : '1-Click Shift Schedule Management'}
              </h3>
              <span className="font-mono text-xs text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                目前班表: {driver.workingHours ? `${driver.workingHours.shiftStart} - ${driver.workingHours.shiftEnd}` : '09:00 - 18:00'}
              </span>
            </div>

            {/* Quick 1-Click Presets */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleApplyPresetShift('MORNING', '06:00', '14:00', '10:00', '10:30')}
                className={clsx(
                  'flex flex-col items-start rounded-2xl border p-4 text-left transition',
                  shiftType === 'MORNING' ? 'bg-amber-500/20 border-amber-400/50 shadow-lg' : 'bg-white/[0.02] border-white/10 hover:bg-white/5',
                )}
              >
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
                  <Sunrise className="h-4 w-4" /> 早班 (Morning)
                </div>
                <p className="font-mono text-xs text-white font-bold">06:00 - 14:00</p>
                <p className="text-[11px] text-slate-400 mt-1">主攻清晨出境送機尖峰 (TPE Departure Wave)</p>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPresetShift('DAY', '09:00', '18:00', '12:30', '13:30')}
                className={clsx(
                  'flex flex-col items-start rounded-2xl border p-4 text-left transition',
                  shiftType === 'DAY' ? 'bg-cyan-500/20 border-cyan-400/50 shadow-lg' : 'bg-white/[0.02] border-white/10 hover:bg-white/5',
                )}
              >
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm mb-1">
                  <Sun className="h-4 w-4" /> 日間常規班 (Day)
                </div>
                <p className="font-mono text-xs text-white font-bold">09:00 - 18:00</p>
                <p className="text-[11px] text-slate-400 mt-1">市區接駁、企業差旅與全日觀光包車</p>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPresetShift('NIGHT', '18:00', '03:00', '22:00', '22:30')}
                className={clsx(
                  'flex flex-col items-start rounded-2xl border p-4 text-left transition',
                  shiftType === 'NIGHT' ? 'bg-purple-500/20 border-purple-400/50 shadow-lg' : 'bg-white/[0.02] border-white/10 hover:bg-white/5',
                )}
              >
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm mb-1">
                  <Moon className="h-4 w-4" /> 夜間紅眼班 (Night)
                </div>
                <p className="font-mono text-xs text-white font-bold">18:00 - 03:00</p>
                <p className="text-[11px] text-slate-400 mt-1">入境紅眼班機接機 (Red-Eye Inbound + 夜間加乘)</p>
              </button>
            </div>

            {/* Custom Hours Fine Tuning */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300">{lang === 'zh' ? '自訂彈性出勤時段微調' : 'Custom Shift Window Fine Tuning'}</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{lang === 'zh' ? '上班開始' : 'Shift Start'}</label>
                  <input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{lang === 'zh' ? '下班時間' : 'Shift End'}</label>
                  <input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{lang === 'zh' ? '中場休息開始' : 'Break Start'}</label>
                  <input type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">{lang === 'zh' ? '休息結束' : 'Break End'}</label>
                  <input type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white font-mono" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    updateDriverShift(driver.id, {
                      shiftType: 'CUSTOM',
                      shiftStart,
                      shiftEnd,
                      breakStart,
                      breakEnd,
                      onShift: true,
                    })
                    showAlert(lang === 'zh' ? `已儲存自訂班表 (${shiftStart} - ${shiftEnd})` : `Custom shift saved (${shiftStart} - ${shiftEnd})`)
                  }}
                  data-testid="save-custom-shift-btn"
                >
                  {lang === 'zh' ? '套用自訂班表' : 'Apply Shift Changes'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Safety & Fatigue (MOTC HoS) */}
        {activeTab === 'SAFETY_HOS' && (
          <div className="space-y-4" data-testid="driver-tab-safety-content">
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <ShieldAlert className="h-4 w-4" />
                  <span>{lang === 'zh' ? '交通部公路局連續駕駛工時合規監控 (MOTC 8-Hour Rule)' : 'Taiwan MOTC Hours of Service (HoS)'}</span>
                </div>
                <span className={clsx(
                  'rounded-lg px-2.5 py-0.5 text-xs font-bold font-mono',
                  fatigueRiskLevel === 'CRITICAL' ? 'bg-rose-500 text-white animate-pulse' : fatigueRiskLevel === 'HIGH' ? 'bg-amber-500/30 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                )}>
                  風險等級: {fatigueRiskLevel}
                </span>
              </div>

              {/* Progress Gauge */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{lang === 'zh' ? '今日連續執勤累積工時' : 'Continuous Service Time Today'}</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {continuousDrivingHours} 小時 / 上限 8.0 小時 ({serviceMinsToday}m / 480m)
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900 border border-white/10">
                  <div
                    className={clsx(
                      'h-full transition-all duration-500',
                      fatigueRiskLevel === 'CRITICAL' ? 'bg-rose-500 shadow-[0_0_12px_#f43f5e]' : fatigueRiskLevel === 'HIGH' ? 'bg-amber-400' : 'bg-emerald-400'
                    )}
                    style={{ width: `${Math.min(100, (serviceMinsToday / 480) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 border-t border-rose-500/20 pt-3">
                <p className="max-w-md text-[11px] text-slate-400">
                  法規防呆：依「汽車運輸業管理規則」第19條之2，連續駕車4小時應至少休息30分鐘；單日總工時不得逾10小時。
                </p>

                {/* Force Rest Break Override */}
                <Button
                  variant={isResting ? 'success' : 'danger'}
                  size="sm"
                  onClick={handleToggleBreak}
                  data-testid="driver-modal-force-break-btn"
                >
                  <Coffee className="h-3.5 w-3.5" />
                  <span>{isResting ? (lang === 'zh' ? '結束休息恢復接單' : 'Resume Duty') : (lang === 'zh' ? '強制休息 30 分鐘' : 'Force Rest Break')}</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Financials & Earnings */}
        {activeTab === 'FINANCIALS' && (
          <div className="space-y-4" data-testid="driver-tab-financials-content">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={<BadgeDollarSign className="h-4 w-4" />} label={lang === 'zh' ? '本日營業額' : 'Today Revenue'} value={todayRevenue} prefix="NT$" tone="lime" />
              <StatCard icon={<DollarSign className="h-4 w-4" />} label={lang === 'zh' ? '本日司機淨得' : 'Net Payout Today'} value={netEarningsToday} prefix="NT$" tone="cyan" />
              <StatCard icon={<BadgeDollarSign className="h-4 w-4" />} label={lang === 'zh' ? '車隊抽成比例' : 'Commission Rate'} value={Math.round(commissionRate * 100)} suffix="%" tone="purple" />
              <StatCard icon={<DollarSign className="h-4 w-4" />} label={lang === 'zh' ? '可即時提現錢包' : 'Cashout Wallet'} value={driver.walletBalance ?? 14850} prefix="NT$" tone="amber" />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{lang === 'zh' ? '本月預估拆帳與撥款結算' : 'Monthly Payout & Commission Breakdown'}</h4>
                <span className="font-mono text-xs text-emerald-300 font-bold">預估月營收: {formatTWD(monthlyEstimatedGross)}</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>車隊身分合約等級 (Tier)</span>
                  <TierBadge tier={driver.tier} />
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>平台系統抽成 (Platform Commission)</span>
                  <span className="font-mono font-bold text-rose-300">-{formatTWD(Math.round(monthlyEstimatedGross * commissionRate))} ({Math.round(commissionRate * 100)}%)</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>司機週結實領淨額 (Net Monthly Settlement)</span>
                  <span className="font-mono font-bold text-emerald-300 text-sm">{formatTWD(Math.round(monthlyEstimatedGross * (1 - commissionRate)))}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Compliance & Documents */}
        {activeTab === 'COMPLIANCE' && (
          <div className="space-y-4" data-testid="driver-tab-compliance-content">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '法定營業執照、執業登記證與保險 OCR 查驗' : 'Licenses, Taxi Permits & Insurance OCR Audit'}
              </h3>
              <span className="font-mono text-xs text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> 合規狀態: 符合交通部營業標準
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(driver.documents).map(([kind, doc]) => (
                <div key={kind} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{t(`doc.${kind}`)}</span>
                    <Badge tone={doc.status === 'VALID' ? 'green' : doc.status === 'EXPIRING' ? 'amber' : 'red'}>
                      {t(`fleetos.compliance.docStatus.${doc.status}`)}
                    </Badge>
                  </div>

                  <div className="space-y-1 font-mono text-[11px] text-slate-400">
                    <p>字號: {doc.number}</p>
                    <p>效期至: {formatDateTime(doc.expiresAt, lang)}</p>
                    <div className="flex items-center gap-1 text-cyan-300 pt-1">
                      <FileCheck2 className="h-3.5 w-3.5" />
                      <span>OCR 影像辨識: {doc.ocrStatus === 'VERIFIED' ? '自動審驗通過 (Verified)' : '待人工複核'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-white/10 pt-4">
          <Button variant="secondary" size="sm" onClick={onClose} data-testid="driver-modal-close-btn">
            {lang === 'zh' ? '關閉視窗' : 'Close Profile'}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
