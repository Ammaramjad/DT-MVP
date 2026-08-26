import { useMemo, useState } from 'react'
import { AlertTriangle, FileCheck2, ShieldAlert, ShieldCheck, Upload } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { documentAlerts } from '../../lib/selectors'
import { formatDateTime } from '../../lib/format'
import type { DocumentKind } from '../../types'
import { useLang } from '../../i18n'

const DOC_KINDS: DocumentKind[] = ['license', 'insurance', 'registration', 'inspection']

export default function CompliancePanel() {
  const { t, lang } = useLang()
  const drivers = useFleetStore((s) => s.drivers)
  const [reuploaded, setReuploaded] = useState<Set<string>>(new Set())

  const alerts = useMemo(() => documentAlerts(drivers), [drivers])
  const expired = alerts.filter((a) => a.status === 'EXPIRED').length
  const expiring = alerts.filter((a) => a.status === 'EXPIRING').length
  const flagged = drivers.reduce((sum, d) => sum + Object.values(d.documents).filter((doc) => doc.ocrStatus === 'FLAGGED').length, 0)

  const markReuploaded = (driverId: string, kind: string) => {
    const key = `${driverId}-${kind}`
    setReuploaded((prev) => new Set(prev).add(key))
  }

  return (
    <FleetOsPage title={t('fleetos.compliance.title')} subtitle={t('fleetos.compliance.subtitle')} icon={<ShieldCheck className="h-5 w-5" />}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<ShieldAlert className="h-4 w-4" />} label={t('fleetos.compliance.expired')} value={expired} tone="red" />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label={t('fleetos.compliance.expiring')} value={expiring} tone="amber" />
        <StatCard icon={<FileCheck2 className="h-4 w-4" />} label={t('fleetos.compliance.ocrFlagged')} value={flagged} tone="purple" />
        <StatCard icon={<ShieldCheck className="h-4 w-4" />} label={t('fleetos.compliance.totalDrivers')} value={drivers.length} tone="cyan" />
      </div>

      <div className="mt-4 glass-panel overflow-hidden rounded-2xl">
        <table className="w-full text-left text-xs" data-testid="compliance-table">
          <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5">{t('fleetos.compliance.colDriver')}</th>
              {DOC_KINDS.map((k) => (
                <th key={k} className="px-3 py-2.5">
                  {t(`doc.${k}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id} className="border-t border-white/5" data-testid="compliance-driver-row">
                <td className="px-3 py-2.5 font-medium text-slate-200">{lang === 'zh' ? d.nameZh : d.name}</td>
                {DOC_KINDS.map((k) => {
                  const doc = d.documents[k]
                  const key = `${d.id}-${k}`
                  const done = reuploaded.has(key)
                  return (
                    <td key={k} className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Badge tone={done ? 'green' : doc.status === 'VALID' ? 'green' : doc.status === 'EXPIRING' ? 'amber' : 'red'}>
                            {done ? t('fleetos.compliance.reuploaded') : t(`fleetos.compliance.docStatus.${doc.status}`)}
                          </Badge>
                          {doc.ocrStatus === 'FLAGGED' && !done && <Badge tone="purple">{t('fleetos.compliance.ocrFlag')}</Badge>}
                        </div>
                        <span className="text-[10px] text-slate-500">{formatDateTime(doc.expiresAt, lang)}</span>
                        {(doc.status !== 'VALID' || doc.ocrStatus === 'FLAGGED') && !done && (
                          <button
                            onClick={() => markReuploaded(d.id, k)}
                            data-testid="compliance-reupload-button"
                            className="flex w-fit items-center gap-1 rounded-md bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300 hover:bg-cyan-400/20"
                          >
                            <Upload className="h-2.5 w-2.5" /> {t('fleetos.compliance.reupload')}
                          </button>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FleetOsPage>
  )
}
