import { useState } from 'react'
import { Radio, Users2 } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { FleetRosterBreakdown } from '../../components/control/FleetRosterBreakdown'
import { DriverScheduleMatrix } from '../../components/control/DriverScheduleMatrix'
import { Badge } from '../../components/ui/Badge'
import type { DriverWorkingMode } from '../../types'
import { useLang } from '../../i18n'

const MODES: DriverWorkingMode[] = ['AIRPORT_PRIORITY', 'CITY_PRIORITY', 'ANY']

export default function RosterPanel() {
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const setDriverWorkingMode = useFleetStore((s) => s.setDriverWorkingMode)
  const setDriverAutoAccept = useFleetStore((s) => s.setDriverAutoAccept)
  const [tab, setTab] = useState<'ROSTER' | 'SCHEDULE'>('ROSTER')

  const available = drivers.filter((d) => d.status === 'AVAILABLE').length
  const busy = drivers.filter((d) => d.status === 'BUSY').length
  const airportPref = drivers.filter((d) => d.airportPreference).length

  return (
    <FleetOsPage title={t('fleetos.roster.title')} subtitle={t('fleetos.roster.subtitle')} icon={<Users2 className="h-5 w-5" />}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Users2 className="h-4 w-4" />} label={t('fleetos.roster.totalDrivers')} value={drivers.length} tone="cyan" />
        <StatCard icon={<Radio className="h-4 w-4" />} label={t('fleetos.roster.available')} value={available} tone="lime" />
        <StatCard icon={<Radio className="h-4 w-4" />} label={t('fleetos.roster.busy')} value={busy} tone="amber" />
        <StatCard icon={<Radio className="h-4 w-4" />} label={t('fleetos.roster.airportPref')} value={airportPref} tone="purple" />
      </div>

      <div className="mt-4 flex gap-1.5">
        {(['ROSTER', 'SCHEDULE'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${tab === k ? 'bg-cyan-400/15 text-cyan-300' : 'text-slate-400 hover:bg-white/5'}`}
          >
            {t(`fleetos.roster.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === 'ROSTER' ? (
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass-panel rounded-2xl p-3">
            <FleetRosterBreakdown />
          </div>
          <div className="glass-panel max-h-[640px] overflow-y-auto rounded-2xl p-3" data-testid="driver-working-mode-list">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('fleetos.roster.workingModes')}</p>
            <div className="space-y-1.5">
              {drivers.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.02] p-2.5" data-testid="driver-working-mode-row">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base">{d.avatarEmoji}</span>
                    <span className="truncate text-xs font-medium text-slate-200">{lang === 'zh' ? d.nameZh : d.name}</span>
                    <Badge tone={d.status === 'AVAILABLE' ? 'green' : d.status === 'BUSY' ? 'amber' : 'slate'}>{t(`driverStatus.${d.status}`)}</Badge>
                  </div>
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
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 glass-panel rounded-2xl p-3">
          <DriverScheduleMatrix />
        </div>
      )}
    </FleetOsPage>
  )
}
