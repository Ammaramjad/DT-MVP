import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import type { ShiftDay } from '../../types'

const SHIFT_STYLES: Record<ShiftDay['shift'], string> = {
  DAY: 'bg-amber-400/20 text-amber-200',
  NIGHT: 'bg-indigo-400/25 text-indigo-200',
  OFF: 'bg-white/[0.03] text-slate-600',
}

const SHIFT_LABEL: Record<ShiftDay['shift'], string> = { DAY: '日', NIGHT: '夜', OFF: '—' }
const PAGE_SIZE = 25

// Mirrors the reference site's per-driver "排班管理" (schedule management)
// matrix — a compact day/night/off grid per driver across a two-week window.
export function DriverScheduleMatrix() {
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const [page, setPage] = useState(1)
  const dates = drivers[0]?.shiftSchedule.map((s) => s.date) ?? []
  const todayIso = new Date().toISOString().slice(0, 10)

  const totalPages = Math.ceil(drivers.length / PAGE_SIZE)
  const pagedDrivers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return drivers.slice(start, start + PAGE_SIZE)
  }, [drivers, page])

  return (
    <div className="overflow-x-auto">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" /> {t('control.scheduleTitle')}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[10.5px] text-slate-500">
              {page} / {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded bg-white/5 p-1 text-slate-400 hover:bg-white/10 disabled:opacity-30"
                aria-label="Previous Page"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded bg-white/5 p-1 text-slate-400 hover:bg-white/10 disabled:opacity-30"
                aria-label="Next Page"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
      <table className="w-full min-w-[560px] border-collapse text-[10px]">
        <thead>
          <tr>
            <th className="sticky left-0 bg-mission-950 px-2 py-1 text-left text-slate-500">{t('control.scheduleDriverCol')}</th>
            {dates.map((date) => {
              const d = new Date(date)
              const isToday = date === todayIso
              return (
                <th key={date} className={`px-1 py-1 text-center font-normal ${isToday ? 'text-cyan-300' : 'text-slate-500'}`}>
                  {d.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { weekday: 'short' }).slice(0, 2)}
                  <br />
                  {d.getDate()}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {pagedDrivers.map((driver) => (
            <tr key={driver.id} className="border-t border-white/[0.03]">
              <td className="sticky left-0 bg-mission-950 px-2 py-1 text-slate-300">
                <span className="font-medium">{(lang === 'zh' ? driver.nameZh : driver.name).split(' ')[0]}</span>
                <span className="ml-1 text-slate-600">{driver.id.replace('drv-', 'D0')}</span>
              </td>
              {driver.shiftSchedule.map((s) => (
                <td key={s.date} className="p-0.5 text-center">
                  <span className={`inline-flex h-5 w-6 items-center justify-center rounded ${SHIFT_STYLES[s.shift]} ${s.adjusted ? 'ring-1 ring-pink-400/60' : ''}`}>
                    {SHIFT_LABEL[s.shift]}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 px-1 text-[10px] text-slate-500">{t('control.scheduleLegend')}</p>
    </div>
  )
}
