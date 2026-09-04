import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Power,
  Radio,
  RotateCcw,
  Search,
  UserPlus,
  Users2,
  Zap,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { FleetRosterBreakdown } from '../../components/control/FleetRosterBreakdown'
import { DriverScheduleMatrix } from '../../components/control/DriverScheduleMatrix'
import { TodayRosterBoard } from '../../components/control/TodayRosterBoard'
import { Badge } from '../../components/ui/Badge'
import { TierBadge, StatusBadge } from '../../components/ui/OrderBadges'
import { AddDriverModal } from '../../components/fleetos/AddDriverModal'
import { DriverShiftModal } from '../../components/fleetos/DriverShiftModal'
import { ManualAssignmentModal } from '../../components/fleetos/ManualAssignmentModal'
import type { Driver, DriverTier, DriverWorkingMode, DriverWorkingShiftType, VehicleCategory } from '../../types'
import { useLang } from '../../i18n'

const MODES: DriverWorkingMode[] = ['AIRPORT_PRIORITY', 'CITY_PRIORITY', 'ANY']
const PAGE_SIZE = 20

export default function RosterPanel() {
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const orders = useFleetStore((s) => s.orders)
  const setDriverWorkingMode = useFleetStore((s) => s.setDriverWorkingMode)
  const setDriverAutoAccept = useFleetStore((s) => s.setDriverAutoAccept)
  const setDriverAvailability = useFleetStore((s) => s.setDriverAvailability)
  const toggleDriverBreakMode = useFleetStore((s) => s.toggleDriverBreakMode)

  const [tab, setTab] = useState<'HUB' | 'ROSTER' | 'SCHEDULE' | 'TODAY'>('HUB')
  const [query, setQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<'ALL' | DriverTier>('ALL')
  const [shiftFilter, setShiftFilter] = useState<'ALL' | DriverWorkingShiftType>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | VehicleCategory>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'BREAK'>('ALL')
  const [page, setPage] = useState(1)

  const [showAddDriver, setShowAddDriver] = useState(false)
  const [editingShiftDriver, setEditingShiftDriver] = useState<Driver | null>(null)
  const [assigningDriver, setAssigningDriver] = useState<Driver | null>(null)

  const available = drivers.filter((d) => d.status === 'AVAILABLE').length
  const busy = drivers.filter((d) => d.status === 'BUSY').length
  const onBreak = drivers.filter((d) => d.breakMode || d.status === 'BREAK').length
  const airportPref = drivers.filter((d) => d.airportPreference).length

  // Comprehensive Search and Multi-Filter
  const filteredDrivers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return drivers.filter((d) => {
      const v = vehicles.find((veh) => veh.id === d.vehicleId)

      // Query filter: Name, phone, vehicle plate, ID
      if (q) {
        const matchesName = d.name.toLowerCase().includes(q) || d.nameZh.includes(query.trim())
        const matchesPhone = d.phone.includes(q)
        const matchesId = d.id.toLowerCase().includes(q)
        const matchesPlate = v?.plate.toLowerCase().includes(q)
        if (!matchesName && !matchesPhone && !matchesId && !matchesPlate) return false
      }

      // Tier filter
      if (tierFilter !== 'ALL' && d.tier !== tierFilter) return false

      // Shift filter
      if (shiftFilter !== 'ALL') {
        const currentShiftType = d.workingHours?.shiftType ?? 'DAY'
        if (currentShiftType !== shiftFilter) return false
      }

      // Category filter
      if (categoryFilter !== 'ALL' && v?.category !== categoryFilter) return false

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'BREAK' && !d.breakMode && d.status !== 'BREAK') return false
        if (statusFilter !== 'BREAK' && d.status !== statusFilter) return false
      }

      return true
    })
  }, [drivers, vehicles, query, tierFilter, shiftFilter, categoryFilter, statusFilter])

  const totalPages = Math.ceil(filteredDrivers.length / PAGE_SIZE) || 1
  const pagedDrivers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredDrivers.slice(start, start + PAGE_SIZE)
  }, [filteredDrivers, page])

  const handleResetFilters = () => {
    setQuery('')
    setTierFilter('ALL')
    setShiftFilter('ALL')
    setCategoryFilter('ALL')
    setStatusFilter('ALL')
    setPage(1)
  }

  return (
    <FleetOsPage
      title={lang === 'zh' ? '全車隊司機管理中心 (Driver Hub)' : t('fleetos.roster.title')}
      subtitle={
        lang === 'zh'
          ? '即時管理 350+ 司機運力狀態、指派訂單、班表調度、強制疲勞休息與車輛規格'
          : t('fleetos.roster.subtitle')
      }
      icon={<Users2 className="h-5 w-5" />}
      right={
        <button
          onClick={() => setShowAddDriver(true)}
          data-testid="open-add-driver-modal-btn"
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] transition"
        >
          <UserPlus className="h-4 w-4" />
          <span>{t('fleetos.roster.addDriverBtn')}</span>
        </button>
      }
    >
      <AddDriverModal isOpen={showAddDriver} onClose={() => setShowAddDriver(false)} />
      <DriverShiftModal driver={editingShiftDriver} isOpen={!!editingShiftDriver} onClose={() => setEditingShiftDriver(null)} />
      <ManualAssignmentModal driver={assigningDriver} isOpen={!!assigningDriver} onClose={() => setAssigningDriver(null)} />

      {/* KPI Summary Cards */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="driver-hub-kpis">
        <StatCard icon={<Users2 className="h-4 w-4" />} label={t('fleetos.roster.totalDrivers')} value={drivers.length} tone="cyan" />
        <StatCard icon={<Radio className="h-4 w-4" />} label={t('fleetos.roster.available')} value={available} tone="lime" />
        <StatCard icon={<Radio className="h-4 w-4" />} label={t('fleetos.roster.busy')} value={busy} tone="amber" />
        <StatCard icon={<Coffee className="h-4 w-4" />} label={lang === 'zh' ? '休息/中斷中' : 'Resting / Break'} value={onBreak} tone="purple" />
        <StatCard icon={<Radio className="h-4 w-4" />} label={t('fleetos.roster.airportPref')} value={airportPref} tone="pink" />
      </div>

      {/* Main Tabs Navigation */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { key: 'HUB', labelZh: '🎛️ 司機總覽管理大廳 (Driver Hub)', labelEn: 'Driver Management Hub' },
            { key: 'ROSTER', labelZh: '📊 運力梯隊分析 (Roster Breakdown)', labelEn: 'Roster Breakdown' },
            { key: 'SCHEDULE', labelZh: '📅 7日排班矩陣 (Shift Schedule)', labelEn: 'Schedule Matrix' },
            { key: 'TODAY', labelZh: '📋 本日執勤看板 (Today Roster)', labelEn: 'Today Board' },
          ].map(({ key, labelZh, labelEn }) => (
            <button
              key={key}
              onClick={() => {
                setTab(key as any)
                setPage(1)
              }}
              data-testid={`driver-hub-tab-${key.toLowerCase()}`}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                tab === key
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {lang === 'zh' ? labelZh : labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: Complete Driver Management Hub (350+ Driver Table, HoS Fatigue, Actions) */}
      {tab === 'HUB' && (
        <div className="mt-3 space-y-3" data-testid="driver-hub-main-view">
          {/* Filter Bar */}
          <div className="glass-panel rounded-2xl p-3 border border-white/10 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder={
                    lang === 'zh'
                      ? '搜尋司機姓名、電話、車牌號碼 (如 ABC-5581)、ID…'
                      : 'Search name, phone, plate, ID…'
                  }
                  data-testid="driver-hub-search-input"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
                />
              </div>

              {/* Tier Filter */}
              <select
                value={tierFilter}
                onChange={(e) => {
                  setTierFilter(e.target.value as any)
                  setPage(1)
                }}
                data-testid="driver-hub-tier-filter"
                className="rounded-xl border border-white/10 bg-slate-900/80 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400/50"
              >
                <option value="ALL">{lang === 'zh' ? '全部車隊類型' : 'All Tiers'}</option>
                <option value="OWNED_FLEET">{lang === 'zh' ? '自營直營車隊 (Owned)' : 'Owned Fleet'}</option>
                <option value="PAID_MEMBER">{lang === 'zh' ? '付費加盟司機 (Member)' : 'Paid Member'}</option>
                <option value="OUTSIDE_CONTRACTOR">{lang === 'zh' ? '同業合作承包 (Contractor)' : 'Outside Contractor'}</option>
              </select>

              {/* Shift Filter */}
              <select
                value={shiftFilter}
                onChange={(e) => {
                  setShiftFilter(e.target.value as any)
                  setPage(1)
                }}
                data-testid="driver-hub-shift-filter"
                className="rounded-xl border border-white/10 bg-slate-900/80 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400/50"
              >
                <option value="ALL">{lang === 'zh' ? '全部班表 (All Shifts)' : 'All Shifts'}</option>
                <option value="MORNING">{lang === 'zh' ? '早班 (06:00-14:00)' : 'Morning'}</option>
                <option value="DAY">{lang === 'zh' ? '日間常規班 (09:00-18:00)' : 'Day'}</option>
                <option value="NIGHT">{lang === 'zh' ? '夜間紅眼班 (18:00-03:00)' : 'Night'}</option>
                <option value="CUSTOM">{lang === 'zh' ? '自訂彈性班' : 'Custom'}</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any)
                  setPage(1)
                }}
                data-testid="driver-hub-status-filter"
                className="rounded-xl border border-white/10 bg-slate-900/80 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400/50"
              >
                <option value="ALL">{lang === 'zh' ? '全部上線狀態' : 'All Statuses'}</option>
                <option value="AVAILABLE">{lang === 'zh' ? '空車可接單 (Available)' : 'Available'}</option>
                <option value="BUSY">{lang === 'zh' ? '行程執勤中 (Busy)' : 'On Trip (Busy)'}</option>
                <option value="BREAK">{lang === 'zh' ? '休息中 (Break/Rest)' : 'On Break'}</option>
                <option value="OFFLINE">{lang === 'zh' ? '離線休息 (Offline)' : 'Offline'}</option>
              </select>

              {/* Reset Filter Button */}
              {(query || tierFilter !== 'ALL' || shiftFilter !== 'ALL' || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
                <button
                  onClick={handleResetFilters}
                  data-testid="driver-hub-reset-filters-btn"
                  className="flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/15 transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{lang === 'zh' ? '重設' : 'Reset'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
              <span>
                {lang === 'zh'
                  ? `顯示 ${filteredDrivers.length} / 共 ${drivers.length} 名司機`
                  : `Showing ${filteredDrivers.length} of ${drivers.length} drivers`}
              </span>
              <div className="flex items-center gap-2">
                <span>
                  {page} / {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg bg-white/5 p-1 text-slate-400 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg bg-white/5 p-1 text-slate-400 hover:bg-white/10 disabled:opacity-30"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Drivers Hub Table */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="driver-hub-table">
                <thead className="bg-slate-950/80 text-[10.5px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-3.5 py-3">{lang === 'zh' ? '司機資料 / 身分' : 'Driver / Role'}</th>
                    <th className="px-3 py-3">{lang === 'zh' ? '即時狀態' : 'Live Status'}</th>
                    <th className="px-3 py-3">{lang === 'zh' ? '車輛 / 車牌' : 'Vehicle / Plate'}</th>
                    <th className="px-3 py-3">{lang === 'zh' ? '當前任務 / 訂單' : 'Active Order'}</th>
                    <th className="px-3 py-3">{lang === 'zh' ? '班表時段' : 'Shift Hours'}</th>
                    <th className="px-3 py-3">{lang === 'zh' ? '工時 / 疲勞 (HoS)' : 'Driving HoS'}</th>
                    <th className="px-3.5 py-3 text-right">{lang === 'zh' ? '管理調度動作' : 'Dispatcher Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pagedDrivers.map((d) => {
                    const vehicle = vehicles.find((v) => v.id === d.vehicleId)
                    const activeOrder = orders.find(
                      (o) => o.driverId === d.id && ['ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'PASSENGER_ONBOARD'].includes(o.status),
                    )

                    const serviceMins = d.serviceMinutesToday ?? 140
                    const isHoSCritical = serviceMins >= 390
                    const isHoSWarning = serviceMins >= 330
                    const isResting = d.breakMode || d.status === 'BREAK'

                    return (
                      <tr key={d.id} className="hover:bg-white/[0.02] transition" data-testid={`driver-row-${d.id}`}>
                        {/* Driver Info */}
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg border border-white/10">
                              {d.avatarEmoji}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{lang === 'zh' ? d.nameZh : d.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">({d.id})</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <TierBadge tier={d.tier} />
                                <span className="text-[10px] text-slate-400 font-mono">{d.phone}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  d.status === 'AVAILABLE'
                                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                                    : d.status === 'BUSY'
                                      ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                                      : isResting
                                        ? 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
                                        : 'bg-slate-600'
                                }`}
                              />
                              <Badge
                                tone={
                                  d.status === 'AVAILABLE'
                                    ? 'green'
                                    : d.status === 'BUSY'
                                      ? 'amber'
                                      : isResting
                                        ? 'purple'
                                        : 'slate'
                                }
                              >
                                {isResting ? (lang === 'zh' ? '休息中' : 'On Break') : t(`driverStatus.${d.status}`)}
                              </Badge>
                            </div>
                            {d.unresponsiveFlagUntil && d.unresponsiveFlagUntil > Date.now() && (
                              <Badge tone="red" pulse>
                                ⚠ {lang === 'zh' ? '未即時回報' : 'Unresponsive'}
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td className="px-3 py-3">
                          {vehicle ? (
                            <div>
                              <p className="font-mono font-bold text-cyan-300">{vehicle.plate}</p>
                              <p className="text-[10.5px] text-slate-400">
                                {t(`vehicle.category.${vehicle.category}`)} · {vehicle.capacity}座
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Active Order */}
                        <td className="px-3 py-3">
                          {activeOrder ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-white text-[11px]">{activeOrder.orderNo}</span>
                                <StatusBadge status={activeOrder.status} />
                              </div>
                              <p className="text-[10.5px] text-slate-400 truncate max-w-[140px]">
                                {(lang === 'zh' ? activeOrder.pickup.nameZh : activeOrder.pickup.name)} →{' '}
                                {(lang === 'zh' ? activeOrder.dropoff.nameZh : activeOrder.dropoff.name)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">IDLE / 待命中</span>
                          )}
                        </td>

                        {/* Shift Hours */}
                        <td className="px-3 py-3">
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 font-mono text-[10.5px] text-cyan-300 border border-slate-800">
                              <Clock className="h-2.5 w-2.5" />
                              {d.workingHours ? `${d.workingHours.shiftStart}-${d.workingHours.shiftEnd}` : '09:00-18:00'}
                            </span>
                            <p className="text-[10px] text-slate-400">
                              {d.workingHours?.shiftType ? t(`shift.${d.workingHours.shiftType}`) : 'DAY SHIFT'}
                            </p>
                          </div>
                        </td>

                        {/* HoS Driving Fatigue Gauge */}
                        <td className="px-3 py-3">
                          <div className="space-y-1 min-w-[110px]">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 font-mono">{serviceMins}m / 420m</span>
                              <span
                                className={`font-bold ${
                                  isHoSCritical ? 'text-rose-400 animate-pulse' : isHoSWarning ? 'text-amber-400' : 'text-emerald-300'
                                }`}
                              >
                                {isResting ? (lang === 'zh' ? '休息' : 'Resting') : `${Math.round((serviceMins / 420) * 100)}%`}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                className={`h-full ${
                                  isHoSCritical ? 'bg-rose-500' : isHoSWarning ? 'bg-amber-400' : 'bg-emerald-400'
                                }`}
                                style={{ width: `${Math.min(100, (serviceMins / 420) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Dispatcher Actions */}
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Online/Offline */}
                            <button
                              onClick={() => {
                                const nextStatus = d.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE'
                                setDriverAvailability(d.id, nextStatus)
                              }}
                              data-testid={`driver-toggle-online-${d.id}`}
                              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold border transition ${
                                d.status === 'AVAILABLE'
                                  ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25'
                                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                              }`}
                              title={d.status === 'AVAILABLE' ? (lang === 'zh' ? '設為離線' : 'Set Offline') : (lang === 'zh' ? '設為上線' : 'Set Online')}
                            >
                              <Power className="h-3 w-3" />
                              <span>{d.status === 'AVAILABLE' ? (lang === 'zh' ? '上線' : 'Online') : (lang === 'zh' ? '離線' : 'Offline')}</span>
                            </button>

                            {/* 1-Click Order Assignment */}
                            <button
                              onClick={() => setAssigningDriver(d)}
                              data-testid={`driver-assign-btn-${d.id}`}
                              className="flex items-center gap-1 rounded-lg border border-purple-400/30 bg-purple-500/15 px-2 py-1 text-[10.5px] font-bold text-purple-300 hover:bg-purple-500/25 transition"
                              title={lang === 'zh' ? '指派或插單' : 'Assign Order'}
                            >
                              <Zap className="h-3 w-3" />
                              <span>{lang === 'zh' ? '指派' : 'Assign'}</span>
                            </button>

                            {/* Edit Shift Modal Trigger */}
                            <button
                              onClick={() => setEditingShiftDriver(d)}
                              data-testid={`driver-shift-btn-${d.id}`}
                              className="edit-driver-shift-btn flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10.5px] font-bold text-cyan-300 hover:bg-cyan-400/20 transition"
                              title={lang === 'zh' ? '調整班表時段' : 'Edit Shift'}
                            >
                              <Clock className="h-3 w-3" />
                              <span>{lang === 'zh' ? '排班' : 'Shift'}</span>
                            </button>

                            {/* Force Rest / HoS Break */}
                            <button
                              onClick={() => toggleDriverBreakMode(d.id)}
                              data-testid={`driver-force-break-${d.id}`}
                              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10.5px] font-bold transition ${
                                isResting
                                  ? 'border-purple-400/40 bg-purple-500/20 text-purple-300'
                                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                              }`}
                              title={lang === 'zh' ? '強制疲勞休息或恢復出車' : 'Force Rest Break'}
                            >
                              <Coffee className="h-3 w-3" />
                              <span>{isResting ? (lang === 'zh' ? '復工' : 'Resume') : (lang === 'zh' ? '強制休息' : 'Force Rest')}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredDrivers.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-500">
                {lang === 'zh' ? '找不到相符條件的司機資料' : 'No drivers match the current filter criteria.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Roster Breakdown */}
      {tab === 'ROSTER' && (
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass-panel rounded-2xl p-3">
            <FleetRosterBreakdown />
          </div>
          <div className="glass-panel max-h-[640px] overflow-y-auto rounded-2xl p-3" data-testid="driver-working-mode-list">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('fleetos.roster.workingModes')}</p>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={lang === 'zh' ? '搜尋司機…' : 'Search driver…'}
                className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
              />
            </div>
            <div className="space-y-1.5">
              {filteredDrivers.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.02] p-2.5" data-testid="driver-working-mode-row">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base">{d.avatarEmoji}</span>
                    <span className="truncate text-xs font-medium text-slate-200">{lang === 'zh' ? d.nameZh : d.name}</span>
                    <Badge tone={d.status === 'AVAILABLE' ? 'green' : d.status === 'BUSY' ? 'amber' : 'slate'}>{t(`driverStatus.${d.status}`)}</Badge>
                    {d.workingHours && (
                      <span className="hidden sm:inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-slate-700">
                        <Clock className="h-2.5 w-2.5" />
                        {d.workingHours.shiftStart}-{d.workingHours.shiftEnd}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setAssigningDriver(d)}
                      data-testid="roster-assign-order-btn"
                      className="flex items-center gap-1 rounded-lg border border-purple-400/30 bg-purple-500/15 px-2 py-1 text-[10.5px] font-semibold text-purple-300 hover:bg-purple-500/25 transition"
                      title={lang === 'zh' ? '指派訂單給此司機' : 'Assign Order'}
                    >
                      <Zap className="h-3 w-3" />
                      <span>{lang === 'zh' ? '派單' : 'Assign'}</span>
                    </button>
                    <button
                      onClick={() => setEditingShiftDriver(d)}
                      data-testid="edit-driver-shift-btn"
                      className="flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10.5px] font-semibold text-cyan-300 hover:bg-cyan-400/20 transition"
                      title={lang === 'zh' ? '調整班表' : 'Edit Shift'}
                    >
                      <Clock className="h-3 w-3" />
                      <span>{lang === 'zh' ? '排班' : 'Shift'}</span>
                    </button>
                    <select
                      value={d.workingMode}
                      onChange={(e) => setDriverWorkingMode(d.id, e.target.value as DriverWorkingMode)}
                      data-testid="driver-working-mode-select"
                      className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] text-slate-200 outline-none focus:border-cyan-400/40"
                    >
                      {MODES.map((m) => (
                        <option key={m} value={m}>
                          {t(`fleetos.roster.mode.${m}`)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setDriverAutoAccept(d.id, !d.autoAcceptEnabled)}
                      data-testid="driver-auto-accept-toggle"
                      className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold ${d.autoAcceptEnabled ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/5 text-slate-500'}`}
                    >
                      {t('fleetos.roster.autoAccept')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Schedule Matrix */}
      {tab === 'SCHEDULE' && (
        <div className="mt-3 glass-panel rounded-2xl p-3">
          <DriverScheduleMatrix />
        </div>
      )}

      {/* TAB 4: Today Roster Board */}
      {tab === 'TODAY' && (
        <div className="mt-3">
          <TodayRosterBoard />
        </div>
      )}
    </FleetOsPage>
  )
}
