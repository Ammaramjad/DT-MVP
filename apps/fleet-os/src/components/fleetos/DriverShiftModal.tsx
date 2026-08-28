import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, X, Check, Sun, Moon, Sunrise, Sliders } from 'lucide-react'
import type { Driver, DriverWorkingShiftType } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import { Button } from '../ui/Button'

interface DriverShiftModalProps {
  driver: Driver | null
  isOpen: boolean
  onClose: () => void
}

const PRESET_SHIFTS: {
  type: DriverWorkingShiftType
  labelZh: string
  labelEn: string
  start: string
  end: string
  breakStart?: string
  breakEnd?: string
  icon: typeof Sun
}[] = [
  {
    type: 'MORNING',
    labelZh: '早班 (Morning Shift)',
    labelEn: 'Morning Shift',
    start: '06:00',
    end: '14:00',
    breakStart: '10:00',
    breakEnd: '10:30',
    icon: Sunrise,
  },
  {
    type: 'DAY',
    labelZh: '日間常規班 (Day Shift)',
    labelEn: 'Day Shift',
    start: '09:00',
    end: '18:00',
    breakStart: '12:30',
    breakEnd: '13:30',
    icon: Sun,
  },
  {
    type: 'NIGHT',
    labelZh: '夜間紅眼班 (Night Shift)',
    labelEn: 'Night Shift',
    start: '18:00',
    end: '03:00',
    breakStart: '22:00',
    breakEnd: '22:30',
    icon: Moon,
  },
  {
    type: 'CUSTOM',
    labelZh: '自訂彈性班 (Custom)',
    labelEn: 'Custom Shift',
    start: '07:00',
    end: '17:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    icon: Sliders,
  },
]

export function DriverShiftModal({ driver, isOpen, onClose }: DriverShiftModalProps) {
  const { lang } = useLang()
  const updateDriverShift = useFleetStore((s) => s.updateDriverShift)

  const currentHours = driver?.workingHours || {
    shiftType: 'DAY' as DriverWorkingShiftType,
    shiftStart: '09:00',
    shiftEnd: '18:00',
    activeDays: [1, 2, 3, 4, 5, 6],
    breakStart: '12:30',
    breakEnd: '13:30',
    onShift: true,
  }

  const [shiftType, setShiftType] = useState<DriverWorkingShiftType>(currentHours.shiftType)
  const [shiftStart, setShiftStart] = useState(currentHours.shiftStart)
  const [shiftEnd, setShiftEnd] = useState(currentHours.shiftEnd)
  const [breakStart, setBreakStart] = useState(currentHours.breakStart || '12:00')
  const [breakEnd, setBreakEnd] = useState(currentHours.breakEnd || '13:00')
  const [onShift, setOnShift] = useState(currentHours.onShift)
  const [activeDays, setActiveDays] = useState<number[]>(currentHours.activeDays || [1, 2, 3, 4, 5, 6])
  const [customLabel] = useState(currentHours.customLabel || '')

  if (!isOpen || !driver) return null

  const handleSelectPreset = (preset: typeof PRESET_SHIFTS[0]) => {
    setShiftType(preset.type)
    setShiftStart(preset.start)
    setShiftEnd(preset.end)
    if (preset.breakStart) setBreakStart(preset.breakStart)
    if (preset.breakEnd) setBreakEnd(preset.breakEnd)
  }

  const toggleDay = (day: number) => {
    if (activeDays.includes(day)) {
      if (activeDays.length > 1) setActiveDays(activeDays.filter((d) => d !== day))
    } else {
      setActiveDays([...activeDays, day].sort())
    }
  }

  const handleSave = () => {
    updateDriverShift(driver.id, {
      shiftType,
      shiftStart,
      shiftEnd,
      breakStart,
      breakEnd,
      onShift,
      activeDays,
      customLabel: shiftType === 'CUSTOM' ? (customLabel || '自訂班表') : undefined,
    })
    onClose()
  }

  const daysLabelZh = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
  const daysLabelEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" data-testid="driver-shift-modal">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-2xl shadow-cyan-500/10 text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{lang === 'zh' ? '調整司機排班與工時' : 'Edit Driver Shift & Hours'}</span>
                  <span className="text-xs text-cyan-300 font-mono">({driver.nameZh || driver.name})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'zh' ? '設定值班時段、休息時間與出勤狀態' : 'Manage shift schedule, breaks, and on-shift status'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              data-testid="close-shift-modal"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {/* Shift Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                {lang === 'zh' ? '快速選擇班別 (Shift Presets)' : 'Shift Presets'}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRESET_SHIFTS.map((preset) => {
                  const Icon = preset.icon
                  const isSelected = shiftType === preset.type
                  return (
                    <button
                      key={preset.type}
                      type="button"
                      data-testid={`shift-preset-${preset.type.toLowerCase()}`}
                      onClick={() => handleSelectPreset(preset)}
                      className={`flex flex-col items-center gap-1 rounded-xl p-2.5 border text-center transition ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200 shadow-md shadow-cyan-500/20'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-bold">{lang === 'zh' ? preset.labelZh.split(' ')[0] : preset.labelEn}</span>
                      <span className="text-[10px] font-mono text-slate-400">{preset.start}-{preset.end}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Hours Input */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {lang === 'zh' ? '值勤開始時間 (Start Time)' : 'Shift Start'}
                </label>
                <input
                  type="time"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  data-testid="shift-start-input"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {lang === 'zh' ? '值勤結束時間 (End Time)' : 'Shift End'}
                </label>
                <input
                  type="time"
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  data-testid="shift-end-input"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            {/* Break Time Input */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {lang === 'zh' ? '休息開始 (Break Start)' : 'Break Start'}
                </label>
                <input
                  type="time"
                  value={breakStart}
                  onChange={(e) => setBreakStart(e.target.value)}
                  data-testid="break-start-input"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {lang === 'zh' ? '休息結束 (Break End)' : 'Break End'}
                </label>
                <input
                  type="time"
                  value={breakEnd}
                  onChange={(e) => setBreakEnd(e.target.value)}
                  data-testid="break-end-input"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            {/* Active Days */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                {lang === 'zh' ? '出勤星期 (Active Days)' : 'Active Days'}
              </label>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const isActive = activeDays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      data-testid={`active-day-${day}`}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200'
                          : 'bg-white/5 border border-white/10 text-slate-500'
                      }`}
                    >
                      {lang === 'zh' ? daysLabelZh[day] : daysLabelEn[day]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* On-shift Status Toggle */}
            <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/10">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  {lang === 'zh' ? '當前當值狀態 (On-Shift Status)' : 'On-Shift Status'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {onShift
                    ? (lang === 'zh' ? '司機目前處於值班排程中，可接受派單' : 'Driver is on active shift, eligible for orders')
                    : (lang === 'zh' ? '司機今日休假/非當值時段' : 'Driver is off-duty / on rest')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOnShift(!onShift)}
                data-testid="on-shift-toggle"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  onShift ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-red-500/20 text-red-300 border border-red-400/40'
                }`}
              >
                {onShift ? (lang === 'zh' ? '值勤中 (ON SHIFT)' : 'ON SHIFT') : (lang === 'zh' ? '休息中 (OFF)' : 'OFF DUTY')}
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
            <Button size="sm" variant="ghost" onClick={onClose}>
              {lang === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={handleSave} data-testid="save-shift-btn">
              <Check className="h-4 w-4 mr-1" />
              {lang === 'zh' ? '儲存班表設定' : 'Save Shift Settings'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
