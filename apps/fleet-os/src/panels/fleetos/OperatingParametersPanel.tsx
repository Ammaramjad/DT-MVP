import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarClock, CheckCircle2, Plane, Save, Settings2, Sunrise, Users2 } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { Button } from '../../components/ui/Button'
import type { OperatingParams } from '../../types'
import { useLang } from '../../i18n'

/** 營運參數 (Operating Parameters) — the reference site's single
 * system-wide settings page (shift windows, roster publish lead time,
 * driver planning window, flight-board refresh interval). Edits are staged
 * locally and only committed to the shared store (with an audit-log entry)
 * on "Save," mirroring the reference site's explicit save action rather
 * than saving on every keystroke. */
export default function OperatingParametersPanel() {
  const { t } = useLang()
  const operatingParams = useFleetStore((s) => s.operatingParams)
  const updateOperatingParams = useFleetStore((s) => s.updateOperatingParams)

  const [draft, setDraft] = useState<OperatingParams>(operatingParams)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => setDraft(operatingParams), [operatingParams])

  const dirty = JSON.stringify(draft) !== JSON.stringify(operatingParams)

  const set = <K extends keyof OperatingParams>(key: K, value: OperatingParams[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const handleSave = () => {
    updateOperatingParams(draft, 'ops.manager')
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
  }

  return (
    <FleetOsPage
      title={t('fleetos.params.title')}
      subtitle={t('fleetos.params.subtitle')}
      icon={<Settings2 className="h-5 w-5" />}
      right={
        <Button size="sm" onClick={handleSave} disabled={!dirty} data-testid="params-save-button">
          <Save className="h-3.5 w-3.5" /> {t('fleetos.params.save')}
        </Button>
      }
    >
      {savedFlash && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="params-saved-toast"
          className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-300"
        >
          <CheckCircle2 className="h-4 w-4" /> {t('fleetos.params.savedNote')}
        </motion.div>
      )}

      <p className="mt-4 max-w-3xl px-1 text-xs text-slate-400">{t('fleetos.params.intro')}</p>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ParamCard icon={<Sunrise className="h-4 w-4" />} title={t('fleetos.params.dayShiftWindow')} hint={t('fleetos.params.dayShiftWindowHint')}>
          <div className="flex items-center gap-2">
            <HourField value={draft.dayShiftStartHour} onChange={(v) => set('dayShiftStartHour', v)} testId="params-day-start" />
            <span className="text-slate-500">–</span>
            <HourField value={draft.dayShiftEndHour} onChange={(v) => set('dayShiftEndHour', v)} testId="params-day-end" />
          </div>
        </ParamCard>

        <ParamCard icon={<CalendarClock className="h-4 w-4" />} title={t('fleetos.params.nightPublishAhead')} hint={t('fleetos.params.nightPublishAheadHint')}>
          <NumberField value={draft.nightShiftPublishAheadDays} onChange={(v) => set('nightShiftPublishAheadDays', v)} suffix={t('fleetos.params.days')} testId="params-night-publish" />
        </ParamCard>

        <ParamCard icon={<CalendarClock className="h-4 w-4" />} title={t('fleetos.params.dayPublishAhead')} hint={t('fleetos.params.dayPublishAheadHint')}>
          <NumberField value={draft.dayShiftPublishAheadDays} onChange={(v) => set('dayShiftPublishAheadDays', v)} suffix={t('fleetos.params.days')} testId="params-day-publish" />
        </ParamCard>

        <ParamCard icon={<Users2 className="h-4 w-4" />} title={t('fleetos.params.driverPlanningWindow')} hint={t('fleetos.params.driverPlanningWindowHint')}>
          <NumberField value={draft.driverPlanningWindowDays} onChange={(v) => set('driverPlanningWindowDays', v)} suffix={t('fleetos.params.days')} testId="params-planning-window" />
        </ParamCard>

        <ParamCard icon={<Plane className="h-4 w-4" />} title={t('fleetos.params.flightRefresh')} hint={t('fleetos.params.flightRefreshHint')}>
          <NumberField value={draft.flightBoardRefreshMinutes} onChange={(v) => set('flightBoardRefreshMinutes', v)} suffix={t('fleetos.params.minutes')} testId="params-flight-refresh" />
        </ParamCard>
      </div>

      <p className="mt-4 max-w-3xl px-1 text-[11px] text-slate-500">{t('fleetos.params.footerNote')}</p>
    </FleetOsPage>
  )
}

function ParamCard({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-2xl p-4" data-testid="params-card">
      <div className="flex items-center gap-2 text-slate-200">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">{icon}</span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function NumberField({ value, onChange, suffix, testId }: { value: number; onChange: (v: number) => void; suffix?: string; testId?: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        data-testid={testId}
        className="input-field w-28"
      />
      {suffix && <span className="text-[11px] text-slate-500">{suffix}</span>}
    </div>
  )
}

function HourField({ value, onChange, testId }: { value: number; onChange: (v: number) => void; testId?: string }) {
  return (
    <input
      type="number"
      min={0}
      max={23}
      value={value}
      onChange={(e) => onChange(Math.min(23, Math.max(0, Number(e.target.value))))}
      data-testid={testId}
      className="input-field w-20"
    />
  )
}
