import { FileText, Phone, ShieldCheck, Star } from 'lucide-react'
import type { Driver, Vehicle } from '../../types'
import { VehicleCard } from '../vehicles/VehicleCard'
import { Badge } from '../ui/Badge'
import { driverTierLabel } from '../../lib/format'
import { formatDateTime } from '../../lib/format'
import { useLang } from '../../i18n'

const DOC_TONE: Record<string, 'green' | 'amber' | 'red'> = { VALID: 'green', EXPIRING: 'amber', EXPIRED: 'red' }

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
        </div>
      )}

      <div className="glass-panel rounded-2xl p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <FileText className="h-3.5 w-3.5" /> {t('driver.account.documents')}
        </p>
        <div className="space-y-2">
          <DocRow label={t('doc.license')} status={driver.documents.license.status} expiresAt={driver.documents.license.expiresAt} lang={lang} />
          <DocRow label={t('doc.insurance')} status={driver.documents.insurance.status} expiresAt={driver.documents.insurance.expiresAt} lang={lang} />
        </div>
      </div>

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

function DocRow({ label, status, expiresAt, lang }: { label: string; status: string; expiresAt: string; lang: 'en' | 'zh' }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
      <span className="text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-slate-500">{formatDateTime(expiresAt, lang)}</span>
        <Badge tone={DOC_TONE[status] ?? 'slate'}>{status}</Badge>
      </div>
    </div>
  )
}
