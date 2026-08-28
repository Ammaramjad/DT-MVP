import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  KeyRound,
  MessageSquare,
  Lock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
} from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '../../i18n'
import { LANGS } from '../../i18n/translations'
import { useGatekeeper } from '../../lib/gatekeeper'

export function ClientGatekeeper() {
  const { t, lang, setLang } = useLang()
  const { unlockWithPasscode, unlockWithLineOtp } = useGatekeeper()

  const [tab, setTab] = useState<'line' | 'passcode'>('line')
  const [passcode, setPasscode] = useState('')
  const [passcodeError, setPasscodeError] = useState<string | null>(null)

  // LINE 2FA simulation state
  const [lineIdentifier, setLineIdentifier] = useState('line_vip_client')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [lineOtp, setLineOtp] = useState('')
  const [lineError, setLineError] = useState<string | null>(null)
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null)

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
    }, 600)
  }

  const handleVerifyLineOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLineError(null)
    const success = unlockWithLineOtp(lineOtp, lineIdentifier.trim() || 'line_user')
    if (!success) {
      setLineError(t('gatekeeper.line.invalidOtp'))
    }
  }

  const handleVerifyPasscode = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setPasscodeError(null)
    const success = unlockWithPasscode(passcode)
    if (!success) {
      setPasscodeError(t('gatekeeper.passcode.invalid'))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex min-h-screen w-screen flex-col items-center justify-center overflow-y-auto bg-[#030712] p-4 sm:p-6"
      data-testid="client-gatekeeper-overlay"
    >
      {/* Background glowing gradients */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[700px] rounded-full bg-gradient-to-br from-cyan-500/25 via-purple-600/20 to-transparent blur-3xl animate-pulse-slow" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-[450px] w-[550px] rounded-full bg-gradient-to-tl from-emerald-500/20 via-blue-600/15 to-transparent blur-3xl" />

      {/* Main Apple/Linear Grade Glassmorphic Access Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass-panel-glow relative w-full max-w-lg overflow-hidden rounded-[32px] p-6 shadow-2xl backdrop-blur-3xl sm:p-8"
        data-testid="gatekeeper-modal"
      >
        {/* Top Header: Brand & Language Toggle */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-cyan-300 ring-1 ring-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white">走瘋派車</span>
                <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-300 ring-1 ring-amber-400/40">
                  {t('gatekeeper.badge')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Fleet OS · Cyber Gatekeeper 2FA</p>
            </div>
          </div>

          {/* Language Switcher */}
          <div
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-1"
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
        <div className="mt-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 via-blue-500/20 to-purple-500/20 text-cyan-300 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/20">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight sm:text-2xl">{t('gatekeeper.title')}</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t('gatekeeper.subtitle')}</p>
        </div>

        {/* Auth Method Tabs */}
        <div className="mt-6 flex rounded-2xl border border-white/10 bg-slate-950/60 p-1.5">
          <button
            type="button"
            onClick={() => {
              setTab('line')
              setPasscodeError(null)
              setLineError(null)
            }}
            data-testid="gatekeeper-tab-line"
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all',
              tab === 'line'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <MessageSquare className="h-4 w-4" />
            {t('gatekeeper.tab.line2fa')}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('passcode')
              setPasscodeError(null)
              setLineError(null)
            }}
            data-testid="gatekeeper-tab-passcode"
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all',
              tab === 'passcode'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <KeyRound className="h-4 w-4" />
            {t('gatekeeper.tab.passcode')}
          </button>
        </div>

        {/* Tab Content: LINE 2FA */}
        {tab === 'line' && (
          <div className="mt-5 space-y-4" data-testid="gatekeeper-line-section">
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
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={lineIdentifier}
                  onChange={(e) => setLineIdentifier(e.target.value)}
                  placeholder={t('gatekeeper.line.inputPlaceholder')}
                  data-testid="gatekeeper-line-input"
                  className="input-field !py-2.5 !text-xs"
                />
                <button
                  type="button"
                  onClick={handleSendLineOtp}
                  disabled={isSendingOtp}
                  data-testid="gatekeeper-line-send-btn"
                  className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 disabled:opacity-50"
                >
                  {isSendingOtp ? t('gatekeeper.line.sending') : otpSent ? t('gatekeeper.line.resend') : t('gatekeeper.line.sendOtp')}
                </button>
              </div>
            </div>

            {/* Calm confirmation notice without revealing passcode */}
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

            {/* OTP Input Form once sent */}
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
          </div>
        )}

        {/* Tab Content: Master Passcode */}
        {tab === 'passcode' && (
          <form onSubmit={handleVerifyPasscode} className="mt-5 space-y-4" data-testid="gatekeeper-passcode-section">
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-3.5 text-xs text-cyan-200 shadow-inner">
              <div className="flex items-center gap-2 font-bold text-cyan-300">
                <KeyRound className="h-4 w-4" />
                {t('gatekeeper.passcode.heading')}
              </div>
              <p className="mt-1 text-[11px] text-cyan-200/80 leading-relaxed">
                {t('gatekeeper.passcode.desc')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                {t('gatekeeper.passcode.inputLabel')}
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder={t('gatekeeper.passcode.inputPlaceholder')}
                data-testid="gatekeeper-passcode-input"
                className="input-field mt-2 !py-3 !text-sm tracking-widest text-white shadow-inner"
              />
            </div>

            {passcodeError && (
              <div
                className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3.5 py-2.5 text-xs font-medium text-rose-300"
                data-testid="gatekeeper-passcode-error"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{passcodeError}</span>
              </div>
            )}

            <button
              type="submit"
              data-testid="gatekeeper-passcode-unlock-btn"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 py-3 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-cyan-500/30 transition hover:brightness-110 active:scale-[0.98]"
            >
              <span>{t('gatekeeper.passcode.unlockButton')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
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
