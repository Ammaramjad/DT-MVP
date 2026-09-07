import { useMemo, useState } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Maximize2,
  Minimize2,
  Moon,
  RotateCcw,
  Search,
  Sun,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import { TierBadge } from '../ui/OrderBadges'
import { DriverProfileModal, type DriverModalTab } from '../fleetos/DriverProfileModal'
import type { Driver, DriverTier, ShiftDay } from '../../types'

const SHIFT_STYLES: Record<ShiftDay['shift'], string> = {
  DAY: 'bg-amber-400/20 text-amber-200 border-amber-400/30 hover:bg-amber-400/30 hover:border-amber-400/60',
  NIGHT: 'bg-indigo-400/25 text-indigo-200 border-indigo-400/30 hover:bg-indigo-400/35 hover:border-indigo-400/60',
  OFF: 'bg-white/[0.03] text-slate-500 border-white/5 hover:bg-white/10 hover:text-slate-300',
}

const SHIFT_LABEL: Record<ShiftDay['shift'], string> = { DAY: '日', NIGHT: '夜', OFF: '休' }

type ShiftFilterType = 'ALL' | 'DAY_TODAY' | 'NIGHT_TODAY' | 'OFF_TODAY'
type PageSizeType = 15 | 25 | 50 | 'ALL'

interface ShiftEditTarget {
  driver: Driver
  date: string
  currentShift: ShiftDay['shift']
}

