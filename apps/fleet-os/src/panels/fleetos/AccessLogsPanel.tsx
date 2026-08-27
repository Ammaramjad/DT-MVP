import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Globe2,
  Users,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Download,
  Trash2,
  Search,
  Filter,
  KeyRound,
  MessageSquare,
  Smartphone,
  Laptop,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime, formatRelative } from '../../lib/format'
import { useLang } from '../../i18n'
import type { AccessAttemptStatus, AccessAuthMethod } from '../../types'

export default function AccessLogsPanel() {
  const { t, lang } = useLang()
  const accessLogs = useFleetStore((s) => s.accessLogs)
  const clearAccessLogs = useFleetStore((s) => s.clearAccessLogs)

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // KPI Calculations
  const totalAttempts = accessLogs.length
  const uniqueIps = useMemo(() => new Set(accessLogs.map((l) => l.ip)).size, [accessLogs])
  const authorizedCount = useMemo(() => accessLogs.filter((l) => l.status === 'SUCCESS').length, [accessLogs])
  const failedCount = useMemo(() => accessLogs.filter((l) => l.status !== 'SUCCESS').length, [accessLogs])

  const topCity = useMemo(() => {
    if (accessLogs.length === 0) return '—'
    const counts: Record<string, number> = {}
    for (const log of accessLogs) {
      const city = log.city || 'Unknown'
      counts[city] = (counts[city] || 0) + 1
    }
    let maxCity = 'Taipei'
    let maxCount = 0
    for (const [c, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count
        maxCity = c
      }
    }
    return maxCity
  }, [accessLogs])

  // Regional Breakdown
  const regionBreakdown = useMemo(() => {
    const counts: Record<string, { total: number; success: number; failed: number }> = {}
    for (const log of accessLogs) {
      const city = log.city || 'Taipei'
      if (!counts[city]) {
        counts[city] = { total: 0, success: 0, failed: 0 }
      }
      counts[city].total += 1
      if (log.status === 'SUCCESS') {
        counts[city].success += 1
      } else {
        counts[city].failed += 1
      }
    }
    return Object.entries(counts).sort((a, b) => b[1].total - a[1].total)
  }, [accessLogs])

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return accessLogs.filter((log) => {
      // Status filter
      if (statusFilter === 'SUCCESS' && log.status !== 'SUCCESS') return false
      if (statusFilter === 'FAILED' && log.status === 'SUCCESS') return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchIp = log.ip.toLowerCase().includes(q)
        const matchCity = log.city.toLowerCase().includes(q)
        const matchRegion = (log.region || '').toLowerCase().includes(q)
        const matchCountry = (log.country || '').toLowerCase().includes(q)
        const matchDevice = (log.device || '').toLowerCase().includes(q)
        const matchBrowser = (log.browser || '').toLowerCase().includes(q)
        const matchOs = (log.os || '').toLowerCase().includes(q)
        const matchAuth = (log.authMethod || '').toLowerCase().includes(q)
        const matchId = (log.inputIdentifier || '').toLowerCase().includes(q)
        if (
          !matchIp &&
          !matchCity &&
          !matchRegion &&
          !matchCountry &&
          !matchDevice &&
          !matchBrowser &&
          !matchOs &&
          !matchAuth &&
          !matchId
        ) {
          return false
        }
      }

      return true
    })
  }, [accessLogs, statusFilter, searchQuery])

  const handleCopyIp = (id: string, ip: string) => {
    try {
      navigator.clipboard.writeText(ip)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // ignore
    }
  }

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'ISO Time', 'IP Address', 'City', 'Region', 'Country', 'Device', 'Browser', 'OS', 'Auth Method', 'Status', 'Identifier']
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      new Date(l.timestamp).toISOString(),
      `"${l.ip}"`,
      `"${l.city}"`,
      `"${l.region || ''}"`,
      `"${l.country || ''}"`,
      `"${l.device || ''}"`,
      `"${l.browser || ''}"`,
      `"${l.os || ''}"`,
      l.authMethod,
      l.status,
      `"${l.inputIdentifier || ''}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `fleet_access_logs_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2))
    const link = document.createElement('a')
    link.setAttribute('href', dataStr)
    link.setAttribute('download', `fleet_access_logs_${Date.now()}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderStatusBadge = (status: AccessAttemptStatus) => {
    if (status === 'SUCCESS') {
      return (
        <span
          data-testid="access-status-success"
          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30"
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          {t('fleetos.accessLogs.status.SUCCESS')}
        </span>
      )
    }
    return (
      <span
        data-testid="access-status-failed"
        className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-500/30"
      >
        <XCircle className="h-3 w-3 text-rose-400" />
        {status === 'FAILED_INVALID_PASSCODE'
          ? t('fleetos.accessLogs.status.FAILED_INVALID_PASSCODE')
          : t('fleetos.accessLogs.status.FAILED_INVALID_OTP')}
      </span>
    )
  }

  const renderAuthMethodBadge = (method: AccessAuthMethod) => {
    if (method === 'PASSCODE') {
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-400/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300 ring-1 ring-cyan-400/20">
          <KeyRound className="h-3 w-3" />
          {t('fleetos.accessLogs.auth.PASSCODE')}
        </span>
      )
    }
    if (method === 'LINE_2FA') {
      return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/20">
          <MessageSquare className="h-3 w-3" />
          {t('fleetos.accessLogs.auth.LINE_2FA')}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-purple-400/10 px-2 py-0.5 text-[11px] font-medium text-purple-300 ring-1 ring-purple-400/20">
        <Sparkles className="h-3 w-3" />
        {t('fleetos.accessLogs.auth.DEMO_1CLICK')}
      </span>
    )
  }

  return (
    <FleetOsPage
      title={t('fleetos.accessLogs.title')}
      subtitle={t('fleetos.accessLogs.subtitle')}
      icon={<Shield className="h-5 w-5 text-cyan-400" />}
      right={
        <div className="flex items-center gap-2">
          <Badge tone="cyan" pulse>
            <ShieldCheck className="h-3 w-3 mr-0.5" /> {t('fleetos.accessLogs.securityBadge')}
          </Badge>
        </div>
      }
    >
      {/* KPI Cards */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="access-kpi-summary">
        <StatCard
          icon={<Shield className="h-4 w-4" />}
          label={t('fleetos.accessLogs.kpi.totalAttempts')}
          value={totalAttempts}
          tone="cyan"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label={t('fleetos.accessLogs.kpi.uniqueIps')}
          value={uniqueIps}
          tone="purple"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label={t('fleetos.accessLogs.kpi.authorized')}
          value={authorizedCount}
          tone="lime"
        />
        <StatCard
          icon={<ShieldAlert className="h-4 w-4" />}
          label={t('fleetos.accessLogs.kpi.failed')}
          value={failedCount}
          tone="red"
        />
        <div className="glass-panel flex flex-col justify-between rounded-2xl p-3.5 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">{t('fleetos.accessLogs.kpi.topCity')}</span>
            <Globe2 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold tracking-tight text-white">{topCity}</div>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {regionBreakdown[0] ? `${regionBreakdown[0][1].total} connections` : 'No logs'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Region & City Geolocation Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-xl"
        data-testid="access-region-breakdown"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-3 border-b border-white/5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Globe2 className="h-4 w-4" /> {t('fleetos.accessLogs.regionBreakdown.title')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{t('fleetos.accessLogs.regionBreakdown.subtitle')}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {regionBreakdown.map(([city, stats]) => {
            const pct = totalAttempts > 0 ? Math.round((stats.total / totalAttempts) * 100) : 0
            return (
              <div
                key={city}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-cyan-500/30 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-cyan-400" />
                    {city}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-300">{pct}%</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between text-[11px]">
                  <span className="text-slate-400">{stats.total} visits</span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-emerald-400">✓ {stats.success}</span>
                    {stats.failed > 0 && <span className="text-rose-400">✗ {stats.failed}</span>}
                  </div>
                </div>
                {/* Visual bar */}
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Main Access Audit Table Section */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-xl"
        data-testid="access-logs-table-container"
      >
        {/* Controls Toolbar: Search, Filter, Export & Clear */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-white/10">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('fleetos.accessLogs.searchPlaceholder')}
              data-testid="access-logs-search-input"
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          {/* Filter tabs & Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
              {(['ALL', 'SUCCESS', 'FAILED'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setStatusFilter(mode)}
                  data-testid={`access-filter-${mode.toLowerCase()}`}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                    statusFilter === mode ? 'bg-cyan-400/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'ALL'
                    ? t('fleetos.accessLogs.filter.all')
                    : mode === 'SUCCESS'
                    ? t('fleetos.accessLogs.filter.success')
                    : t('fleetos.accessLogs.filter.failed')}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              data-testid="access-export-csv-btn"
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              <Download className="h-3.5 w-3.5" />
              {t('fleetos.accessLogs.action.exportCsv')}
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              data-testid="access-export-json-btn"
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              <Download className="h-3.5 w-3.5" />
              {t('fleetos.accessLogs.action.exportJson')}
            </button>

            {accessLogs.length > 0 && (
              <button
                type="button"
                onClick={clearAccessLogs}
                data-testid="access-clear-logs-btn"
                className="flex items-center gap-1 rounded-xl border border-rose-500/20 bg-rose-950/30 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-950/60 hover:text-rose-200 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('fleetos.accessLogs.action.clear')}
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs" data-testid="access-logs-table">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-semibold text-slate-400">
                <th className="pb-3 pl-2 pr-4">{t('fleetos.accessLogs.col.timestamp')}</th>
                <th className="pb-3 px-4">{t('fleetos.accessLogs.col.ip')}</th>
                <th className="pb-3 px-4">{t('fleetos.accessLogs.col.location')}</th>
                <th className="pb-3 px-4">{t('fleetos.accessLogs.col.device')}</th>
                <th className="pb-3 px-4">{t('fleetos.accessLogs.col.authMethod')}</th>
                <th className="pb-3 px-4">{t('fleetos.accessLogs.col.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    <Filter className="mx-auto h-6 w-6 mb-2 opacity-50" />
                    {t('fleetos.accessLogs.empty')}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="group hover:bg-white/[0.02] transition"
                    data-testid={`access-log-row-${log.id}`}
                  >
                    {/* Timestamp */}
                    <td className="py-3 pl-2 pr-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>{formatDateTime(new Date(log.timestamp).toISOString(), lang)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 pl-5">
                        {formatRelative(log.timestamp, lang)}
                      </div>
                    </td>

                    {/* IP Address & Copy */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-cyan-300" data-testid="access-log-ip">
                          {log.ip}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyIp(log.id, log.ip)}
                          title={t('fleetos.accessLogs.copyIp')}
                          data-testid={`access-copy-ip-btn-${log.id}`}
                          className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-white transition"
                        >
                          {copiedId === log.id ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex h-5 items-center justify-center rounded-md bg-white/10 px-1.5 text-[10px] font-bold text-slate-200">
                          {log.countryCode || 'TW'}
                        </span>
                        <div>
                          <p className="font-medium text-slate-200" data-testid="access-log-city">
                            {log.city}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {log.region && log.region !== log.city ? `${log.region}, ` : ''}
                            {log.country}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Device & Browser */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-400">
                          {log.device === 'Mobile' ? <Smartphone className="h-3.5 w-3.5" /> : <Laptop className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <p className="text-xs text-slate-200">
                            {log.browser} · {log.os}
                          </p>
                          <p className="text-[10px] text-slate-500">{log.device}</p>
                        </div>
                      </div>
                    </td>

                    {/* Auth Method */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {renderAuthMethodBadge(log.authMethod)}
                        {log.inputIdentifier && (
                          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                            {log.inputIdentifier}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">{renderStatusBadge(log.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </FleetOsPage>
  )
}
