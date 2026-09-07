import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarClock,
  Search,
  X,
  UserCheck,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { TierBadge } from '../ui/OrderBadges'
import { useLang } from '../../i18n'

interface OnLeaveDriversModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnLeaveDriversModal({ isOpen, onClose }: OnLeaveDriversModalProps) {
  const { lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const [searchQuery, setSearchQuery] = useState('')

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowIso = tomorrowDate.toISOString().slice(0, 10)

  // Filter on-leave drivers today
  const onLeaveDrivers = useMemo(() => {
    return drivers
      .map((d) => {
        const todayShift = d.shiftSchedule.find((s) => s.date === todayIso)
        const isOff = todayShift?.shift === 'OFF'
        const vehicle = vehicles.find((v) => v.id === d.vehicleId)

        // Find return date (next DAY or NIGHT shift)
        const upcomingShifts = d.shiftSchedule.filter((s) => s.date > todayIso)
        const nextDutyShift = upcomingShifts.find((s) => s.shift === 'DAY' || s.shift === 'NIGHT')
        const returnDate = nextDutyShift ? nextDutyShift.date : tomorrowIso
        const returnShiftType = nextDutyShift?.shift === 'NIGHT' ? (lang === 'zh' ? '夜班 (18:00)' : 'Night (18:00)') : (lang === 'zh' ? '早班 (08:00)' : 'Day (08:00)')

        return {
          driver: d,
          vehicle,
          isOff,
          returnDate,
          returnShiftType,
          reason: d.id.charCodeAt(d.id.length - 1) % 3 === 0 ? (lang === 'zh' ? '例行週休排假' : 'Weekly Scheduled Rest') : d.id.charCodeAt(d.id.length - 1) % 3 === 1 ? (lang === 'zh' ? '特休假 / 年假' : 'Annual Leave') : (lang === 'zh' ? '疲勞工時調度輪休' : 'Fatigue HoS Rest'),
        }
      })
      .filter((item) => item.isOff)
      .filter((item) => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
          item.driver.name.toLowerCase().includes(q) ||
          item.driver.nameZh.includes(q) ||
          item.driver.phone.includes(q) ||
          (item.vehicle && item.vehicle.plate.toLowerCase().includes(q))
        )
      })
  }, [drivers, vehicles, todayIso, tomorrowIso, searchQuery, lang])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none"
        data-testid="on-leave-drivers-modal"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-3xl border border-pink-400/40 bg-slate-900/98 p-6 shadow-2xl shadow-pink-500/20 text-white overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-400/40 shadow-[0_0_20px_rgba(244,114,182,0.3)]">
                <CalendarClock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{lang === 'zh' ? '今日排休司機名冊 (On-Leave Roster)' : "Today's On-Leave Chauffeur Roster"}</span>
                  <span className="rounded-full bg-pink-400/20 px-2.5 py-0.5 text-[10.5px] font-mono text-pink-300 border border-pink-400/30">
                    {onLeaveDrivers.length} OFF DUTY
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'zh' ? '當日休假人員清冊、休假事由、預計復工排班日期與車輛保管狀態' : 'Today off-duty drivers, leave categories, scheduled return dates & vehicle status'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              data-testid="close-on-leave-modal-btn"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative shrink-0">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'zh' ? '搜尋排休司機姓名、電話或車牌號碼…' : 'Search on-leave driver by name, phone, plate…'}
              data-testid="on-leave-search-input"
              className="w-full rounded-xl border border-white/10 bg-slate-950/80 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-pink-400/50"
            />
          </div>

          {/* Roster List */}
          <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
            {onLeaveDrivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                <UserCheck className="h-10 w-10 text-pink-400 mb-2 opacity-60" />
                <p className="font-bold text-slate-300">{lang === 'zh' ? '無符合條件的排休司機' : 'No On-Leave Drivers Found'}</p>
              </div>
            ) : (
              onLeaveDrivers.map(({ driver: d, vehicle: v, returnDate, returnShiftType, reason }) => (
                <div
                  key={d.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 hover:border-pink-400/30 transition"
                  data-testid={`on-leave-driver-row-${d.id}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl border border-white/10">
                      {d.avatarEmoji}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{lang === 'zh' ? d.nameZh : d.name}</span>
                        <TierBadge tier={d.tier} />
                        <span className="rounded-full bg-pink-500/20 border border-pink-400/40 px-2 py-0.2 text-[10px] font-bold text-pink-300">
                          {reason}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono">{d.phone}</span>
                        <span>·</span>
                        <span>{v ? `${v.plate} (${v.category})` : '車輛入庫'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto rounded-xl bg-slate-950/70 border border-white/10 px-3 py-1.5 text-xs text-right">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{lang === 'zh' ? '預計復工排班' : 'Return to Duty'}</p>
                      <p className="font-bold text-emerald-400 font-mono mt-0.5">{returnDate} · {returnShiftType}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