export function DriverScheduleMatrix() {
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const updateDriverShiftScheduleDay = useFleetStore((s) => s.updateDriverShiftScheduleDay)

  // Filters & Pagination State
  const [query, setQuery] = useState('')
  const [shiftFilter, setShiftFilter] = useState<ShiftFilterType>('ALL')
  const [tierFilter, setTierFilter] = useState<'ALL' | DriverTier>('ALL')
  const [pageSize, setPageSize] = useState<PageSizeType>(25)
  const [page, setPage] = useState(1)
  const [isCompact, setIsCompact] = useState(false)
  const [dateJumpTarget, setDateJumpTarget] = useState<string>('')

  // Interactive Modals / Popovers
  const [selectedProfileDriver, setSelectedProfileDriver] = useState<Driver | null>(null)
  const [profileInitialTab, setProfileInitialTab] = useState<DriverModalTab>('OVERVIEW')
  const [editingShiftCell, setEditingShiftCell] = useState<ShiftEditTarget | null>(null)

  const dates = drivers[0]?.shiftSchedule.map((s) => s.date) ?? []
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // Stats calculation for today
  const todayStats = useMemo(() => {
    let dayCount = 0
    let nightCount = 0
    let offCount = 0

    drivers.forEach((d) => {
      const todayShift = d.shiftSchedule.find((s) => s.date === todayIso)?.shift ?? 'DAY'
      if (todayShift === 'DAY') dayCount++
      else if (todayShift === 'NIGHT') nightCount++
      else offCount++
    })

    return {
      total: drivers.length,
      day: dayCount,
      night: nightCount,
      off: offCount,
      onDuty: dayCount + nightCount,
    }
  }, [drivers, todayIso])

  // Filtered drivers list
  const filteredDrivers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return drivers.filter((d) => {
      const v = vehicles.find((veh) => veh.id === d.vehicleId)

      // Query Filter: Name (EN/ZH), phone, vehicle plate, ID
      if (q) {
        const matchesName = d.name.toLowerCase().includes(q) || d.nameZh.includes(query.trim())
        const matchesPhone = d.phone.includes(q)
        const matchesId = d.id.toLowerCase().includes(q)
        const matchesPlate = v?.plate.toLowerCase().includes(q)
        if (!matchesName && !matchesPhone && !matchesId && !matchesPlate) return false
      }

      // Tier Filter
      if (tierFilter !== 'ALL' && d.tier !== tierFilter) return false

      // Shift Filter (based on today's shift)
      if (shiftFilter !== 'ALL') {
        const todayShift = d.shiftSchedule.find((s) => s.date === todayIso)?.shift
        if (shiftFilter === 'DAY_TODAY' && todayShift !== 'DAY') return false
        if (shiftFilter === 'NIGHT_TODAY' && todayShift !== 'NIGHT') return false
        if (shiftFilter === 'OFF_TODAY' && todayShift !== 'OFF') return false
      }

      return true
    })
  }, [drivers, vehicles, query, tierFilter, shiftFilter, todayIso])

  // Pagination calculation
  const totalDriversCount = filteredDrivers.length
  const actualPageSize = pageSize === 'ALL' ? (totalDriversCount || 1) : pageSize
  const totalPages = Math.ceil(totalDriversCount / actualPageSize) || 1

  const pagedDrivers = useMemo(() => {
    if (pageSize === 'ALL') return filteredDrivers
    const start = (page - 1) * pageSize
    return filteredDrivers.slice(start, start + pageSize)
  }, [filteredDrivers, page, pageSize])

  const handleResetFilters = () => {
    setQuery('')
    setShiftFilter('ALL')
    setTierFilter('ALL')
    setPage(1)
  }

  const handleShiftQuickChange = (newShift: ShiftDay['shift']) => {
    if (!editingShiftCell) return
    updateDriverShiftScheduleDay(editingShiftCell.driver.id, editingShiftCell.date, newShift)
    setEditingShiftCell(null)
  }

  const handleDateJump = (date: string) => {
    setDateJumpTarget(date)
    const el = document.getElementById(`schedule-col-${date}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }

  return (
    <div className="space-y-3" data-testid="driver-schedule-matrix-root">
      {/* Driver Profile Modal */}
      <DriverProfileModal
        driver={selectedProfileDriver}
        vehicle={selectedProfileDriver ? vehicles.find((v) => v.id === selectedProfileDriver.vehicleId) : null}
        isOpen={!!selectedProfileDriver}
        onClose={() => setSelectedProfileDriver(null)}
        initialTab={profileInitialTab}
      />

      {/* Quick Shift Edit Popover / Modal */}
      <AnimatePresence>
        {editingShiftCell && (
          <div
            className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setEditingShiftCell(null)}
            data-testid="shift-cell-edit-modal"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-900 p-5 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xl border border-white/10">
                    {editingShiftCell.driver.avatarEmoji}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {lang === 'zh' ? editingShiftCell.driver.nameZh : editingShiftCell.driver.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      📅 {editingShiftCell.date} {editingShiftCell.date === todayIso && `(${lang === 'zh' ? '本日' : 'Today'})`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingShiftCell(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-400">
                  {lang === 'zh' ? '選擇此司機該日的排班狀態：' : 'Select shift status for this date:'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleShiftQuickChange('DAY')}
                    data-testid="shift-modal-set-day"
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition ${
                      editingShiftCell.currentShift === 'DAY'
                        ? 'bg-amber-400/25 border-amber-400/60 text-amber-200 shadow-lg shadow-amber-500/20'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Sun className="h-5 w-5 text-amber-400" />
                    <span className="text-xs font-bold">{lang === 'zh' ? '白班' : 'Day Shift'}</span>
                    <span className="text-[10px] font-mono opacity-70">09:00-18:00</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShiftQuickChange('NIGHT')}
                    data-testid="shift-modal-set-night"
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition ${
                      editingShiftCell.currentShift === 'NIGHT'
                        ? 'bg-indigo-400/30 border-indigo-400/60 text-indigo-200 shadow-lg shadow-indigo-500/20'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Moon className="h-5 w-5 text-indigo-300" />
                    <span className="text-xs font-bold">{lang === 'zh' ? '夜班' : 'Night Shift'}</span>
                    <span className="text-[10px] font-mono opacity-70">18:00-03:00</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShiftQuickChange('OFF')}
                    data-testid="shift-modal-set-off"
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition ${
                      editingShiftCell.currentShift === 'OFF'
                        ? 'bg-slate-700/60 border-slate-400/60 text-slate-200 shadow-lg'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Clock className="h-5 w-5 text-slate-400" />
                    <span className="text-xs font-bold">{lang === 'zh' ? '休假' : 'Off Duty'}</span>
                    <span className="text-[10px] font-mono opacity-70">—</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    const d = editingShiftCell.driver
                    setEditingShiftCell(null)
                    setSelectedProfileDriver(d)
                    setProfileInitialTab('SHIFT')
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
                >
                  {lang === 'zh' ? '開啟完整司機排班檔案 ➔' : 'Open Driver Shift Profile ➔'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingShiftCell(null)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/20 transition"
                >
                  {lang === 'zh' ? '關閉' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Stats Summary Header */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5" data-testid="schedule-matrix-quick-stats">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10.5px] font-medium text-cyan-400/80">{lang === 'zh' ? '總司機編制' : 'Total Fleet'}</p>
            <p className="text-base font-black text-white">{todayStats.total}</p>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 font-bold text-xs">
            {todayStats.total}
          </span>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10.5px] font-medium text-emerald-400/80">{lang === 'zh' ? '本日總出勤執勤' : 'Total On Duty'}</p>
            <p className="text-base font-black text-emerald-300">{todayStats.onDuty}</p>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs">
            {Math.round((todayStats.onDuty / (todayStats.total || 1)) * 100)}%
          </span>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10.5px] font-medium text-amber-400/80 flex items-center gap-1">
              <Sun className="h-3 w-3 text-amber-400" /> {lang === 'zh' ? '本日白班司機' : 'Day Shift'}
            </p>
            <p className="text-base font-black text-amber-200">{todayStats.day}</p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">09:00-18:00</span>
        </div>

        <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10.5px] font-medium text-indigo-400/80 flex items-center gap-1">
              <Moon className="h-3 w-3 text-indigo-300" /> {lang === 'zh' ? '本日夜班司機' : 'Night Shift'}
            </p>
            <p className="text-base font-black text-indigo-200">{todayStats.night}</p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">18:00-03:00</span>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10.5px] font-medium text-slate-400">{lang === 'zh' ? '本日排休司機' : 'Off Duty'}</p>
            <p className="text-base font-black text-slate-300">{todayStats.off}</p>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-400 font-bold text-xs">
            {todayStats.off}
          </span>
        </div>
      </div>

      {/* Multi-Filter & Search Bar */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 space-y-2.5" data-testid="schedule-matrix-filter-bar">
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
                  ? '搜尋姓名 (中/英)、電話、車牌 (如 ABC-5581)、司機 ID…'
                  : 'Search driver name, phone, plate, ID…'
              }
              data-testid="schedule-search-input"
              className="w-full rounded-xl border border-white/10 bg-slate-900/90 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
            />
          </div>

          {/* Shift Filter */}
          <select
            value={shiftFilter}
            onChange={(e) => {
              setShiftFilter(e.target.value as ShiftFilterType)
              setPage(1)
            }}
            data-testid="schedule-shift-filter"
            className="rounded-xl border border-white/10 bg-slate-900/90 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400/50"
          >
            <option value="ALL">{lang === 'zh' ? '全部班表 (All Shifts)' : 'All Shifts'}</option>
            <option value="DAY_TODAY">{lang === 'zh' ? '☀️ 僅看今日白班 (Day Shift)' : 'Day Shift Only'}</option>
            <option value="NIGHT_TODAY">{lang === 'zh' ? '🌙 僅看今日夜班 (Night Shift)' : 'Night Shift Only'}</option>
            <option value="OFF_TODAY">{lang === 'zh' ? '☕ 僅看今日排休 (Off Duty)' : 'Off Duty Today'}</option>
          </select>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value as any)
              setPage(1)
            }}
            data-testid="schedule-tier-filter"
            className="rounded-xl border border-white/10 bg-slate-900/90 px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400/50"
          >
            <option value="ALL">{lang === 'zh' ? '全部車隊類型 (All Tiers)' : 'All Tiers'}</option>
            <option value="OWNED_FLEET">{lang === 'zh' ? '自營直營車隊 (Owned Fleet)' : 'Owned Fleet'}</option>
            <option value="PAID_MEMBER">{lang === 'zh' ? '付費加盟司機 (Paid Member)' : 'Paid Member'}</option>
            <option value="OUTSIDE_CONTRACTOR">{lang === 'zh' ? '同業合作承包 (Outside Contractor)' : 'Outside Contractor'}</option>
          </select>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/90 px-2 py-1.5 text-xs text-slate-300">
            <span className="text-slate-500">{lang === 'zh' ? '每頁:' : 'Per page:'}</span>
            {([15, 25, 50, 'ALL'] as PageSizeType[]).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => {
                  setPageSize(sz)
                  setPage(1)
                }}
                data-testid={`schedule-pagesize-${sz}`}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition ${
                  pageSize === sz
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Compact / Expanded View Toggle */}
          <button
            type="button"
            onClick={() => setIsCompact(!isCompact)}
            data-testid="schedule-view-mode-toggle"
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              isCompact
                ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
            title={isCompact ? 'Switch to Expanded View' : 'Switch to Compact View'}
          >
            {isCompact ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            <span>{isCompact ? (lang === 'zh' ? '展開檢視' : 'Expanded') : (lang === 'zh' ? '精簡緊湊' : 'Compact')}</span>
          </button>

          {/* Reset Filters */}
          {(query || shiftFilter !== 'ALL' || tierFilter !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              data-testid="schedule-reset-filters-btn"
              className="flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/15 transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{lang === 'zh' ? '重設' : 'Reset'}</span>
            </button>
          )}
        </div>

        {/* Quick Date Jump & Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
            <span className="flex items-center gap-1 font-semibold text-slate-300 shrink-0">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              {lang === 'zh' ? '快速跳至日期:' : 'Quick Date Jump:'}
            </span>
            <button
              type="button"
              onClick={() => handleDateJump(todayIso)}
              data-testid="schedule-jump-today"
              className="shrink-0 rounded-lg bg-cyan-500/20 border border-cyan-400/40 px-2 py-0.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition"
            >
              ★ {lang === 'zh' ? '今日 (Today)' : 'Today'}
            </button>
            {dates.map((dStr) => {
              const d = new Date(dStr)
              const isToday = dStr === todayIso
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => handleDateJump(dStr)}
                  className={`shrink-0 rounded-lg px-1.5 py-0.5 text-[10.5px] font-mono transition ${
                    isToday
                      ? 'text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-400/40'
                      : dateJumpTarget === dStr
                        ? 'text-purple-300 font-bold bg-purple-950/60 border border-purple-400/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {d.getMonth() + 1}/{d.getDate()}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <span>
              {lang === 'zh'
                ? `顯示 ${filteredDrivers.length} / 共 ${drivers.length} 名司機`
                : `Showing ${filteredDrivers.length} of ${drivers.length} drivers`}
            </span>
            {pageSize !== 'ALL' && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-slate-300">
                  {page} / {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="schedule-prev-page"
                    className="rounded-lg bg-white/5 p-1 text-slate-400 hover:bg-white/10 disabled:opacity-30"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    data-testid="schedule-next-page"
                    className="rounded-lg bg-white/5 p-1 text-slate-400 hover:bg-white/10 disabled:opacity-30"
                    aria-label="Next Page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Table Container */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left text-xs" data-testid="driver-schedule-matrix-table">
            <thead>
              <tr className="bg-slate-950/90 text-slate-400 border-b border-white/10 text-[11px]">
                <th className="sticky left-0 z-20 bg-slate-950 px-3.5 py-2.5 font-bold uppercase tracking-wider text-slate-300 min-w-[220px] shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                  {t('control.scheduleDriverCol')} & {lang === 'zh' ? '車輛規格' : 'Vehicle'}
                </th>
                {dates.map((date) => {
                  const d = new Date(date)
                  const isToday = date === todayIso
                  const isHighlighted = dateJumpTarget === date
                  const weekday = d.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { weekday: 'short' })
                  return (
                    <th
                      key={date}
                      id={`schedule-col-${date}`}
                      className={`px-1.5 py-2 text-center font-normal transition-colors ${
                        isToday
                          ? 'bg-cyan-950/40 text-cyan-300 font-bold border-x border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                          : isHighlighted
                            ? 'bg-purple-950/40 text-purple-300 font-bold border-x border-purple-500/30'
                            : 'text-slate-400'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-mono">{weekday}</div>
                      <div className={`text-xs font-mono ${isToday ? 'text-cyan-300 font-black' : 'text-slate-200'}`}>
                        {d.getMonth() + 1}/{d.getDate()}
                      </div>
                      {isToday && (
                        <span className="inline-block rounded bg-cyan-400/20 px-1 text-[9px] font-bold text-cyan-300 mt-0.5">
                          {lang === 'zh' ? '今天' : 'Today'}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pagedDrivers.map((driver) => {
                const vehicle = vehicles.find((v) => v.id === driver.vehicleId)
                const isResting = driver.breakMode || driver.status === 'BREAK'

                return (
                  <tr
                    key={driver.id}
                    className="hover:bg-white/[0.02] transition group/row"
                    data-testid={`schedule-driver-row-${driver.id}`}
                  >
                    {/* Driver & Vehicle Sticky Info Cell */}
                    <td className="sticky left-0 z-10 bg-slate-950 px-3 py-2 text-slate-300 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center gap-2.5">
                        {/* Avatar & Click to Profile */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfileDriver(driver)
                            setProfileInitialTab('OVERVIEW')
                          }}
                          data-testid={`schedule-driver-profile-${driver.id}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-base border border-white/10 hover:border-cyan-400/60 hover:scale-105 transition"
                          title={lang === 'zh' ? '點擊查看司機完整檔案' : 'Click to view driver profile'}
                        >
                          {driver.avatarEmoji}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {/* Live Status Indicator */}
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                driver.status === 'AVAILABLE'
                                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                                  : driver.status === 'BUSY'
                                    ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                                    : isResting
                                      ? 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
                                      : 'bg-slate-600'
                              }`}
                              title={`Status: ${driver.status}`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProfileDriver(driver)
                                setProfileInitialTab('OVERVIEW')
                              }}
                              className="font-bold text-white hover:text-cyan-300 truncate text-left transition"
                            >
                              {lang === 'zh' ? driver.nameZh : driver.name}
                            </button>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">
                              ({driver.id.replace('drv-', 'D0')})
                            </span>
                          </div>

                          {!isCompact && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px]">
                              <TierBadge tier={driver.tier} />
                              {vehicle && (
                                <span className="font-mono text-cyan-300 font-semibold">
                                  {vehicle.plate} ({t(`vehicle.category.${vehicle.category}`)})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Shift Days Grid Cells */}
                    {driver.shiftSchedule.map((s) => {
                      const isToday = s.date === todayIso
                      const shiftDesc =
                        s.shift === 'DAY'
                          ? lang === 'zh' ? '日 (白班 09:00 - 18:00)' : 'Day Shift (09:00 - 18:00)'
                          : s.shift === 'NIGHT'
                            ? lang === 'zh' ? '夜 (夜班 18:00 - 03:00)' : 'Night Shift (18:00 - 03:00)'
                            : lang === 'zh' ? '休 (排休/未出勤)' : 'Off Duty'

                      return (
                        <td
                          key={s.date}
                          className={`p-1 text-center transition-colors ${
                            isToday ? 'bg-cyan-950/20 border-x border-cyan-500/15' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setEditingShiftCell({
                                driver,
                                date: s.date,
                                currentShift: s.shift,
                              })
                            }
                            data-testid={`shift-cell-${driver.id}-${s.date}`}
                            title={`📅 ${s.date} · ${shiftDesc}\n${lang === 'zh' ? '點擊快速切換或編輯此日班表' : 'Click to toggle/edit shift'}`}
                            className={`group/cell relative inline-flex items-center justify-center rounded-lg border font-bold transition-all ${
                              isCompact ? 'h-5 w-6 text-[10px]' : 'h-6 w-8 text-[11px]'
                            } ${SHIFT_STYLES[s.shift]} ${
                              s.adjusted ? 'ring-1 ring-pink-400/80 shadow-[0_0_6px_rgba(244,114,182,0.4)]' : ''
                            }`}
                          >
                            <span>{SHIFT_LABEL[s.shift]}</span>
                            {s.adjusted && (
                              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899]" />
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredDrivers.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-500" data-testid="schedule-matrix-empty">
            {lang === 'zh' ? '找不到相符條件的司機排班資料' : 'No drivers match the current filter criteria.'}
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10.5px] text-slate-400 border-t border-white/5 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-300">{lang === 'zh' ? '班表圖例:' : 'Legend:'}</span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex h-4 w-5 items-center justify-center rounded bg-amber-400/20 text-[10px] font-bold text-amber-200 border border-amber-400/30">
              日
            </span>
            <span>{lang === 'zh' ? '白班 (09:00 - 18:00)' : 'Day Shift'}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex h-4 w-5 items-center justify-center rounded bg-indigo-400/25 text-[10px] font-bold text-indigo-200 border border-indigo-400/30">
              夜
            </span>
            <span>{lang === 'zh' ? '夜班 (18:00 - 03:00)' : 'Night Shift'}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex h-4 w-5 items-center justify-center rounded bg-white/[0.03] text-[10px] font-bold text-slate-500 border border-white/5">
              休
            </span>
            <span>{lang === 'zh' ? '排休 (Off)' : 'Off Duty'}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex h-4 w-5 items-center justify-center rounded bg-pink-500/20 text-[10px] font-bold text-pink-300 ring-1 ring-pink-400">
              ●
            </span>
            <span>{lang === 'zh' ? '手動調整註記' : 'Manually Adjusted'}</span>
          </span>
        </div>

        <div className="text-[10px] text-slate-500">
          💡 {lang === 'zh' ? '提示：點擊司機姓名可檢視個人檔案；點擊任意班表格子可快速調班。' : 'Tip: Click driver name for profile, click shift cell to adjust.'}
        </div>
      </div>
    </div>
  )
}
