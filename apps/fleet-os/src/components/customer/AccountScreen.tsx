import { useState, type ReactNode } from 'react'
import {
  Award,
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  Download,
  FileSearch,
  Globe2,
  HelpCircle,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  User,
  UserPlus,
} from 'lucide-react'
import type { CustomerProfile, Order } from '../../types'
import { formatDateTime, formatMonthYear, formatTWD, orderStatusLabel } from '../../lib/format'
import { LANGS } from '../../i18n/translations'
import { useLang } from '../../i18n'
import { useFleetStore } from '../../store/useFleetStore'
import clsx from 'clsx'

const TIER_TONE: Record<CustomerProfile['memberTier'], string> = {
  SILVER: 'from-slate-400 to-slate-300 text-slate-900',
  GOLD: 'from-amber-400 to-yellow-300 text-amber-900',
  PLATINUM: 'from-indigo-400 to-sky-300 text-indigo-950',
}

export function AccountScreen({
  profile,
  fallbackOrder,
  totalTrips,
  totalSpent,
  orders,
  onSelectOrder,
}: {
  profile: CustomerProfile | null
  fallbackOrder: Order
  totalTrips: number
  totalSpent: number
  orders: Order[]
  onSelectOrder: (id: string) => void
}) {
  const { t, lang, setLang } = useLang()
  const addSavedPassenger = useFleetStore((s) => s.addSavedPassenger)
  const removeSavedPassenger = useFleetStore((s) => s.removeSavedPassenger)
  const addPaymentMethod = useFleetStore((s) => s.addPaymentMethod)
  const removePaymentMethod = useFleetStore((s) => s.removePaymentMethod)
  const setDefaultPaymentMethod = useFleetStore((s) => s.setDefaultPaymentMethod)
  const setNotificationPreference = useFleetStore((s) => s.setNotificationPreference)
  const requestPrivacyAction = useFleetStore((s) => s.requestPrivacyAction)
  const setConsentMarketing = useFleetStore((s) => s.setConsentMarketing)
  const campaigns = useFleetStore((s) => s.campaigns)
  const authSession = useFleetStore((s) => s.authSession)
  const loginWithLine = useFleetStore((s) => s.loginWithLine)
  const loginWithEmail = useFleetStore((s) => s.loginWithEmail)
  const logout = useFleetStore((s) => s.logout)
  const allOrders = useFleetStore((s) => s.orders)

  const [showAddPassenger, setShowAddPassenger] = useState(false)
  const [passengerName, setPassengerName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [couponsOpen, setCouponsOpen] = useState(false)
  const [guidelinesOpen, setGuidelinesOpen] = useState(false)
  const [companyInfoOpen, setCompanyInfoOpen] = useState(false)
  const [emailLoginOpen, setEmailLoginOpen] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [lookupOrderNo, setLookupOrderNo] = useState('')
  const [lookupResult, setLookupResult] = useState<Order | null | 'NOT_FOUND'>(null)

  const name = profile?.name ?? fallbackOrder.customer.name
  const phone = profile?.phone ?? fallbackOrder.customer.phone
  const email = profile?.email ?? fallbackOrder.customer.email
  const memberSince = profile?.memberSince ?? new Date(fallbackOrder.createdAt).toISOString()
  const sortedOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt)
  const tier = profile?.memberTier ?? 'SILVER'
  const points = profile?.memberPoints ?? 0
  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE')

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pb-6" data-testid="customer-account-screen">
      <h1 className="text-xl font-bold text-slate-900">{t('customer.account.title')}</h1>

      <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 text-white">
            <User className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-bold text-slate-900">{name}</p>
              <span className={`flex items-center gap-1 rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] font-bold ${TIER_TONE[tier]}`} data-testid="customer-member-tier">
                <Award className="h-3 w-3" /> {t(`account.tier.${tier}`)}
              </span>
            </div>
            <p className="truncate text-xs text-slate-500">
              {phone} · {email}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{t('customer.account.memberSince', { date: formatMonthYear(memberSince, lang) })}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-lg font-bold text-slate-800">{totalTrips}</p>
            <p className="text-[10.5px] text-slate-500">{t('customer.account.totalTrips', { n: totalTrips })}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-lg font-bold text-slate-800">{formatTWD(totalSpent)}</p>
            <p className="text-[10.5px] text-slate-500">{t('customer.account.totalSpent')}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-center">
            <p className="text-lg font-bold text-amber-600">{points}</p>
            <p className="text-[10.5px] text-amber-500">{t('account.points')}</p>
          </div>
        </div>
      </div>

      {/* Lightweight simulated account access (機場快綫's member login +
          萬馬接送's LINE quick login) — fully demo-grade, no real backend or
          session; just a store-level `authSession` flag. */}
      <div className="rounded-2xl bg-white p-4 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100" data-testid="account-auth-card">
        {authSession.isLoggedIn ? (
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              {t('account.loggedInAs', { name: authSession.displayName ?? '' })}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{authSession.method}</span>
            </p>
            <button onClick={logout} data-testid="account-logout-session" className="text-xs font-semibold text-red-500 hover:underline">
              {t('customer.account.logout')}
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('account.signInTitle')}</p>
            <div className="flex gap-2">
              <button
                onClick={loginWithLine}
                data-testid="account-login-line"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#06C755] py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-95"
              >
                <MessageCircle className="h-3.5 w-3.5" /> {t('account.loginWithLine')}
              </button>
              <button
                onClick={() => setEmailLoginOpen((v) => !v)}
                data-testid="account-login-email-toggle"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                <Mail className="h-3.5 w-3.5" /> {t('account.loginWithEmail')}
              </button>
            </div>
            {emailLoginOpen && (
              <div className="mt-3 space-y-2 rounded-xl border border-dashed border-slate-200 p-3">
                <input
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={t('account.emailPlaceholder')}
                  data-testid="account-login-email-input"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
                />
                <input
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  type="password"
                  placeholder={t('account.passwordPlaceholder')}
                  data-testid="account-login-password-input"
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => {
                    if (!loginEmail.trim()) return
                    loginWithEmail(loginEmail.trim(), loginEmail.split('@')[0])
                    setEmailLoginOpen(false)
                  }}
                  data-testid="account-login-email-submit"
                  disabled={!loginEmail.trim()}
                  className="w-full rounded-lg bg-blue-500 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {t('account.loginOrRegister')}
                </button>
                <p className="text-center text-[10px] text-slate-400">{t('account.forgotPasswordDemo')}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order lookup by order number (機場快綫's 訂單查詢) — fully simulated,
          searches the live in-memory order list rather than a real backend. */}
      <div className="rounded-2xl bg-white p-4 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100" data-testid="account-order-lookup">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <FileSearch className="h-3.5 w-3.5" /> {t('account.orderLookupTitle')}
        </p>
        <div className="flex gap-2">
          <input
            value={lookupOrderNo}
            onChange={(e) => setLookupOrderNo(e.target.value.toUpperCase())}
            placeholder={t('account.orderLookupPlaceholder')}
            data-testid="account-order-lookup-input"
            className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
          />
          <button
            onClick={() => setLookupResult(allOrders.find((o) => o.orderNo === lookupOrderNo.trim()) ?? 'NOT_FOUND')}
            data-testid="account-order-lookup-submit"
            disabled={!lookupOrderNo.trim()}
            className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            <Search className="h-3.5 w-3.5" /> {t('account.orderLookupSubmit')}
          </button>
        </div>
        {lookupResult === 'NOT_FOUND' && <p className="mt-2 text-[11px] text-red-500" data-testid="account-order-lookup-not-found">{t('account.orderLookupNotFound')}</p>}
        {lookupResult && lookupResult !== 'NOT_FOUND' && (
          <div className="mt-2.5 rounded-xl bg-slate-50 p-3 text-xs" data-testid="account-order-lookup-result">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-700">{lookupResult.orderNo}</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{orderStatusLabel(lookupResult.status, lang)}</span>
            </div>
            <p className="mt-1.5 text-slate-500">
              {lang === 'zh' ? lookupResult.pickup.nameZh : lookupResult.pickup.name} → {lang === 'zh' ? lookupResult.dropoff.nameZh : lookupResult.dropoff.name}
            </p>
            <div className="mt-1 flex items-center justify-between text-slate-400">
              <span>{formatDateTime(lookupResult.scheduledTime, lang)}</span>
              <span className="font-semibold text-slate-700">{formatTWD(lookupResult.priceEstimate)}</span>
            </div>
            <button onClick={() => onSelectOrder(lookupResult.id)} data-testid="account-order-lookup-view" className="mt-2 font-semibold text-blue-600 hover:underline">
              {t('account.orderLookupView')}
            </button>
          </div>
        )}
      </div>

      {/* Saved passengers & emergency contacts */}
      <div className="rounded-2xl bg-white p-4 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100" data-testid="account-saved-passengers">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <UserPlus className="h-3.5 w-3.5" /> {t('account.savedPassengers')}
          </p>
          <button onClick={() => setShowAddPassenger((v) => !v)} data-testid="account-add-passenger-toggle" className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">
            <Plus className="h-3 w-3" /> {t('account.add')}
          </button>
        </div>
        <div className="space-y-1.5">
          {(profile?.savedPassengers ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
              <div>
                <p className="font-medium text-slate-700">
                  {p.name} {p.isEmergencyContact && <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-500">{t('account.emergency')}</span>}
                </p>
                <p className="text-slate-400">
                  {p.relationship} · {p.phone}
                </p>
              </div>
              <button onClick={() => profile && removeSavedPassenger(profile.id, p.id)} data-testid="account-remove-passenger" className="text-slate-300 hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {(!profile || profile.savedPassengers.length === 0) && <p className="py-2 text-center text-[11px] text-slate-400">{t('account.noPassengers')}</p>}
        </div>
        {showAddPassenger && (
          <div className="mt-3 space-y-2 rounded-xl border border-dashed border-slate-200 p-3">
            <input value={passengerName} onChange={(e) => setPassengerName(e.target.value)} placeholder={t('account.passengerNamePlaceholder')} data-testid="account-passenger-name-input" className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400" />
            <input value={passengerPhone} onChange={(e) => setPassengerPhone(e.target.value)} placeholder={t('account.passengerPhonePlaceholder')} data-testid="account-passenger-phone-input" className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400" />
            <button
              onClick={() => {
                if (!profile || !passengerName.trim()) return
                addSavedPassenger(profile.id, { name: passengerName.trim(), phone: passengerPhone.trim() || '09XX-XXX-XXX', relationship: t('account.relationshipDefault'), isEmergencyContact: false })
                setPassengerName('')
                setPassengerPhone('')
                setShowAddPassenger(false)
              }}
              data-testid="account-passenger-save"
              className="w-full rounded-lg bg-blue-500 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              disabled={!profile}
            >
              {t('trips.save')}
            </button>
          </div>
        )}
      </div>

      {/* Tokenized payment methods */}
      <div className="rounded-2xl bg-white p-4 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100" data-testid="account-payment-methods">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <CreditCard className="h-3.5 w-3.5" /> {t('account.paymentMethods')}
        </p>
        <div className="space-y-1.5">
          {(profile?.paymentMethods ?? []).map((pm) => (
            <div key={pm.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
              <button onClick={() => profile && setDefaultPaymentMethod(profile.id, pm.id)} data-testid="account-set-default-payment" className="flex items-center gap-2 text-left">
                <span className={clsx('flex h-6 w-9 items-center justify-center rounded-md text-[9px] font-bold text-white', pm.isDefault ? 'bg-blue-500' : 'bg-slate-400')}>{pm.brand.slice(0, 4)}</span>
                <span className="font-medium text-slate-700">
                  •••• {pm.last4} <span className="text-slate-400">{pm.expiry}</span>
                </span>
              </button>
              <div className="flex items-center gap-2">
                {pm.isDefault && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-600">{t('account.default')}</span>}
                <button onClick={() => profile && removePaymentMethod(profile.id, pm.id)} data-testid="account-remove-payment" className="text-slate-300 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {(!profile || profile.paymentMethods.length === 0) && <p className="py-2 text-center text-[11px] text-slate-400">{t('account.noPaymentMethods')}</p>}
        </div>
        <button
          onClick={() => profile && addPaymentMethod(profile.id, { brand: 'LINE Pay', last4: String(Math.floor(1000 + Math.random() * 9000)), expiry: '—', isDefault: false })}
          data-testid="account-add-payment"
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-slate-100 py-1.5 text-[11px] font-semibold text-slate-600"
        >
          <Plus className="h-3 w-3" /> {t('account.addPaymentMethod')}
        </button>
        <p className="mt-2 text-[10px] text-slate-400">{t('account.paymentTokenNote')}</p>
      </div>

      {/* Coupon wallet / promotion history */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-100" data-testid="account-coupon-wallet">
        <button onClick={() => setCouponsOpen((v) => !v)} data-testid="account-coupons-toggle" className="flex w-full items-center justify-between px-4 py-3.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Ticket className="h-4 w-4 text-blue-500" /> {t('account.couponWallet')} <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">{activeCampaigns.length}</span>
          </span>
          <ChevronRight className={clsx('h-4 w-4 text-slate-300 transition', couponsOpen && 'rotate-90')} />
        </button>
        {couponsOpen && (
          <div className="space-y-2 border-t border-slate-100 px-4 py-3">
            {activeCampaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-3 py-2 text-xs">
                <div>
                  <p className="font-mono font-bold text-blue-700">{c.code}</p>
                  <p className="text-slate-500">{lang === 'zh' ? c.nameZh : c.name}</p>
                </div>
                <span className="font-bold text-blue-600">{c.kind === 'PERCENT' ? `${c.value}%` : formatTWD(c.value)}</span>
              </div>
            ))}
            {activeCampaigns.length === 0 && <p className="py-2 text-center text-[11px] text-slate-400">{t('account.noCoupons')}</p>}
          </div>
        )}
      </div>

      {/* Notification preferences */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-100" data-testid="account-notification-prefs">
        <button onClick={() => setNotifOpen((v) => !v)} data-testid="account-notifications-toggle" className="flex w-full items-center justify-between px-4 py-3.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Bell className="h-4 w-4 text-blue-500" /> {t('customer.account.notifications')}
          </span>
          <ChevronRight className={clsx('h-4 w-4 text-slate-300 transition', notifOpen && 'rotate-90')} />
        </button>
        {notifOpen && (
          <div className="space-y-2 border-t border-slate-100 px-4 py-3">
            <NotifToggle icon={<Mail className="h-3.5 w-3.5" />} label={t('account.notifEmail')} checked={profile?.notificationPreference.email ?? true} onChange={(v) => profile && setNotificationPreference(profile.id, 'email', v)} testId="account-notif-email" />
            <NotifToggle icon={<MessageCircle className="h-3.5 w-3.5" />} label={t('account.notifLine')} checked={profile?.notificationPreference.line ?? true} onChange={(v) => profile && setNotificationPreference(profile.id, 'line', v)} testId="account-notif-line" />
            <NotifToggle icon={<Phone className="h-3.5 w-3.5" />} label={t('account.notifSms')} checked={profile?.notificationPreference.sms ?? false} onChange={(v) => profile && setNotificationPreference(profile.id, 'sms', v)} testId="account-notif-sms" />
          </div>
        )}
      </div>

      {/* Privacy center */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-100" data-testid="account-privacy-center">
        <button onClick={() => setPrivacyOpen((v) => !v)} data-testid="account-privacy-toggle" className="flex w-full items-center justify-between px-4 py-3.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-blue-500" /> {t('account.privacyCenter')}
          </span>
          <ChevronRight className={clsx('h-4 w-4 text-slate-300 transition', privacyOpen && 'rotate-90')} />
        </button>
        {privacyOpen && (
          <div className="space-y-3 border-t border-slate-100 px-4 py-3">
            <label className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> {t('account.marketingConsent')}
              </span>
              <input
                type="checkbox"
                checked={profile?.consentMarketing ?? false}
                onChange={(e) => profile && setConsentMarketing(profile.id, e.target.checked)}
                data-testid="account-marketing-consent"
                className="h-4 w-4 accent-blue-500"
              />
            </label>
            <button
              onClick={() => profile && requestPrivacyAction(profile.id, 'DATA_DOWNLOAD')}
              data-testid="account-request-data-download"
              className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
            >
              <span className="flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> {t('account.requestDataDownload')}
              </span>
              {profile?.privacyRequests.some((r) => r.kind === 'DATA_DOWNLOAD') && <span className="text-[10px] font-bold text-emerald-500">{t('account.requested')}</span>}
            </button>
            <button
              onClick={() => profile && requestPrivacyAction(profile.id, 'DELETE_ACCOUNT')}
              data-testid="account-request-delete"
              className="flex w-full items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-500"
            >
              <span className="flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> {t('account.requestDeleteAccount')}
              </span>
              {profile?.privacyRequests.some((r) => r.kind === 'DELETE_ACCOUNT') && <span className="text-[10px] font-bold text-red-500">{t('account.requested')}</span>}
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
        <p className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('customer.account.settings')}</p>
        <SettingsRow
          icon={<Globe2 className="h-4 w-4" />}
          label={t('customer.account.language')}
          hint={
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5" data-testid="customer-language-switcher">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLang(l.code)
                  }}
                  data-testid={`customer-lang-${l.code}`}
                  className={clsx(
                    'rounded-md px-2 py-1 text-[11px] font-semibold transition',
                    lang === l.code ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          }
          noChevron
        />
        <SettingsRow icon={<Share2 className="h-4 w-4" />} label={t('customer.account.shareApp')} />
        <SettingsRow icon={<HelpCircle className="h-4 w-4" />} label={t('customer.account.support')} last />
      </div>

      {/* Passenger guidelines (乘客須知) & company info (公司簡介) — light,
          prototype-grade informational panels, not the focus of this round. */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-100" data-testid="account-passenger-guidelines">
        <button onClick={() => setGuidelinesOpen((v) => !v)} data-testid="account-guidelines-toggle" className="flex w-full items-center justify-between px-4 py-3.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <FileSearch className="h-4 w-4 text-blue-500" /> {t('account.passengerGuidelines')}
          </span>
          <ChevronRight className={clsx('h-4 w-4 text-slate-300 transition', guidelinesOpen && 'rotate-90')} />
        </button>
        {guidelinesOpen && (
          <ul className="space-y-1.5 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
            <li>• {t('account.guideline1')}</li>
            <li>• {t('account.guideline2')}</li>
            <li>• {t('account.guideline3')}</li>
            <li>• {t('account.guideline4')}</li>
            <li>• {t('account.guideline5')}</li>
          </ul>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-100" data-testid="account-company-info">
        <button onClick={() => setCompanyInfoOpen((v) => !v)} data-testid="account-company-info-toggle" className="flex w-full items-center justify-between px-4 py-3.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Building2 className="h-4 w-4 text-blue-500" /> {t('account.companyInfo')}
          </span>
          <ChevronRight className={clsx('h-4 w-4 text-slate-300 transition', companyInfoOpen && 'rotate-90')} />
        </button>
        {companyInfoOpen && (
          <div className="space-y-1.5 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
            <p>{t('account.companyDesc')}</p>
            <p className="text-slate-400">{t('account.companyRegNo')}</p>
            <p className="text-slate-400">{t('account.companyContact')}</p>
          </div>
        )}
      </div>

      <button
        onClick={logout}
        data-testid="customer-account-logout"
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-semibold text-red-500 shadow-sm ring-1 ring-slate-100 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" /> {t('customer.account.logout')}
      </button>

      <div className="rounded-2xl bg-white p-4 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> {t('customer.account.demoSwitch')}
        </p>
        <p className="mb-2 text-[11px] text-slate-500">{t('customer.account.demoSwitchHint')}</p>
        <select
          value={fallbackOrder.id}
          onChange={(e) => onSelectOrder(e.target.value)}
          data-testid="customer-account-order-select"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {sortedOrders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNo} · {o.customer.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function NotifToggle({ icon, label, checked, onChange, testId }: { icon: ReactNode; label: string; checked: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <label className="flex items-center justify-between text-xs text-slate-600">
      <span className="flex items-center gap-1.5">
        {icon} {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        data-testid={testId}
        className={clsx('relative h-5 w-9 rounded-full transition', checked ? 'bg-blue-500' : 'bg-slate-200')}
      >
        <span className={clsx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition', checked ? 'left-4' : 'left-0.5')} />
      </button>
    </label>
  )
}

function SettingsRow({
  icon,
  label,
  hint,
  last = false,
  noChevron = false,
}: {
  icon: ReactNode
  label: string
  hint?: ReactNode
  last?: boolean
  noChevron?: boolean
}) {
  return (
    <div className={clsx('flex items-center gap-3 px-4 py-3.5', !last && 'border-b border-slate-100')}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">{icon}</span>
      <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
      {typeof hint === 'string' ? <span className="text-xs text-slate-400">{hint}</span> : hint}
      {!noChevron && <ChevronRight className="h-4 w-4 text-slate-300" />}
    </div>
  )
}
