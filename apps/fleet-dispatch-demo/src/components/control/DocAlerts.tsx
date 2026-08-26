import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { documentAlerts } from '../../lib/selectors'
import { formatDateTime } from '../../lib/format'

export function DocAlerts() {
  const drivers = useFleetStore((s) => s.drivers)
  const alerts = documentAlerts(drivers)

  if (alerts.length === 0) {
    return <p className="p-3 text-center text-xs text-slate-500">All driver documents are valid. (OCR auto-review clear)</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
            a.status === 'EXPIRED' ? 'border-red-400/30 bg-red-400/[0.06]' : 'border-amber-400/30 bg-amber-400/[0.06]'
          }`}
        >
          {a.status === 'EXPIRED' ? (
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          ) : (
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          )}
          <div>
            <p className="font-medium text-slate-200">
              {a.driverName} · {a.docType}
            </p>
            <p className="text-slate-500">
              {a.status === 'EXPIRED' ? 'Expired on' : 'Expires'} {formatDateTime(a.expiresAt)} · OCR auto-review flagged
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
