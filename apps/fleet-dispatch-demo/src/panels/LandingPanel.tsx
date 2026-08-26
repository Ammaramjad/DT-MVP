import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Car,
  Gauge,
  Lock,
  MapPinned,
  Radar,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Users2,
  Zap,
} from 'lucide-react'
import { Hero3D } from '../components/three/Hero3D'
import { Badge } from '../components/ui/Badge'
import { useFleetStore } from '../store/useFleetStore'
import { computeKpis } from '../lib/selectors'
import { StatCounter } from '../components/ui/StatCounter'
import { useLang } from '../i18n'

const PHASE1_KEYS = [
  'landing.module.crossPlatform',
  'landing.module.analytics',
  'landing.module.addressMap',
  'landing.module.driverPlatform',
  'landing.module.controlDashboard',
  'landing.module.driverInterface',
  'landing.module.orderClassification',
  'landing.module.flightApi',
]

const PHASE2_KEYS = [
  'landing.module.centralDispatch',
  'landing.module.permissions',
  'landing.module.docReview',
  'landing.module.autoDispatch',
  'landing.module.emergencyDispatch',
  'landing.module.liveLocation',
  'landing.module.fleetMap',
  'landing.module.routeCost',
  'landing.module.lineNotif',
  'landing.module.touchDispatch',
]

export default function LandingPanel() {
  const { t } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const kpis = computeKpis(orders, drivers)

  return (
    <div className="relative min-h-screen overflow-hidden bg-mission-950 bg-noise text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-32 pt-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            走瘋派車 <span className="text-slate-500">Fleet Dispatch</span>
          </div>
          <Badge tone="cyan">{t('landing.badgeLive')}</Badge>
        </motion.div>

        <div className="mt-6 grid flex-1 grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-gradient-neon">走瘋派車</span>
              <br />
              <span className="shimmer-text">{t('landing.title2')}</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-300 sm:text-lg">{t('landing.heroDesc')}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/booking"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-cyan-500/45"
              >
                {t('landing.startDemo')} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/control"
                className="inline-flex items-center gap-2 rounded-xl bg-white/8 px-5 py-3 text-sm font-semibold text-slate-100 ring-1 ring-white/15 transition hover:bg-white/14"
              >
                {t('landing.jumpControl')}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              <Badge tone="lime">{t('landing.phase1Badge')}</Badge>
              <Badge tone="purple">{t('landing.phase2Badge')}</Badge>
              <Badge tone="slate">
                <Rocket className="h-3 w-3" /> {t('landing.phase3Badge')}
              </Badge>
            </div>

            {/* Live simulation pulse strip — a small, premium-feeling proof that the
                three apps below all really do share one live simulated state. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3.5"
            >
              <LiveStat icon={<Gauge className="h-3.5 w-3.5 text-cyan-300" />} value={kpis.activeOrders} label={t('landing.liveStat.activeOrders')} />
              <span className="h-6 w-px bg-white/10" />
              <LiveStat icon={<Users2 className="h-3.5 w-3.5 text-purple-300" />} value={kpis.availableDrivers} label={t('landing.liveStat.availableDrivers')} />
              <span className="hidden h-6 w-px bg-white/10 sm:block" />
              <span className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex">
                <Zap className="h-3.5 w-3.5 text-amber-300" /> {t('landing.liveStat.sharedState')}
              </span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative h-[320px] sm:h-[420px] lg:h-[480px]"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 blur-2xl" />
            <Hero3D className="h-full w-full" />
          </motion.div>
        </div>

        {/* ---- The three standalone apps ---- */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-14">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('landing.threeApps.kicker')}</p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{t('landing.threeApps.title')}</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">{t('landing.threeApps.desc')}</p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <AppShowcaseCard
              to="/control"
              tone="admin"
              badgeIcon={<Lock className="h-3 w-3" />}
              badgeLabel={t('landing.app.admin.badge')}
              icon={<Radar className="h-6 w-6" />}
              title={t('landing.app.admin.title')}
              zh={t('landing.app.admin.zh')}
              desc={t('landing.app.admin.desc')}
              cta={t('landing.app.admin.cta')}
              bullets={[t('landing.app.admin.bullet1'), t('landing.app.admin.bullet2'), t('landing.app.admin.bullet3')]}
              mock={<AdminMock />}
            />
            <AppShowcaseCard
              to="/driver"
              tone="driver"
              badgeIcon={<Smartphone className="h-3 w-3" />}
              badgeLabel={t('landing.app.driver.badge')}
              icon={<Car className="h-6 w-6" />}
              title={t('landing.app.driver.title')}
              zh={t('landing.app.driver.zh')}
              desc={t('landing.app.driver.desc')}
              cta={t('landing.app.driver.cta')}
              bullets={[t('landing.app.driver.bullet1'), t('landing.app.driver.bullet2'), t('landing.app.driver.bullet3')]}
              mock={<DriverMock />}
            />
            <AppShowcaseCard
              to="/customer"
              tone="customer"
              badgeIcon={<Smartphone className="h-3 w-3" />}
              badgeLabel={t('landing.app.customer.badge')}
              icon={<MapPinned className="h-6 w-6" />}
              title={t('landing.app.customer.title')}
              zh={t('landing.app.customer.zh')}
              desc={t('landing.app.customer.desc')}
              cta={t('landing.app.customer.cta')}
              bullets={[t('landing.app.customer.bullet1'), t('landing.app.customer.bullet2'), t('landing.app.customer.bullet3')]}
              mock={<CustomerMock />}
            />
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-slate-500">{t('landing.threeApps.sharedNote')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{t('landing.phase1Title')}</p>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-slate-400 sm:grid-cols-2">
              {PHASE1_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-cyan-400" /> {t(key)}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">{t('landing.phase2Title')}</p>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-slate-400 sm:grid-cols-2">
              {PHASE2_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-purple-400" /> {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function LiveStat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <span className="flex items-center gap-2 text-xs">
      {icon}
      <span className="text-base font-bold text-white">
        <StatCounter value={value} />
      </span>
      <span className="text-slate-400">{label}</span>
    </span>
  )
}

const TONE_STYLES: Record<'admin' | 'driver' | 'customer', { ring: string; glow: string; iconBg: string; badgeTone: 'cyan' | 'amber' | 'pink' }> = {
  admin: { ring: 'hover:ring-cyan-400/40', glow: 'from-cyan-500/15', iconBg: 'bg-cyan-400/15 text-cyan-300', badgeTone: 'cyan' },
  driver: { ring: 'hover:ring-amber-400/40', glow: 'from-amber-500/15', iconBg: 'bg-amber-400/15 text-amber-300', badgeTone: 'amber' },
  customer: { ring: 'hover:ring-pink-400/40', glow: 'from-pink-500/15', iconBg: 'bg-pink-400/15 text-pink-300', badgeTone: 'pink' },
}

function AppShowcaseCard({
  to,
  tone,
  badgeIcon,
  badgeLabel,
  icon,
  title,
  zh,
  desc,
  cta,
  bullets,
  mock,
}: {
  to: string
  tone: 'admin' | 'driver' | 'customer'
  badgeIcon: ReactNode
  badgeLabel: string
  icon: ReactNode
  title: string
  zh: string
  desc: string
  cta: string
  bullets: string[]
  mock: ReactNode
}) {
  const style = TONE_STYLES[tone]
  return (
    <motion.div whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 280 }} className="h-full">
      <Link
        to={to}
        data-testid={`landing-app-card-${tone}`}
        className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b ${style.glow} to-transparent p-5 ring-1 ring-white/5 transition ${style.ring}`}
      >
        <div className="flex items-center justify-between">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${style.iconBg}`}>{icon}</div>
          <Badge tone={style.badgeTone}>
            {badgeIcon} {badgeLabel}
          </Badge>
        </div>

        <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
        <p className="text-xs text-slate-500">{zh}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>

        <div className="mt-4 flex justify-center">{mock}</div>

        <ul className="mt-4 space-y-1.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" /> {b}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-white">
          {cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </div>
      </Link>
    </motion.div>
  )
}

// ---- Tiny CSS-only "phone mockup" previews for each app card — deliberately
// abstract (not literal screenshots) so they stay crisp at any size and need
// no extra generated image assets. ----

function PhoneFrame({ children, dark = true }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className={`relative h-40 w-24 rounded-[16px] border-2 p-1.5 shadow-lg ${dark ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-white'}`}>
      <div className="absolute left-1/2 top-1 h-1 w-6 -translate-x-1/2 rounded-full bg-black/40" />
      <div className="flex h-full w-full flex-col gap-1 overflow-hidden rounded-[10px]">{children}</div>
    </div>
  )
}

