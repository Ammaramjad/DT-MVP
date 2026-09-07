import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarRange, Sparkles, ChevronRight } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import type { CapacityDay } from '../../types'
import { DayCapacityModal } from './DayCapacityModal'

// Inspired by the reference Fleet OS "量能月曆" (capacity calendar): a 30-day
// heatmap of order volume + scheduled driver headcount, with peak days
// called out, so ops can see upcoming crunch days at a glance.
function intensityClass(day: CapacityDay, max: number): string {
  const ratio = day.orderCount / max
  if (day.isPeak) return 'bg-cyan-400/80 text-mission-950'
  if (ratio > 0.82) return 'bg-cyan-400/45 text-white'
  if (ratio > 0.62) return 'bg-cyan-400/25 text-slate-100'
  if (ratio > 0.4) return 'bg-cyan-400/12 text-slate-200'
  return 'bg-white/[0.04] text-slate-400'
}

export function CapacityCalendar() {
  const { t, lang } = useLang()
  const capacityForecast = useFleetStore((s) => s.capacityForecast)
  const [selected, setSelected] = useState<string | null>(null)
  const [activeModalDay, setActiveModalDay] = useState<CapacityDay | null>(null)

  const max = useMemo(() => Math.max(...capacityForecast.map((d) => d.orderCount)), [capacityForecast])
  const selectedDay = capacityForecast.find((d) => d.date === selected) ?? capacityForecast.find((d) => d.isToday)

  const handleDateClick = (day: CapacityDay) => {
    setSelected(day.date)
    setActiveModalDay(day)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <CalendarRange className="h-3.5 w-3.5" /> {t('control.capacityTitle')}
        </p>
        <span className="flex items-center gap-1 text-[10px] text-cyan-400">
          <Sparkles className="h-2.5 w-2.5" />
          <span>{lang === 'zh' ? '點擊任一日期查看預約排程' : 'Click any date to inspect'}</span>
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1" data-testid="capacity-calendar-pills">
        {capacityForecast.map((day, i) => {
          const dateObj = new Date(day.date)
          const weekday = dateObj.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { weekday: 'short' })
          const dayNum = dateObj.getDate()
          const isSelected = (selected ?? capacityForecast.find((d) => d.isToday)?.date) === day.date

          return (
            <motion.button
              key={day.date}
              type="button"
              data-testid={`capacity-pill-${day.date}`}
              onClick={() => handleDateClick(day)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: day.isPast ? 0.5 : 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.012, 0.3) }}
              whileHover={{ scale: 1.08 }}
              className={`relative flex shrink-0 cursor-pointer flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] transition ${intensityClass(day, max)} ${
                isSelected ? 'ring-2 ring-cyan-300' : ''
              } ${day.isToday ? 'ring-1 ring-white/40' : ''}`}
              style={{ minWidth: 42 }}
              title={lang === 'zh' ? `點擊開啟 ${day.date} 預約與班表明細` : `Click to view ${day.date} details`}
            >
              {day.isPeak && <span className="absolute -top-1.5 rounded-full bg-pink-400 px-1 text-[8px] font-bold text-mission-950">{t('control.peak')}</span>}
              <span className="opacity-70">{weekday}</span>
              <span className="font-bold">{dayNum}</span>
              <span className="font-mono text-[9px] opacity-80">{day.orderCount}</span>
            </motion.button>
          )
        })}
      </div>

      {selectedDay && (
        <motion.div
          key={selectedDay.date}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setActiveModalDay(selectedDay)}
          data-testid="capacity-selected-summary"
          className="group mt-2.5 grid cursor-pointer grid-cols-4 items-center gap-2 rounded-xl bg-white/[0.03] p-2.5 text-center text-[11px] border border-white/5 hover:border-cyan-400/40 hover:bg-white/[0.06] transition"
        >
          <div>
            <p className="text-base font-bold text-cyan-300">{selectedDay.orderCount}</p>
            <p className="text-slate-500">{t('control.orders')}</p>
          </div>
          <div>
            <p className="text-base font-bold text-purple-300">{selectedDay.scheduledDrivers}</p>
            <p className="text-slate-500">{t('control.scheduled')}</p>
          </div>
          <div>
            <p className="text-base font-bold text-amber-300">{selectedDay.onLeave}</p>
            <p className="text-slate-500">{t('control.onLeave')}</p>
          </div>
          <div className="flex flex-col items-center justify-center border-l border-white/5 pl-1">
            <span className="text-[10px] font-bold text-cyan-300 group-hover:underline flex items-center gap-0.5">
              <span>{lang === 'zh' ? '預約明細' : 'Details'}</span>
              <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
            </span>
          </div>
        </motion.div>
      )}

      <p className="mt-1.5 px-1 text-[10px] text-slate-500">
        {t('control.capacityLegend', { n: capacityForecast.filter((d) => d.isPeak && !d.isPast).length })}
      </p>

      {/* Interactive Day Capacity Breakdown & Future Bookings Drawer/Modal */}
      <AnimatePresence>
        {activeModalDay && (
          <DayCapacityModal
            day={activeModalDay}
            onClose={() => setActiveModalDay(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
