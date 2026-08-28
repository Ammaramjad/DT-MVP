import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Car, Clock, Headset, Search, ShieldCheck, UserPlus, Users2 } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { DriverShiftModal } from '../../components/fleetos/DriverShiftModal'
import type { Driver, StaffRole } from '../../types'
import { useLang } from '../../i18n'

type Tab = 'STAFF' | 'DRIVERS'

/** 帳號管理 (Account Management) — the reference site's two-tab screen for
 * creating/disabling customer-support & admin staff logins, plus a driver
 * app-login on/off tab. Backed by `staffAccounts` and `driver.loginEnabled`
 * in the shared store so every toggle here is a real, persisted action. */
export default function AccountsPanel() {
  const { t, lang } = useLang()
  const staffAccounts = useFleetStore((s) => s.staffAccounts)
  const drivers = useFleetStore((s) => s.drivers)
  const addStaffAccount = useFleetStore((s) => s.addStaffAccount)
  const setStaffAccountStatus = useFleetStore((s) => s.setStaffAccountStatus)
  const setDriverLoginEnabled = useFleetStore((s) => s.setDriverLoginEnabled)

  const [tab, setTab] = useState<Tab>('STAFF')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('SUPPORT')
  const [editingShiftDriver, setEditingShiftDriver] = useState<Driver | null>(null)

  const activeStaff = staffAccounts.filter((a) => a.status === 'ACTIVE').length
  const loginEnabledDrivers = drivers.filter((d) => d.loginEnabled).length

  const filteredDrivers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return drivers
    return drivers.filter((d) => d.name.toLowerCase().includes(q) || d.nameZh.includes(query.trim()) || d.id.toLowerCase().includes(q))
  }, [drivers, query])

  const handleCreate = () => {
    if (!name.trim() || !email.trim()) return
    addStaffAccount({ name: name.trim(), email: email.trim(), role })
    setName('')
    setEmail('')
    setRole('SUPPORT')
    setShowForm(false)
  }

  return (
    <FleetOsPage title={t('fleetos.accounts.title')} subtitle={t('fleetos.accounts.subtitle')} icon={<ShieldCheck className="h-5 w-5" />}>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Headset className="h-4 w-4" />} label={t('fleetos.accounts.staffTotal')} value={staffAccounts.length} tone="cyan" />
        <StatCard icon={<ShieldCheck className="h-4 w-4" />} label={t('fleetos.accounts.staffActive')} value={activeStaff} tone="lime" />
        <StatCard icon={<Users2 className="h-4 w-4" />} label={t('fleetos.accounts.driversTotal')} value={drivers.length} tone="purple" />
        <StatCard icon={<Car className="h-4 w-4" />} label={t('fleetos.accounts.driversLoginEnabled')} value={loginEnabledDrivers} tone="amber" />
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {(['STAFF', 'DRIVERS'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            data-testid={`accounts-tab-${k}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${tab === k ? 'bg-cyan-400/15 text-cyan-300' : 'text-slate-400 hover:bg-white/5'}`}
          >
            {t(`fleetos.accounts.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === 'STAFF' ? (
        <div className="mt-3 glass-panel overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5">
            <p className="text-xs font-semibold text-slate-300">{t('fleetos.accounts.staffListTitle', { n: staffAccounts.length })}</p>
            <Button size="sm" onClick={() => setShowForm((v) => !v)} data-testid="accounts-add-staff-button">
              <UserPlus className="h-3.5 w-3.5" /> {t('fleetos.accounts.addStaff')}
            </Button>
          </div>

          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex flex-wrap items-end gap-2 border-b border-white/5 bg-white/[0.02] px-3 py-3"
              data-testid="accounts-add-staff-form"
            >
              <label className="flex-1 min-w-[140px]">
                <span className="mb-1 block text-[10.5px] text-slate-500">{t('fleetos.accounts.colName')}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" data-testid="accounts-new-name" />
              </label>
              <label className="flex-1 min-w-[180px]">
                <span className="mb-1 block text-[10.5px] text-slate-500">{t('fleetos.accounts.colEmail')}</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" data-testid="accounts-new-email" />
              </label>
              <label className="min-w-[120px]">
                <span className="mb-1 block text-[10.5px] text-slate-500">{t('fleetos.accounts.colRole')}</span>
                <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className="input-field" data-testid="accounts-new-role">
                  <option value="SUPPORT">{t('fleetos.accounts.role.SUPPORT')}</option>
                  <option value="ADMIN">{t('fleetos.accounts.role.ADMIN')}</option>
                </select>
              </label>
              <Button size="sm" onClick={handleCreate} disabled={!name.trim() || !email.trim()} data-testid="accounts-create-staff-submit">
                {t('fleetos.accounts.create')}
              </Button>
            </motion.div>
          )}

          <table className="w-full text-left text-xs" data-testid="accounts-staff-table">
            <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">{t('fleetos.accounts.colName')}</th>
                <th className="px-3 py-2.5">{t('fleetos.accounts.colEmail')}</th>
                <th className="px-3 py-2.5">{t('fleetos.accounts.colRole')}</th>
                <th className="px-3 py-2.5">{t('fleetos.accounts.colStatus')}</th>
                <th className="px-3 py-2.5">{t('fleetos.accounts.colCreated')}</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {staffAccounts.map((a) => (
                <tr key={a.id} className="border-t border-white/5" data-testid="accounts-staff-row">
                  <td className="px-3 py-2.5 font-medium text-slate-200">{a.name}</td>
                  <td className="px-3 py-2.5 text-slate-400">{a.email}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={a.role === 'ADMIN' ? 'purple' : 'cyan'}>{t(`fleetos.accounts.role.${a.role}`)}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={a.status === 'ACTIVE' ? 'green' : 'slate'}>{t(`fleetos.accounts.status.${a.status}`)}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{a.createdAt}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => setStaffAccountStatus(a.id, a.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE')}
                      data-testid="accounts-staff-toggle-status"
                      className={`rounded-lg px-2.5 py-1 text-[10.5px] font-semibold ${a.status === 'ACTIVE' ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'}`}
                    >
                      {a.status === 'ACTIVE' ? t('fleetos.accounts.disable') : t('fleetos.accounts.enable')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('fleetos.accounts.searchDrivers')}
              data-testid="accounts-driver-search"
              className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
            />
          </div>
          <div className="glass-panel overflow-hidden rounded-2xl">
            <table className="w-full text-left text-xs" data-testid="accounts-drivers-table">
              <thead className="bg-white/[0.03] text-[10.5px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">{t('fleetos.accounts.colName')}</th>
                  <th className="px-3 py-2.5">{t('fleetos.accounts.colPhone')}</th>
                  <th className="px-3 py-2.5">{t('fleetos.accounts.colTier')}</th>
                  <th className="px-3 py-2.5">{lang === 'zh' ? '班表時段' : 'Shift Hours'}</th>
                  <th className="px-3 py-2.5">{t('fleetos.accounts.colLoginStatus')}</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((d) => (
                  <tr key={d.id} className="border-t border-white/5" data-testid="accounts-driver-row">
                    <td className="px-3 py-2.5 font-medium text-slate-200">
                      {d.avatarEmoji} {lang === 'zh' ? d.nameZh : d.name}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{d.phone}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={d.tier === 'OWNED_FLEET' ? 'cyan' : d.tier === 'PAID_MEMBER' ? 'purple' : 'amber'}>{t(`tier.${d.tier}`)}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {d.workingHours ? (
                        <button
                          onClick={() => setEditingShiftDriver(d)}
                          data-testid="accounts-edit-shift-btn"
                          className="flex items-center gap-1 text-[11px] font-mono text-cyan-300 hover:text-cyan-200 hover:underline"
                        >
                          <Clock className="h-3 w-3" />
                          {d.workingHours.shiftStart} - {d.workingHours.shiftEnd}
                        </button>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={d.loginEnabled ? 'green' : 'slate'}>{d.loginEnabled ? t('fleetos.accounts.enable') : t('fleetos.accounts.disable')}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setEditingShiftDriver(d)}
                        className="rounded-lg bg-cyan-500/10 border border-cyan-400/30 px-2 py-1 text-[10.5px] font-semibold text-cyan-300 hover:bg-cyan-500/20"
                      >
                        {lang === 'zh' ? '設定排班' : 'Edit Shift'}
                      </button>
                      <button
                        onClick={() => setDriverLoginEnabled(d.id, !d.loginEnabled)}
                        data-testid="accounts-driver-toggle-login"
                        className={`rounded-lg px-2.5 py-1 text-[10.5px] font-semibold ${d.loginEnabled ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'}`}
                      >
                        {d.loginEnabled ? t('fleetos.accounts.disable') : t('fleetos.accounts.enable')}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredDrivers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                      {t('fleetos.accounts.noDriversFound')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <DriverShiftModal driver={editingShiftDriver} isOpen={!!editingShiftDriver} onClose={() => setEditingShiftDriver(null)} />
    </FleetOsPage>
  )
}
