import { useEffect, useState } from 'react'
import { Clock3, MapPin, PlaneTakeoff, Sparkles, TrendingUp } from 'lucide-react'
import type { Driver, DriverWorkingMode, TaiwanRegion } from '../../types'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'

const MODES: DriverWorkingMode[] = ['AIRPORT_PRIORITY', 'CITY_PRIORITY', 'ANY']
const ZONES: TaiwanRegion[] = ['TAIPEI', 'NEW_TAIPEI', 'TAOYUAN', 'HSINCHU', 'TAICHUNG', 'TAINAN', 'KAOHSIUNG', 'HUALIEN', 'TAITUNG', 'NANTOU']

function formatElapsed(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h ${m}m`
}

/** Driver Home "Availability & Preferences" — working mode, current zone,
 * shift timer, auto-accept and airport-preference toggles, plus a quick
 * acceptance-rate readout. Client brief section 1 (Driver Home /
 * Availability): every control here writes straight into the shared store
 * so Fleet OS's Roster module reflects the same live driver preferences. */
export function DriverAvailabilityCard({ driver }: { driver: Driver }) {
  const { t } = useLang()
  const setDriverWorkingMode = useFleetStore((s) => s.setDriverWorkingMode)
  const setDriverZone = useFleetStore((s) => s.setDriverZone)
  const setDriverAutoAccept = useFleetStore((s) => s.setDriverAutoAccept)
  const setDriverAirportPreference = useFleetStore((s) => s.setDriverAirportPreference)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!driver.shiftStartedAt) return
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [driver.shiftStartedAt])

  const resolved = driver.stats.acceptedAllTime + driver.stats.declinedAllTime + driver.stats.missedAllTime
  const acceptanceRate = resolved === 0 ? 100 : Math.round((driver.stats.acceptedAllTime / resolved) * 100)

  return (
    <div className="glass-panel mt-4 rounded-2xl p-4" data-testid="driver-availability-card">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <Sparkles className="h-3.5 w-3.5" /> {t('driver.availability.title')}
        </p>
        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
          <Clock3 className="h-3 w-3" /> {driver.shiftStartedAt ? formatElapsed(now - driver.shiftStartedAt) : t('driver.availability.shiftNotStarted')}
        </span>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[10.5px] font-medium text-slate-400">{t('driver.availability.workingMode')}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDriverWorkingMode(driver.id, mode)}
              data-testid={`driver-mode-${mode.toLowerCase()}`}
              className={`rounded-lg py-1.5 text-[10.5px] font-semibold transition ${
                driver.workingMode === mode ? 'bg-cyan-400/20 text-cyan-300 ring-1 ring-cyan-400/40' : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
              }`}
            >
              {t(`fleetos.roster.mode.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-medium text-slate-400">
          <MapPin className="h-3 w-3" /> {t('driver.availability.zone')}
        </label>
        <select
          value={driver.currentZone}
          onChange={(e) => setDriverZone(driver.id, e.target.value)}
          data-testid="driver-zone-select"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
        >
          {ZONES.map((z) => (
            <option key={z} value={z} className="bg-slate-900">
              {t(`region.${z}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 space-y-2">
        <label className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-300" /> {t('driver.availability.autoAccept')}
          </span>
          <button
            type="button"
            onClick={() => setDriverAutoAccept(driver.id, !driver.autoAcceptEnabled)}
            data-testid="driver-auto-accept-toggle"
            className={`relative h-5 w-9 rounded-full transition ${driver.autoAcceptEnabled ? 'bg-emerald-400' : 'bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${driver.autoAcceptEnabled ? 'left-4' : 'left-0.5'}`} />
          </button>
        </label>
        <label className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <PlaneTakeoff className="h-3.5 w-3.5 text-cyan-300" /> {t('driver.availability.airportPref')}
          </span>
          <button
            type="button"
            onClick={() => setDriverAirportPreference(driver.id, !driver.airportPreference)}
            data-testid="driver-airport-pref-toggle"
            className={`relative h-5 w-9 rounded-full transition ${driver.airportPreference ? 'bg-cyan-400' : 'bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${driver.airportPreference ? 'left-4' : 'left-0.5'}`} />
          </button>
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
        <span>{t('driver.availability.acceptanceRate')}</span>
        <span className="font-bold text-emerald-300">{acceptanceRate}%</span>
      </div>
    </div>
  )
}
