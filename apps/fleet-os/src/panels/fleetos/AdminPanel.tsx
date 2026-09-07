import { useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, CheckCircle2, ClipboardList, Lock, ShieldCheck, Unlock, UserPlus } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { AddDriverModal } from '../../components/fleetos/AddDriverModal'
import { GuestPassVault } from '../../components/security/GuestPassVault'
import { formatRelative } from '../../lib/format'
import { useLang } from '../../i18n'
import { useGatekeeper } from '../../lib/gatekeeper'

type AdminTab = 'ROLES' | 'VAULT' | 'HEALTH' | 'AUDIT'

export default function AdminPanel() {
  const { t, lang } = useLang()
  const { currentUser } = useGatekeeper()
  const isSuperAdmin = currentUser?.role === 'admin'
  const roles = useFleetStore((s) => s.roles)
  const toggleRolePermission = useFleetStore((s) => s.toggleRolePermission)
  const setRoleTwoFactor = useFleetStore((s) => s.setRoleTwoFactor)
  const systemHealth = useFleetStore((s) => s.systemHealth)
  const acknowledgeHealthAlert = useFleetStore((s) => s.acknowledgeHealthAlert)
  const globalAuditLog = useFleetStore((s) => s.globalAuditLog)
  const [tab, setTab] = useState<AdminTab>(isSuperAdmin ? 'VAULT' : 'ROLES')
  const [showAddDriver, setShowAddDriver] = useState(false)

  const degraded = systemHealth.filter((h) => h.status !== 'OPERATIONAL').length

  return (
    <FleetOsPage
      title={t('fleetos.admin.title')}
      subtitle={t('fleetos.admin.subtitle')}
      icon={<ShieldCheck className="h-5 w-5" />}
      right={
        <button
          onClick={() => setShowAddDriver(true)}
          data-testid="admin-add-driver-btn"
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] transition"
        >
          <UserPlus className="h-4 w-4" />
          <span>{t('fleetos.roster.addDriverBtn')}</span>
        </button>
      }
    >
      <AddDriverModal isOpen={showAddDriver} onClose={() => setShowAddDriver(false)} />
      <div className="mt-4 flex gap-1.5">
        {(['VAULT', 'ROLES', 'HEALTH', 'AUDIT'] as const)
          .filter((k) => k !== 'VAULT' || isSuperAdmin)
          .map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            data-testid={`admin-tab-${k}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${tab === k ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30' : 'text-slate-400 hover:bg-white/5'}`}
          >
            {k === 'VAULT' && '🎟️ '}
            {t(`fleetos.admin.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === 'VAULT' && isSuperAdmin && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4" data-testid="admin-vault-section">
          <GuestPassVault />
        </motion.div>
      )}

      {tab === 'ROLES' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="admin-roles-grid">
          {roles.map((r) => (
            <div key={r.id} className="glass-panel rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{lang === 'zh' ? r.nameZh : r.name}</p>
                <Badge tone="cyan">{t('fleetos.admin.userCount', { n: r.userCount })}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.permissions.map((p) => (
                  <button
                    key={p}
                    onClick={() => toggleRolePermission(r.id, p)}
                    data-testid="admin-toggle-permission"
                    className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10.5px] font-medium text-emerald-300 hover:bg-red-400/10 hover:text-red-300"
                  >
                    {p} ✓
                  </button>
                ))}
              </div>
              <button
                onClick={() => setRoleTwoFactor(r.id, !r.twoFactorRequired)}
                data-testid="admin-toggle-2fa"
                className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium ${
                  r.twoFactorRequired ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/5 text-slate-400'
                }`}
              >
                {r.twoFactorRequired ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                {t('fleetos.admin.twoFactor')}
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {tab === 'HEALTH' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard icon={<Activity className="h-4 w-4" />} label={t('fleetos.admin.servicesTotal')} value={systemHealth.length} tone="cyan" />
            <StatCard icon={<Activity className="h-4 w-4" />} label={t('fleetos.admin.degraded')} value={degraded} tone="amber" />
            <StatCard icon={<Activity className="h-4 w-4" />} label={t('fleetos.admin.operational')} value={systemHealth.length - degraded} tone="lime" />
          </div>
          <div className="glass-panel divide-y divide-white/5 rounded-2xl" data-testid="admin-health-list">
            {systemHealth.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${h.status === 'OPERATIONAL' ? 'bg-emerald-400' : h.status === 'DEGRADED' ? 'bg-amber-400' : 'bg-red-400'}`} />
                  <div>
                    <p className="text-xs font-medium text-slate-200">{h.name}</p>
                    <p className="text-[10.5px] text-slate-500">
                      {h.latencyMs}ms · {h.uptimePct}% uptime {h.lastIncident ? `· ${t('fleetos.admin.lastIncident')} ${h.lastIncident}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={h.status === 'OPERATIONAL' ? 'green' : h.status === 'DEGRADED' ? 'amber' : 'red'}>{t(`fleetos.admin.health.${h.status}`)}</Badge>
                  {h.status !== 'OPERATIONAL' && !h.acknowledged && (
                    <button
                      onClick={() => acknowledgeHealthAlert(h.id)}
                      data-testid="admin-ack-health"
                      className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[10.5px] font-medium text-slate-300 hover:bg-white/10"
                    >
                      <CheckCircle2 className="h-3 w-3" /> {t('fleetos.admin.acknowledge')}
                    </button>
                  )}
                  {h.acknowledged && <Badge tone="slate">{t('fleetos.admin.acknowledged')}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {tab === 'AUDIT' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 glass-panel max-h-[560px] overflow-y-auto rounded-2xl p-3" data-testid="admin-audit-log">
          <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <ClipboardList className="h-3.5 w-3.5" /> {t('fleetos.admin.auditTrail')}
          </p>
          <ol className="space-y-1.5">
            {globalAuditLog.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-white/[0.02]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
                <span className="text-slate-500">{entry.actor}</span>
                <span className="text-slate-300">{entry.action}</span>
                <span className="ml-auto shrink-0 text-slate-500">{formatRelative(entry.at, lang)}</span>
              </li>
            ))}
            {globalAuditLog.length === 0 && <li className="p-6 text-center text-slate-500">{t('fleetos.admin.noAuditEntries')}</li>}
          </ol>
        </motion.div>
      )}
    </FleetOsPage>
  )
}
