import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Car,
  ChevronRight,
  Cpu,
  Gauge,
  Globe2,
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
    <div className="relative min-h-screen overflow-hidden bg-[#030712] bg-noise text-white">
      {/* Ambient glowing radial backdrop elements */}
      <div className="pointer-events-none absolute -top-40 -left-20 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-cyan-500/15 via-indigo-600/10 to-transparent blur-3xl animate-glow-mesh" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-purple-600/15 via-pink-600/10 to-transparent blur-3xl animate-glow-mesh" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-emerald-500/12 via-cyan-600/8 to-transparent blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-32 pt-8 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between border-b border-white/5 pb-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white">走瘋派車</span>
              <span className="ml-1.5 text-xs font-semibold text-slate-400 tracking-wider">FLEET OS 2026</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              {t('landing.badgeLive')}
            </span>
          </div>
        </motion.div>

        <div className="mt-8 grid flex-1 grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-semibold text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)] backdrop-blur-md">
              <Cpu className="h-3.5 w-3.5 text-cyan-300" />
              <span>Next-Gen Autonomous Mobility Operating System</span>
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-gradient-neon">走瘋派車</span>
              <br />
              <span className="shimmer-text">{t('landing.title2')}</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">{t('landing.heroDesc')}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                to="/booking"
                className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-cyan-500/30 transition hover:shadow-cyan-500/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                {t('landing.startDemo')} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link
                to="/fleet-os"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-slate-100 shadow-lg backdrop-blur-md transition hover:bg-white/10 hover:border-white/25"
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

            {/* Live simulation pulse strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-panel mt-8 flex flex-wrap items-center gap-6 rounded-2xl p-4"
            >
              <LiveStat icon={<Gauge className="h-4 w-4 text-cyan-300" />} value={kpis.activeOrders} label={t('landing.liveStat.activeOrders')} />
              <span className="h-6 w-px bg-white/10" />
              <LiveStat icon={<Users2 className="h-4 w-4 text-purple-300" />} value={kpis.availableDrivers} label={t('landing.liveStat.availableDrivers')} />
              <span className="hidden h-6 w-px bg-white/10 sm:block" />
              <span className="hidden items-center gap-1.5 text-xs font-semibold text-amber-300 sm:flex">
                <Zap className="h-3.5 w-3.5 fill-amber-300" /> {t('landing.liveStat.sharedState')}
              </span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative h-[340px] sm:h-[440px] lg:h-[500px]"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-transparent to-purple-600/20 blur-3xl pointer-events-none" />
            <Hero3D className="h-full w-full" />
          </motion.div>
        </div>

        {/* ---- The four core standalone surfaces ---- */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-20">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">{t('landing.threeApps.kicker')}</p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-4xl">{t('landing.threeApps.title')}</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400 leading-relaxed">{t('landing.threeApps.desc')}</p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <AppShowcaseCard
              to="/marketplace"
              tone="marketplace"
              badgeIcon={<Globe2 className="h-3 w-3" />}
              badgeLabel={t('landing.app.marketplace.badge')}
              icon={<Globe2 className="h-6 w-6" />}
              title={t('landing.app.marketplace.title')}
              zh={t('landing.app.marketplace.zh')}
              desc={t('landing.app.marketplace.desc')}
              cta={t('landing.app.marketplace.cta')}
              bullets={[t('landing.app.marketplace.bullet1'), t('landing.app.marketplace.bullet2'), t('landing.app.marketplace.bullet3')]}
              mock={<MarketplaceMock />}
            />
            <AppShowcaseCard
              to="/fleet-os"
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

          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-slate-500">{t('landing.threeApps.sharedNote')}</p>
        </motion.div>

        {/* Phase Features Overview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2"
        >
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">{t('landing.phase1Title')}</p>
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-2">
              {PHASE1_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-2 rounded-lg bg-white/[0.02] p-2">
                  <ChevronRight className="h-3.5 w-3.5 text-cyan-400 shrink-0" /> {t(key)}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-purple-300">{t('landing.phase2Title')}</p>
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-2">
              {PHASE2_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-2 rounded-lg bg-white/[0.02] p-2">
                  <ChevronRight className="h-3.5 w-3.5 text-purple-400 shrink-0" /> {t(key)}
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
    <span className="flex items-center gap-2.5 text-xs">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">{icon}</span>
      <div>
        <span className="block text-lg font-black text-white leading-none">
          <StatCounter value={value} />
        </span>
        <span className="text-[11px] text-slate-400">{label}</span>
      </div>
    </span>
  )
}

const TONE_STYLES: Record<
  'admin' | 'driver' | 'customer' | 'marketplace',
  { ring: string; glow: string; iconBg: string; badgeTone: 'cyan' | 'amber' | 'pink' | 'purple' }
> = {
  marketplace: { ring: 'hover:ring-purple-400/50 hover:shadow-purple-500/20', glow: 'from-purple-500/20 via-slate-950/60 to-slate-950/90', iconBg: 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-400/30', badgeTone: 'purple' },
  admin: { ring: 'hover:ring-cyan-400/50 hover:shadow-cyan-500/20', glow: 'from-cyan-500/20 via-slate-950/60 to-slate-950/90', iconBg: 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30', badgeTone: 'cyan' },
  driver: { ring: 'hover:ring-amber-400/50 hover:shadow-amber-500/20', glow: 'from-amber-500/20 via-slate-950/60 to-slate-950/90', iconBg: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30', badgeTone: 'amber' },
  customer: { ring: 'hover:ring-pink-400/50 hover:shadow-pink-500/20', glow: 'from-pink-500/20 via-slate-950/60 to-slate-950/90', iconBg: 'bg-pink-500/20 text-pink-300 ring-1 ring-pink-400/30', badgeTone: 'pink' },
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
  tone: 'admin' | 'driver' | 'customer' | 'marketplace'
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
    <motion.div whileHover={{ y: -6, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="h-full">
      <Link
        to={to}
        data-testid={`landing-app-card-${tone}`}
        className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b ${style.glow} p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/5 transition duration-300 ${style.ring}`}
      >
        <div className="flex items-center justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${style.iconBg}`}>{icon}</div>
          <Badge tone={style.badgeTone}>
            {badgeIcon} {badgeLabel}
          </Badge>
        </div>

        <h3 className="mt-5 text-xl font-bold text-white">{title}</h3>
        <p className="text-xs font-semibold text-cyan-300/80">{zh}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{desc}</p>

        <div className="mt-5 flex justify-center py-2">{mock}</div>

        <ul className="mt-4 space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-xs text-slate-300">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" /> {b}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs font-bold text-white">
          <span>{cta}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-cyan-400 group-hover:text-slate-950">
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

function PhoneFrame({ children, dark = true }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className={`relative h-44 w-28 rounded-[20px] border-2 p-1.5 shadow-2xl ${dark ? 'border-slate-700 bg-slate-950 shadow-cyan-950/30' : 'border-slate-300 bg-white'}`}>
      <div className="absolute left-1/2 top-1.5 h-1 w-7 -translate-x-1/2 rounded-full bg-slate-600/60" />
      <div className="flex h-full w-full flex-col gap-1.5 overflow-hidden rounded-[14px] pt-1">{children}</div>
    </div>
  )
}

function MarketplaceMock() {
  return (
    <div className="flex w-full max-w-[220px] flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-3 shadow-inner">
      <div className="flex gap-1.5">
        <div className="h-4 w-12 rounded-full bg-purple-500/30 ring-1 ring-purple-400/40" />
        <div className="h-4 w-10 rounded-full bg-white/10" />
        <div className="h-4 w-10 rounded-full bg-white/10" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-10 flex-1 rounded-xl bg-white/[0.06] border border-white/5 p-1 flex flex-col justify-between">
          <div className="h-1.5 w-8 rounded bg-purple-300/60" />
          <div className="h-2 w-6 rounded bg-emerald-400/70" />
        </div>
        <div className="h-10 flex-1 rounded-xl bg-white/[0.06] border border-white/5 p-1 flex flex-col justify-between">
          <div className="h-1.5 w-8 rounded bg-cyan-300/60" />
          <div className="h-2 w-6 rounded bg-emerald-400/70" />
        </div>
      </div>
      <div className="h-1.5 w-3/4 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
    </div>
  )
}

function AdminMock() {
  return (
    <div className="flex w-full max-w-[220px] flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-3 shadow-inner">
      <div className="flex gap-1.5">
        <div className="h-6 flex-1 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
          <div className="h-2 w-5 rounded-full bg-cyan-300/70" />
        </div>
        <div className="h-6 flex-1 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
          <div className="h-2 w-5 rounded-full bg-purple-300/70" />
        </div>
        <div className="h-6 flex-1 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
          <div className="h-2 w-5 rounded-full bg-amber-300/70" />
        </div>
      </div>
      <div className="h-10 rounded-xl bg-white/[0.05] border border-white/5 p-1.5 relative overflow-hidden">
        <div className="absolute inset-x-2 top-2 h-1 rounded-full bg-cyan-400/40" />
        <div className="absolute inset-x-4 top-5 h-1 rounded-full bg-indigo-400/30" />
      </div>
    </div>
  )
}

function DriverMock() {
  return (
    <PhoneFrame>
      <div className="flex items-center justify-between rounded-lg bg-emerald-500/20 border border-emerald-400/40 px-2 py-1 text-[7px] font-black text-emerald-300">
        <span>● HUD ONLINE</span>
      </div>
      <div className="flex-1 rounded-lg bg-slate-900/80 border border-white/5 p-1.5 flex flex-col justify-between">
        <div className="h-1.5 w-12 rounded bg-amber-400/80" />
        <div className="h-4 rounded bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
          <span className="text-[6px] font-bold text-cyan-300">ACCEPT</span>
        </div>
      </div>
    </PhoneFrame>
  )
}

function CustomerMock() {
  return (
    <PhoneFrame dark={true}>
      <div className="flex-1 rounded-lg bg-slate-900/80 border border-white/5 p-1.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="h-1.5 w-8 rounded bg-cyan-300/80" />
          <Star className="h-2 w-2 fill-amber-400 text-amber-400" />
        </div>
        <div className="h-6 rounded-md bg-gradient-to-r from-blue-600/40 to-cyan-500/40 border border-cyan-400/20" />
        <div className="h-3.5 rounded bg-blue-500 flex items-center justify-center">
          <span className="text-[6px] font-bold text-white">BOOK NOW</span>
        </div>
      </div>
    </PhoneFrame>
  )
}
