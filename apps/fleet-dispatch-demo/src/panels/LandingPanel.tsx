import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ClipboardList, Radar, Car, MapPinned, ArrowRight, Sparkles, Rocket } from 'lucide-react'
import { Hero3D } from '../components/three/Hero3D'
import { Badge } from '../components/ui/Badge'

const PANELS = [
  {
    to: '/booking',
    icon: ClipboardList,
    title: 'Customer Booking',
    zh: '客戶預訂',
    desc: 'Polished booking flow with live flight lookup, auto order-type classification, and instant fare estimate.',
    tone: 'cyan' as const,
  },
  {
    to: '/control',
    icon: Radar,
    title: 'Central Control System',
    zh: '中央調度系統',
    desc: 'Mission-control dispatch center — live fleet map, order queue, KPIs, and one-click auto-dispatch.',
    tone: 'purple' as const,
  },
  {
    to: '/driver',
    icon: Car,
    title: 'Driver App',
    zh: '司機端',
    desc: 'Mobile-styled job card with live GPS navigation and a simple start → arrived → picked up → complete flow.',
    tone: 'amber' as const,
  },
  {
    to: '/customer',
    icon: MapPinned,
    title: 'Customer Live Tracking',
    zh: '即時追蹤',
    desc: 'Uber-style tracking page showing the assigned driver, live ETA, and a moving map marker.',
    tone: 'pink' as const,
  },
]

const PHASE1 = [
  'Cross-platform order aggregation',
  'Data analytics dashboards',
  'Address map + translation',
  'Driver integration platform',
  'Control dashboard + auto-forms',
  'Driver interface',
  'Order classification (3 types)',
  'Flight-time API integration',
]

const PHASE2 = [
  'Central dispatch platform',
  'User permission roles',
  'Driver document auto-review',
  'Automatic dispatch engine',
  'Emergency / temp dispatch',
  'Customer live-location system',
  'Fleet map monitoring',
  'Route cost logic',
  'LINE@ notifications',
  'Touch-map drag dispatch',
]

export default function LandingPanel() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-mission-950 bg-noise text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-28 pt-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            走瘋派車 <span className="text-slate-500">Fleet Dispatch</span>
          </div>
          <Badge tone="cyan">Live Interactive Prototype</Badge>
        </motion.div>

        <div className="mt-6 grid flex-1 grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-gradient-neon">走瘋派車</span>
              <br />
              <span className="shimmer-text">Fleet Dispatch</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
              A live, end-to-end prototype of the airport-transfer &amp; fleet dispatch platform — from customer
              booking to central dispatch, driver execution, and real-time customer tracking. Every panel shares one
              simulated live state, so an order created here really does flow through the whole system.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/booking"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:shadow-cyan-500/45"
              >
                Start the Live Demo <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/control"
                className="inline-flex items-center gap-2 rounded-xl bg-white/8 px-5 py-3 text-sm font-semibold text-slate-100 ring-1 ring-white/15 transition hover:bg-white/14"
              >
                Jump to Control Center
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              <Badge tone="lime">Phase 1 · 8 modules demoed</Badge>
              <Badge tone="purple">Phase 2 · 10 modules demoed</Badge>
              <Badge tone="slate">
                <Rocket className="h-3 w-3" /> Phase 3 roadmap: payments &amp; app store — coming soon
              </Badge>
            </div>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PANELS.map((p, i) => (
            <motion.div key={p.to} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
              <Link
                to={p.to}
                className="glass-panel group block h-full rounded-2xl p-5 transition hover:ring-1 hover:ring-cyan-400/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 text-cyan-300">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono text-slate-500">0{i + 1}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">{p.title}</h3>
                <p className="text-xs text-slate-500">{p.zh}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{p.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-cyan-300 opacity-0 transition group-hover:opacity-100">
                  Enter panel <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Phase 1 · Foundation</p>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-slate-400 sm:grid-cols-2">
              {PHASE1.map((m) => (
                <li key={m} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-cyan-400" /> {m}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">Phase 2 · Automation</p>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-slate-400 sm:grid-cols-2">
              {PHASE2.map((m) => (
                <li key={m} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-purple-400" /> {m}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
