import { useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  FileText,
  GraduationCap,
  LifeBuoy,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Star,
  Upload,
} from 'lucide-react'
import type { Driver, DocumentKind, Vehicle } from '../../types'
import { VehicleCard } from '../vehicles/VehicleCard'
import { Badge } from '../ui/Badge'
import { driverTierLabel } from '../../lib/format'
import { formatDateTime } from '../../lib/format'
import { useLang } from '../../i18n'
import clsx from 'clsx'

const DOC_TONE: Record<string, 'green' | 'amber' | 'red'> = { VALID: 'green', EXPIRING: 'amber', EXPIRED: 'red' }
const DOC_KINDS: DocumentKind[] = ['license', 'insurance', 'registration', 'inspection']

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

export function AccountScreen({
  driver,
  drivers,
  vehicle,
  onSwitchDriver,
}: {
  driver: Driver
  drivers: Driver[]
  vehicle: Vehicle | undefined
  onSwitchDriver: (id: string) => void
}) {
  const { t, lang } = useLang()
  const [reuploaded, setReuploaded] = useState<Set<DocumentKind>>(new Set())
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [incidentSent, setIncidentSent] = useState(false)
  const [incidentText, setIncidentText] = useState('')

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6" data-testid="driver-account-screen">
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-4xl">{driver.avatarEmoji}</div>
          <div>
            <p className="text-lg font-bold text-white">{lang === 'zh' ? driver.nameZh : driver.name}</p>
            <p className="text-xs text-slate-400">{lang === 'zh' ? driver.name : driver.nameZh}</p>
            <div className="mt-1 flex items-center gap-1 text-xs text-amber-300">
              <Star className="h-3.5 w-3.5 fill-amber-300" /> {driver.rating.toFixed(1)} · {driver.completedTrips} {t('driver.account.trips')}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge tone="slate">{driverTierLabel(driver.tier, lang)}</Badge>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Phone className="h-3 w-3" /> {driver.phone}
          </span>
        </div>
      </div>

      {vehicle && (
        <div>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t('driver.myVehicle')}</p>
          <VehicleCard type={vehicle.type} plate={vehicle.plate} size="md" />
          <div className="glass-panel mt-2 grid grid-cols-2 gap-2 rounded-xl p-3 text-xs text-slate-300">
            <span>{t('driver.account.plate', { plate: vehicle.plate })}</span>
            <span className="text-right">{t('driver.account.capacity', { n: vehicle.capacity })}</span>
          </div>
        </div>
      )}

      {/* Full document center — 4 doc types, OCR review status, expiry
          countdown, and a mock upload/replace workflow (client brief: driver
          profile & compliance). Reuses the same status vocabulary as Fleet
          OS's Compliance module so both surfaces read identically. */}
      <div className="glass-panel rounded-2xl p-4" data-testid="driver-document-center">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <FileText className="h-3.5 w-3.5" /> {t('driver.account.documents')}
        </p>
        <div className="space-y-2">
          {DOC_KINDS.map((kind) => {
            const doc = driver.documents[kind]
            const done = reuploaded.has(kind)
            const remaining = daysUntil(doc.expiresAt)
            return (
              <div key={kind} className="rounded-lg bg-white/[0.03] px-3 py-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-200">{t(`doc.${kind}`)}</span>
                  <div className="flex items-center gap-1.5">
                    {doc.ocrStatus === 'FLAGGED' && !done && <Badge tone="purple">{t('fleetos.compliance.ocrFlag')}</Badge>}
                    <Badge tone={done ? 'green' : DOC_TONE[doc.status]}>{done ? t('fleetos.compliance.reuploaded') : t(`fleetos.compliance.docStatus.${doc.status}`)}</Badge>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-slate-500">
                  <span>{formatDateTime(doc.expiresAt, lang)}</span>
                  {!done && doc.status !== 'EXPIRED' && remaining <= 60 && (
                    <span className="flex items-center gap-1 text-amber-300">
                      <AlertTriangle className="h-3 w-3" /> {t('driver.account.renewsIn', { n: Math.max(0, remaining) })}
                    </span>
                  )}
                </div>
                {(doc.status !== 'VALID' || doc.ocrStatus === 'FLAGGED') && !done && (
                  <button
                    onClick={() => setReuploaded((prev) => new Set(prev).add(kind))}
                    data-testid={`driver-doc-reupload-${kind}`}
                    className="mt-1.5 flex items-center gap-1 rounded-md bg-cyan-400/10 px-2 py-1 text-[10.5px] font-medium text-cyan-300 hover:bg-cyan-400/20"
                  >
                    <Upload className="h-3 w-3" /> {t('fleetos.compliance.reupload')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Safety / Incident / Support / Training modules */}
      <AccordionSection
        icon={<ShieldAlert className="h-3.5 w-3.5" />}
        title={t('driver.account.incidentReport')}
        open={openSection === 'incident'}
        onToggle={() => setOpenSection((s) => (s === 'incident' ? null : 'incident'))}
        testId="driver-incident-section"
      >
        {incidentSent ? (
          <p className="rounded-lg bg-emerald-400/10 p-2.5 text-[11px] text-emerald-300" data-testid="driver-incident-sent">
            {t('driver.account.incidentSent')}
          </p>
        ) : (
          <div className="space-y-2">
            <textarea
              value={incidentText}
              onChange={(e) => setIncidentText(e.target.value)}
              rows={3}
              placeholder={t('driver.account.incidentPlaceholder')}
              data-testid="driver-incident-input"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400/50"
            />
            <button
              onClick={() => setIncidentSent(true)}
              disabled={!incidentText.trim()}
              data-testid="driver-incident-submit"
              className="w-full rounded-lg bg-amber-400/15 py-2 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/30 disabled:opacity-40"
            >
              {t('driver.account.incidentSubmit')}
            </button>
          </div>
        )}
      </AccordionSection>

      <AccordionSection
        icon={<LifeBuoy className="h-3.5 w-3.5" />}
        title={t('driver.account.supportCenter')}
        open={openSection === 'support'}
        onToggle={() => setOpenSection((s) => (s === 'support' ? null : 'support'))}
        testId="driver-support-section"
      >
        <div className="space-y-2 text-xs text-slate-300">
          <p>{t('driver.account.supportDesc')}</p>
          <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-400/10 py-2 text-[11px] font-medium text-cyan-300" data-testid="driver-support-call">
            <Phone className="h-3.5 w-3.5" /> {t('driver.account.supportCall')}
          </button>
        </div>
      </AccordionSection>

      <AccordionSection
        icon={<GraduationCap className="h-3.5 w-3.5" />}
        title={t('driver.account.trainingCenter')}
        open={openSection === 'training'}
        onToggle={() => setOpenSection((s) => (s === 'training' ? null : 'training'))}
        testId="driver-training-section"
      >
        <ul className="space-y-1.5 text-xs text-slate-300">
          {['driver.account.trainingModule1', 'driver.account.trainingModule2', 'driver.account.trainingModule3'].map((key) => (
            <li key={key} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
              <BookOpen className="h-3.5 w-3.5 text-lime-300" /> {t(key)}
            </li>
          ))}
        </ul>
      </AccordionSection>

      <div className="glass-panel rounded-2xl p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> {t('driver.account.demoSwitch')}
        </p>
        <p className="mb-2 text-[11px] text-slate-500">{t('driver.account.demoSwitchHint')}</p>
        <select
          value={driver.id}
          onChange={(e) => onSwitchDriver(e.target.value)}
          data-testid="driver-select"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
        >
          {drivers.map((d) => (
            <option key={d.id} value={d.id} className="bg-slate-900">
              {d.name} ({d.nameZh}) — {d.status}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function AccordionSection({
  icon,
  title,
  open,
  onToggle,
  children,
  testId,
}: {
  icon: ReactNode
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  testId: string
}) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl" data-testid={testId}>
      <button onClick={onToggle} className="flex w-full items-center justify-between p-4 text-left">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
          {icon} {title}
        </span>
        <ChevronRight className={clsx('h-4 w-4 text-slate-500 transition', open && 'rotate-90')} />
      </button>
      {open && <div className="border-t border-white/10 p-4">{children}</div>}
    </div>
  )
}
