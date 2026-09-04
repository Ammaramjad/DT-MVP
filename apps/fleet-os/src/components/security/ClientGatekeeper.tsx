import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Lock, ArrowRight, AlertTriangle, Eye, EyeOff, Flame } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '../../i18n'
import { LANGS } from '../../i18n/translations'
import { useGatekeeper } from '../../lib/gatekeeper'

export function ClientGatekeeper() {
  const { t, lang, setLang } = useLang()
  const { login } = useGatekeeper()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBurnedError, setIsBurnedError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)
    setIsBurnedError(false)

    if (!username.trim() || !password.trim()) {
      setError(t('gatekeeper.invalid'))
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      const result = login(username, password)
      setIsSubmitting(false)
      if (!result.success) {
        if (result.isBurned) {
          setIsBurnedError(true)
          setError(result.error || t('gatekeeper.burnedError'))
        } else {
          setError(result.error || t('gatekeeper.invalid'))
        }
      }
    }, 250)
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex min-h-screen w-screen flex-col items-center justify-center overflow-y-auto bg-[#030712] p-4 sm:p-6"
      data-testid="client-gatekeeper-overlay"
    >
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[700px] rounded-full bg-gradient-to-br from-cyan-500/25 via-purple-600/20 to-transparent blur-3xl animate-pulse-slow" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-[450px] w-[550px] rounded-full bg-gradient-to-tl from-emerald-500/20 via-blue-600/15 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-32 h-[350px] w-[450px] rounded-full bg-gradient-to-tr from-amber-500/15 via-rose-600/10 to-transparent blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass-panel-glow relative w-full max-w-xl overflow-hidden rounded-[32px] border border-cyan-500/30 bg-slate-950/85 p-6 shadow-[0_0_50px_rgba(34,211,238,0.18)] backdrop-blur-3xl sm:p-8"
        data-testid="gatekeeper-modal"
      >
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

        <div className="mt-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 via-blue-500/20 to-purple-500/20 text-cyan-300 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/20">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight sm:text-2xl">{t('gatekeeper.title')}</h2>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="mt-5 space-y-4"
          data-testid="gatekeeper-login-form"
          autoComplete="off"
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              {t('gatekeeper.usernameLabel')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('gatekeeper.usernamePlaceholder')}
              data-testid="gatekeeper-username-input"
              autoComplete="off"
              className="input-field mt-1.5 !py-2.5 !text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              {t('gatekeeper.passwordLabel')}
            </label>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('gatekeeper.passwordPlaceholder')}
                data-testid="gatekeeper-password-input"
                autoComplete="new-password"
                className="input-field !py-2.5 pr-10 !text-sm tracking-wider text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                aria-label="Toggle password visibility"
                data-testid="gatekeeper-password-toggle"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isBurnedError && error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-2.5 rounded-2xl border border-amber-500/60 bg-gradient-to-r from-amber-950/80 via-red-950/80 to-rose-950/80 p-3.5 text-xs font-medium text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.25)]"
              data-testid="gatekeeper-burned-error"
            >
              <Flame className="h-5 w-5 shrink-0 text-amber-400 animate-bounce" />
              <p className="font-bold text-amber-300 leading-snug">{error}</p>
            </motion.div>
          )}

          {!isBurnedError && error && (
            <div
              className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
              data-testid="gatekeeper-error"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="gatekeeper-submit-btn"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 py-3 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            <span>{isSubmitting ? t('gatekeeper.submitting') : t('gatekeeper.loginBtn')}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.form>

        <div className="mt-6 border-t border-white/10 pt-4 text-center">
          <p className="text-[10.5px] font-medium text-slate-400">{t('gatekeeper.securityNotice')}</p>
          <p className="mt-1 text-[10px] text-slate-500">{t('gatekeeper.footer.confidential')}</p>
        </div>
      </motion.div>
    </div>
  )
}