function AdminMock() {
  return (
    <div className="flex w-full max-w-[220px] flex-col gap-1.5 rounded-xl border border-white/10 bg-slate-950/60 p-2.5">
      <div className="flex gap-1">
        <div className="h-6 flex-1 rounded bg-cyan-400/20" />
        <div className="h-6 flex-1 rounded bg-purple-400/20" />
        <div className="h-6 flex-1 rounded bg-amber-400/20" />
      </div>
      <div className="h-10 rounded bg-white/5" />
      <div className="flex gap-1">
        <div className="h-1.5 w-1/3 rounded-full bg-cyan-400/50" />
        <div className="h-1.5 w-1/4 rounded-full bg-white/10" />
      </div>
    </div>
  )
}

function DriverMock() {
  return (
    <PhoneFrame>
      <div className="flex items-center justify-between rounded-md bg-emerald-400/15 px-1.5 py-1 text-[6px] font-bold text-emerald-300">
        <span>● ONLINE</span>
      </div>
      <div className="mt-0.5 flex-1 rounded-md bg-amber-400/10 p-1">
        <div className="h-1 w-8 rounded bg-amber-300/60" />
        <div className="mt-1 h-1 w-6 rounded bg-white/20" />
      </div>
      <div className="h-4 rounded-md bg-cyan-400/70" />
    </PhoneFrame>
  )
}

function CustomerMock() {
  return (
    <PhoneFrame dark={false}>
      <div className="flex-1 rounded-md bg-blue-50 p-1">
        <div className="h-6 rounded bg-blue-200/70" />
        <div className="mt-1 flex items-center gap-1">
          <Star className="h-2 w-2 fill-amber-400 text-amber-400" />
          <div className="h-1 w-8 rounded bg-slate-300" />
        </div>
      </div>
      <div className="h-4 rounded-md bg-blue-500" />
    </PhoneFrame>
  )
}
