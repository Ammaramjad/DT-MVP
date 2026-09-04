import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Ticket,
  Flame,
  Copy,
  Check,
  Search,
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '../../i18n'
import { useGatekeeper } from '../../lib/gatekeeper'
import { formatDateTime, formatRelative } from '../../lib/format'
import type { GuestPass, GuestPassStatus } from '../../types'

export function GuestPassVault() {
  const { t, lang } = useLang()
  const {
    currentUser,
    guestPasses,
    generateGuestPass,
    revokeGuestPass,
  } = useGatekeeper()

  const isSuperAdmin = currentUser?.role === 'admin'

  if (!isSuperAdmin) {
    return null
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | GuestPassStatus>('ALL')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Quick toast banner helper
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Copy handler
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedId(id)
    showToast(t('admin.vault.copied'))
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Generate 1-click pass handler
  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      const newPass = generateGuestPass()
      setIsGenerating(false)
      showToast(
        `${t('admin.vault.toastCreated')} — ${newPass.username} / ${newPass.passcode}`,
      )
    }, 200)
  }

  // Revoke pass handler
  const handleRevoke = (pass: GuestPass) => {
    revokeGuestPass(pass.id, 'Manually burned by administrator')
    showToast(`${t('admin.vault.toastRevoked')} (${pass.username})`)
  }

  // KPI calculations
  const totalCount = guestPasses.length
  const activeCount = useMemo(
    () => guestPasses.filter((p) => p.status === 'ACTIVE').length,
    [guestPasses],
  )
  const inUseCount = useMemo(
    () => guestPasses.filter((p) => p.status === 'IN_USE').length,
    [guestPasses],
  )
  const burnedCount = useMemo(
    () => guestPasses.filter((p) => p.status === 'BURNED').length,
    [guestPasses],
  )

  // Filtered passes
  const filteredPasses = useMemo(() => {
    return guestPasses.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        p.username.toLowerCase().includes(q) ||
        p.passcode.toLowerCase().includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        p.ip.toLowerCase().includes(q)
      )
    })
  }, [guestPasses, statusFilter, searchQuery])

  const renderStatusBadge = (status: GuestPassStatus) => {
    if (status === 'ACTIVE') {
      return (
        <span
          data-testid="badge-status-active"
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          {lang === 'zh' ? '🟢 有效 / 未使用' : '🟢 ACTIVE / UNUSED'}
        </span>
      )
    }
    if (status === 'IN_USE') {
      return (
        <span
          data-testid="badge-status-in-use"
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/60 px-2.5 py-1 text-[11px] font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
        >
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          {lang === 'zh' ? '🟡 使用中 (連線中)' : '🟡 IN USE'}
        </span>
      )
    }
    return (
      <span
        data-testid="badge-status-burned"
        className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-950/60 px-2.5 py-1 text-[11px] font-bold text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)]"
      >
        <Flame className="h-3 w-3 text-rose-400" />
        {lang === 'zh' ? '🔴 已作廢銷毀 / 已過期' : '🔴 BURNED / EXPIRED'}
      </span>
    )
  }

  return (
    <div className="space-y-4" data-testid="guest-pass-vault-container">
      {/* Vault Header Banner & 1-Click Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-slate-950/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/25 via-orange-500/25 to-rose-600/25 text-amber-300 ring-1 ring-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Ticket className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-white sm:text-xl">
                {t('admin.vault.title')}
              </h3>
              <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30">
                Burn-After-Reading Vault
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
              {t('admin.vault.subtitle')}
            </p>
          </div>
        </div>

        {/* 1-Click Pass Generator Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          data-testid="generate-guest-pass-btn"
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-amber-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          <span>{isGenerating ? 'Generating...' : t('admin.vault.generateBtn')}</span>
        </button>
      </div>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-950/80 p-3 text-xs font-bold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-md"
            data-testid="vault-toast-msg"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass-panel rounded-2xl p-4 border border-white/10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {t('admin.vault.totalPasses')}
          </p>
          <p className="mt-1 text-2xl font-black text-white">{totalCount}</p>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/20 bg-emerald-950/10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            {t('admin.vault.activePasses')}
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-300">{activeCount}</p>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-amber-500/20 bg-amber-950/10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            {t('admin.vault.inUsePasses')}
          </p>
          <p className="mt-1 text-2xl font-black text-amber-300">{inUseCount}</p>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-rose-500/20 bg-rose-950/10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
            {t('admin.vault.burnedPasses')}
          </p>
          <p className="mt-1 text-2xl font-black text-rose-300">{burnedCount}</p>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('admin.vault.searchPlaceholder')}
            data-testid="vault-search-input"
            className="input-field !py-2 !pl-9 !text-xs text-white"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/80 p-1">
          {(['ALL', 'ACTIVE', 'IN_USE', 'BURNED'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              data-testid={`vault-filter-${filter.toLowerCase()}`}
              className={clsx(
                'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                statusFilter === filter
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              {filter === 'ALL'
                ? lang === 'zh'
                  ? '全部'
                  : 'All'
                : filter === 'ACTIVE'
                  ? lang === 'zh'
                    ? '有效'
                    : 'Active'
                  : filter === 'IN_USE'
                    ? lang === 'zh'
                      ? '使用中'
                      : 'In Use'
                    : lang === 'zh'
                      ? '已銷毀'
                      : 'Burned'}
            </button>
          ))}
        </div>
      </div>

      {/* Passes Vault Table / Cards List */}
      <div className="glass-panel overflow-hidden rounded-2xl border border-white/10 divide-y divide-white/5" data-testid="vault-passes-list">
        {filteredPasses.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No guest passes matching current search/filter.
          </div>
        ) : (
          filteredPasses.map((pass) => {
            const isCopied = copiedId === pass.id
            const credString = `Username: ${pass.username} | Passcode: ${pass.passcode}`

            return (
              <motion.div
                key={pass.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid={`vault-pass-item-${pass.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition hover:bg-white/[0.02]"
              >
                {/* Left: Credentials & Meta */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-slate-900/90 px-3 py-1.5 font-mono text-xs">
                      <span className="font-semibold text-slate-400">Username:</span>
                      <span className="font-bold text-white">{pass.username}</span>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-slate-900/90 px-3 py-1.5 font-mono text-xs">
                      <span className="font-semibold text-slate-400">Passcode:</span>
                      <span className="font-bold tracking-wider text-amber-300">{pass.passcode}</span>
                    </div>

                    {renderStatusBadge(pass.status)}
                  </div>

                  {/* Timestamps & IP */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      Created: {formatDateTime(new Date(pass.createdAt).toISOString(), lang)} ({formatRelative(pass.createdAt, lang)})
                    </span>

                    {pass.burnedAt && (
                      <span className="flex items-center gap-1 text-rose-400">
                        <Flame className="h-3 w-3" />
                        Burned: {formatRelative(pass.burnedAt, lang)}
                      </span>
                    )}

                    <span className="flex items-center gap-1 text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {pass.ip}
                    </span>

                    {pass.notes && (
                      <span className="rounded bg-white/5 px-2 py-0.5 text-[10.5px] text-slate-300">
                        {pass.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Copy Credentials Button */}
                  <button
                    type="button"
                    onClick={() => handleCopy(credString, pass.id)}
                    data-testid={`vault-copy-btn-${pass.id}`}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                    <span>{isCopied ? t('admin.vault.copied') : t('admin.vault.copyBtn')}</span>
                  </button>

                  {/* 1-Click Revoke / Burn Token Button (Admins) */}
                  {pass.status !== 'BURNED' ? (
                    <button
                      type="button"
                      onClick={() => handleRevoke(pass)}
                      data-testid={`vault-revoke-btn-${pass.id}`}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-300 shadow-sm transition hover:bg-rose-900/60 hover:text-white"
                    >
                      <Flame className="h-3.5 w-3.5 text-rose-400" />
                      <span>{t('admin.vault.revokeBtn')}</span>
                    </button>
                  ) : (
                    <span className="rounded-xl bg-slate-900/60 px-3 py-2 text-[11px] font-mono text-slate-500 border border-white/5">
                      Burned
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
