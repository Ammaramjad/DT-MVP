import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  Building2,
  Ticket,
  MessageSquare,
  Lock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Eye,
  EyeOff,
  Flame,
  Info,
} from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '../../i18n'
import { LANGS } from '../../i18n/translations'
import { useGatekeeper } from '../../lib/gatekeeper'

type GatekeeperTab = 'staff' | 'guest' | 'line'

export function ClientGatekeeper() {
  const { t, lang, setLang } = useLang()
  const {
    loginStaff,
    loginGuestPass,
    unlockWithLineOtp,
  } = useGatekeeper()

  const [tab, setTab] = useState<GatekeeperTab>('staff')

  // Staff Login State
  const [staffUsername, setStaffUsername] = useState('admin')
  const [staffPassword, setStaffPassword] = useState('FleetAdmin2026!')
  const [showStaffPassword, setShowStaffPassword] = useState(false)
  const [staffError, setStaffError] = useState<string | null>(null)
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false)

  // Guest Pass Login State
  const [guestUsername, setGuestUsername] = useState('guest_demo')
  const [guestPasscode, setGuestPasscode] = useState('ONE-TIME-2026')
  const [showGuestPasscode, setShowGuestPasscode] = useState(false)
  const [guestError, setGuestError] = useState<string | null>(null)
  const [isBurnedError, setIsBurnedError] = useState(false)
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false)

  // LINE 2FA simulation state
  const [lineIdentifier, setLineIdentifier] = useState('line_vip_client')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [lineOtp, setLineOtp] = useState('')
  const [lineError, setLineError] = useState<string | null>(null)
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null)

  // Handlers
  const handleStaffSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setStaffError(null)

    if (!staffUsername.trim() || !staffPassword.trim()) {
      setStaffError(t('gatekeeper.staff.invalid'))
      return
    }

    setIsSubmittingStaff(true)
    setTimeout(() => {
      const result = loginStaff(staffUsername, staffPassword)
      setIsSubmittingStaff(false)
      if (!result.success) {
        setStaffError(result.error || t('gatekeeper.staff.invalid'))
      }
    }, 250)
  }

  const handleGuestSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setGuestError(null)
    setIsBurnedError(false)

    if (!guestUsername.trim() && !guestPasscode.trim()) {
      setGuestError(t('gatekeeper.guest.invalidError'))
      return
    }

    setIsSubmittingGuest(true)
    setTimeout(() => {
      const result = loginGuestPass(guestUsername, guestPasscode)
      setIsSubmittingGuest(false)
      if (!result.success) {
        if (result.isBurned) {
          setIsBurnedError(true)
          setGuestError(
            result.error ||
              '⚠️ This one-time credential has already been used and expired. Please request a fresh single-use pass from the administrator.',
          )
        } else {
          setGuestError(result.error || t('gatekeeper.guest.invalidError'))
        }
      }
    }, 250)
  }

  const handleSendLineOtp = () => {
    if (!lineIdentifier.trim()) {
      setLineError(t('gatekeeper.line.emptyInput'))
      return
    }
    setLineError(null)
    setIsSendingOtp(true)
    setTimeout(() => {
      setIsSendingOtp(false)
      setOtpSent(true)
      setConfirmationNotice(t('gatekeeper.line.sentConfirmation'))
    }, 500)
  }

  const handleVerifyLineOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLineError(null)
    const success = unlockWithLineOtp(lineOtp, lineIdentifier.trim() || 'line_user')
    if (!success) {
      setLineError(t('gatekeeper.line.invalidOtp'))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex min-h-screen w-screen flex-col items-center justify-center overflow-y-auto bg-[#030712] p-4 sm:p-6"
      data-testid="client-gatekeeper-overlay"
    >
      {/* Dynamic Cyber-Luxe background ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[700px] rounded-full bg-gradient-to-br from-cyan-500/25 via-purple-600/20 to-transparent blur-3xl animate-pulse-slow" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-[450px] w-[550px] rounded-full bg-gradient-to-tl from-emerald-500/20 via-blue-600/15 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-32 h-[350px] w-[450px] rounded-full bg-gradient-to-tr from-amber-500/15 via-rose-600/10 to-transparent blur-3xl" />

      {/* Cyber-Luxe Glassmorphic Access Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass-panel-glow relative w-full max-w-xl overflow-hidden rounded-[32px] border border-cyan-500/30 bg-slate-950/85 p-6 shadow-[0_0_50px_rgba(34,211,238,0.18)] backdrop-blur-3xl sm:p-8"
        data-testid="gatekeeper-modal"
      >
        {/* Top Header: Brand & Language Toggle */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/25 via-blue-500/25 to-purple-600/25 text-cyan-300 ring-1 ring-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white">走瘋派車</span>
                <span className="rounded-full bg-cyan-400/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-cyan-300 ring-1 ring-cyan-400/30">
                  {t('gatekeeper.badge')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Taiwan Fleet Dispatch · Cyber-Luxe Security Gateway</p>
            </div>
          </div>

          {/* Language Switcher */}
          <div
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/80 p-1"
            role="group"
            aria-label={t('lang.switchLabel')}
            data-testid="gatekeeper-language-switcher"
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                data-testid={`gatekeeper-lang-${l.code}`}
                aria-pressed={lang === l.code}
                className={clsx(
                  'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
                  lang === l.code
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="mt-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 via-blue-500/20 to-purple-500/20 text-cyan-300 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/20">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight sm:text-2xl">{t('gatekeeper.title')}</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t('gatekeeper.subtitle')}</p>
        </div>

        {/* 3 Main Auth Method Tabs */}
        <div className="mt-5 grid grid-cols-3 rounded-2xl border border-white/10 bg-slate-950/70 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => {
              setTab('staff')
              setStaffError(null)
              setGuestError(null)
              setIsBurnedError(false)
              setLineError(null)
            }}
            data-testid="gatekeeper-tab-staff"
            className={clsx(
              'flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs font-bold transition-all text-center',
              tab === 'staff'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5',
            )}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('gatekeeper.tab.staff')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('guest')
              setStaffError(null)
              setGuestError(null)
              setIsBurnedError(false)
              setLineError(null)
            }}
            data-testid="gatekeeper-tab-guest"
            data-alias="gatekeeper-tab-passcode"
            className={clsx(
              'flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs font-bold transition-all text-center',
              tab === 'guest'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5',
            )}
          >
            <Ticket className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('gatekeeper.tab.guest')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('line')
              setStaffError(null)
              setGuestError(null)
              setIsBurnedError(false)
              setLineError(null)
            }}
            data-testid="gatekeeper-tab-line"
            className={clsx(
              'flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs font-bold transition-all text-center',
              tab === 'line'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5',
            )}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('gatekeeper.tab.line2fa')}</span>
          </button>
        </div>

        {/* Tab 1 Content: Enterprise Staff Login */}
        {tab === 'staff' && (
          <motion.form
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleStaffSubmit}
            className="mt-5 space-y-4"
            data-testid="gatekeeper-staff-section"
          >
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-3.5 text-xs text-cyan-200 shadow-inner">
              <div className="flex items-center gap-2 font-bold text-cyan-300">
                <ShieldCheck className="h-4 w-4" />
                {t('gatekeeper.staff.heading')}
              </div>
              <p className="mt-1 text-[11px] text-cyan-200/80 leading-relaxed">
                {t('gatekeeper.staff.desc')}
              </p>
            </div>

            {/* Quick Demo Pre-fill Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10.5px] font-semibold text-slate-400">Demo Fill:</span>
              <button
                type="button"
                onClick={() => {
                  setStaffUsername('admin')
                  setStaffPassword('FleetAdmin2026!')
                  setStaffError(null)
                }}
                className="rounded-lg border border-cyan-500/30 bg-cyan-950/50 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-900/50 transition"
              >
                👤 {t('gatekeeper.staff.quickAdmin')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStaffUsername('dispatcher')
                  setStaffPassword('TaiwanDispatch2026!')
                  setStaffError(null)
                }}
                className="rounded-lg border border-indigo-500/30 bg-indigo-950/50 px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:bg-indigo-900/50 transition"
              >
                🎧 {t('gatekeeper.staff.quickDispatcher')}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                {t('gatekeeper.staff.usernameLabel')}
              </label>
              <input
                type="text"
                value={staffUsername}
                onChange={(e) => setStaffUsername(e.target.value)}
                placeholder={t('gatekeeper.staff.usernamePlaceholder')}
                data-testid="gatekeeper-staff-username-input"
                className="input-field mt-1.5 !py-2.5 !text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                {t('gatekeeper.staff.passwordLabel')}
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showStaffPassword ? 'text' : 'password'}
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder={t('gatekeeper.staff.passwordPlaceholder')}
                  data-testid="gatekeeper-staff-password-input"
                  className="input-field !py-2.5 pr-10 !text-sm tracking-wider text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowStaffPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label="Toggle password visibility"
                >
                  {showStaffPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {staffError && (
              <div
                className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                data-testid="gatekeeper-staff-error"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{staffError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingStaff}
              data-testid="gatekeeper-staff-submit-btn"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 py-3 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              <span>{isSubmittingStaff ? 'Authenticating...' : t('gatekeeper.staff.loginBtn')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.form>
        )}

        {/* Tab 2 Content: Single-Use VIP Guest Pass (Burn-After-Reading) */}
        {tab === 'guest' && (
          <motion.form
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleGuestSubmit}
            className="mt-5 space-y-4"
            data-testid="gatekeeper-guest-section"
          >
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-3.5 text-xs text-amber-200 shadow-inner">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Flame className="h-4 w-4 text-orange-400 animate-pulse" />
                {t('gatekeeper.guest.heading')}
              </div>
              <p className="mt-1 text-[11px] text-amber-200/80 leading-relaxed">
                {t('gatekeeper.guest.desc')}
              </p>
            </div>

            {/* Quick Demo Pre-fill Chip */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10.5px] font-semibold text-slate-400">Demo Fill:</span>
              <button
                type="button"
                onClick={() => {
                  setGuestUsername('guest_demo')
                  setGuestPasscode('ONE-TIME-2026')
                  setGuestError(null)
                  setIsBurnedError(false)
                }}
                className="rounded-lg border border-amber-500/30 bg-amber-950/50 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-900/50 transition"
              >
                🎟️ {t('gatekeeper.guest.quickDefault')}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                {t('gatekeeper.guest.usernameLabel')}
              </label>
              <input
                type="text"
                value={guestUsername}
                onChange={(e) => setGuestUsername(e.target.value)}
                placeholder={t('gatekeeper.guest.usernamePlaceholder')}
                data-testid="gatekeeper-guest-username-input"
                className="input-field mt-1.5 !py-2.5 !text-sm text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                {t('gatekeeper.guest.passcodeLabel')}
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showGuestPasscode ? 'text' : 'password'}
                  value={guestPasscode}
                  onChange={(e) => setGuestPasscode(e.target.value)}
                  placeholder={t('gatekeeper.guest.passcodePlaceholder')}
                  data-testid="gatekeeper-guest-passcode-input"
                  className="input-field !py-2.5 pr-10 !text-sm font-mono tracking-widest text-amber-200"
                />
                <button
                  type="button"
                  onClick={() => setShowGuestPasscode((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label="Toggle passcode visibility"
                >
                  {showGuestPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Burn-After-Reading Feature Info Badge */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-900/80 px-3 py-2 text-[11px] text-slate-300 border border-white/10">
              <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{t('gatekeeper.guest.burnNotice')}</span>
            </div>

            {/* Burned Token Warning Alert (Requirement: Exact Burned Warning message) */}
            {isBurnedError && guestError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-2.5 rounded-2xl border border-amber-500/60 bg-gradient-to-r from-amber-950/80 via-red-950/80 to-rose-950/80 p-3.5 text-xs font-medium text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                data-testid="gatekeeper-guest-burned-error"
              >
                <Flame className="h-5 w-5 shrink-0 text-amber-400 animate-bounce" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-300 leading-snug">{guestError}</p>
                  <p className="text-[11px] text-amber-200/70">
                    Security Policy: Disposable tokens cannot be re-activated.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Generic Invalid Error (when not burned) */}
            {!isBurnedError && guestError && (
              <div
                className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                data-testid="gatekeeper-guest-error"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{guestError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingGuest}
              data-testid="gatekeeper-guest-submit-btn"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 py-3 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-amber-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              <span>{isSubmittingGuest ? 'Verifying Pass...' : t('gatekeeper.guest.loginBtn')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.form>
        )}

        {/* Tab 3 Content: LINE 2FA Instant Push */}
        {tab === 'line' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 space-y-4"
            data-testid="gatekeeper-line-section"
          >
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-200 shadow-inner">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <Smartphone className="h-4 w-4" />
                {t('gatekeeper.line.heading')}
              </div>
              <p className="mt-1 text-[11px] text-emerald-200/80 leading-relaxed">
                {t('gatekeeper.line.desc')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                {t('gatekeeper.line.inputLabel')}
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  value={lineIdentifier}
                  onChange={(e) => setLineIdentifier(e.target.value)}
                  placeholder={t('gatekeeper.line.inputPlaceholder')}
                  data-testid="gatekeeper-line-input"
                  className="input-field !py-2.5 !text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleSendLineOtp}
                  disabled={isSendingOtp}
                  data-testid="gatekeeper-line-send-btn"
                  className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 disabled:opacity-50"
                >
                  {isSendingOtp
                    ? t('gatekeeper.line.sending')
                    : otpSent
                      ? t('gatekeeper.line.resend')
                      : t('gatekeeper.line.sendOtp')}
                </button>
              </div>
            </div>

            {/* Calm confirmation notice without leaking OTP */}
            <AnimatePresence>
              {confirmationNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/50 p-3 text-xs font-medium text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  data-testid="gatekeeper-line-sent-notice"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="leading-snug">{confirmationNotice}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OTP Input Form */}
            <form onSubmit={handleVerifyLineOtp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  {t('gatekeeper.line.otpLabel')}
                </label>
                <input
                  type="text"
                  value={lineOtp}
                  onChange={(e) => setLineOtp(e.target.value)}
                  placeholder={t('gatekeeper.line.otpPlaceholder')}
                  data-testid="gatekeeper-line-otp-input"
                  className="input-field mt-1.5 !py-3 text-center !text-base font-mono font-bold tracking-widest text-white shadow-inner"
                />
              </div>

              {lineError && (
                <div
                  className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3.5 py-2.5 text-xs font-medium text-rose-300"
                  data-testid="gatekeeper-line-error"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{lineError}</span>
                </div>
              )}

              <button
                type="submit"
                data-testid="gatekeeper-line-verify-btn"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 py-3 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-emerald-500/30 transition hover:brightness-110 active:scale-[0.98]"
              >
                <span>{t('gatekeeper.line.verifyButton')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}

        {/* Footer Security Notice */}
        <div className="mt-6 border-t border-white/10 pt-4 text-center">
          <p className="text-[10.5px] font-medium text-slate-400">
            {t('gatekeeper.securityNotice')}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            {t('gatekeeper.footer.confidential')}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
