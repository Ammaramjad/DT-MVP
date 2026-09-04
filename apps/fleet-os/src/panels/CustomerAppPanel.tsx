import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Car, Sparkles } from 'lucide-react'
import { useFleetStore } from '../store/useFleetStore'
import { CustomerTabBar, type CustomerTab } from '../components/customer/CustomerTabBar'
import { HomeScreen } from '../components/customer/HomeScreen'
import { TripsScreen } from '../components/customer/TripsScreen'
import { SafetyScreen } from '../components/customer/SafetyScreen'
import { AccountScreen } from '../components/customer/AccountScreen'
import { CustomerAiConciergeDrawer } from '../components/customer/CustomerAiConciergeDrawer'
import { SessionHeaderIndicator } from '../components/security/SessionHeaderIndicator'
import { useLang } from '../i18n'

const ACTIVE_STATUSES = ['CONFIRMED', 'DRIVER_MATCHING', 'ASSIGNED', 'DRIVER_EN_ROUTE', 'ARRIVED', 'PASSENGER_ONBOARD']

export default function CustomerAppPanel() {
  const { t } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const drivers = useFleetStore((s) => s.drivers)
  const vehicles = useFleetStore((s) => s.vehicles)
  const customerProfiles = useFleetStore((s) => s.customerProfiles)
  const focusOrderId = useFleetStore((s) => s.focusOrderId)
  const setFocusOrder = useFleetStore((s) => s.setFocusOrder)
  const [tab, setTab] = useState<CustomerTab>('HOME')

  const sortedOrders = useMemo(() => [...orders].sort((a, b) => b.createdAt - a.createdAt), [orders])
  const selectedId = focusOrderId ?? sortedOrders[0]?.id ?? null
  const order = orders.find((o) => o.id === selectedId) ?? sortedOrders[0]

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712] text-slate-400">
        {t('customer.noOrders')}
      </div>
    )
  }

  const driver = drivers.find((d) => d.id === order.driverId)
  const vehicle = vehicles.find((v) => v.id === order.vehicleId)

  const customerProfile =
    customerProfiles.find((p) => p.phone === order.customer.phone) ?? customerProfiles.find((p) => p.name === order.customer.name) ?? null
  const customerLiveOrders = orders.filter((o) => o.customer.phone === order.customer.phone || o.customer.name === order.customer.name)

  const completedEntries = [
    ...customerLiveOrders.filter((o) => o.status === 'COMPLETED'),
    ...(customerProfile?.historicalOrders ?? []).filter((h) => h.status === 'COMPLETED'),
  ]
  const totalTrips = completedEntries.length
  const totalSpent = completedEntries.reduce((sum, o) => sum + o.priceEstimate, 0)

  const activeOrder = ACTIVE_STATUSES.includes(order.status) ? order : null

  return (
    <div className="min-h-screen bg-[#030712] bg-noise pb-28 text-white" data-testid="customer-app-shell">
      {/* Sleek Obsidian Glass Customer App Header */}
      <div className="sticky top-0 z-[700] border-b border-white/10 bg-slate-950/80 px-4 py-3.5 backdrop-blur-2xl shadow-xl" data-testid="customer-app-header">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/25">
              <Car className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-black leading-tight text-white tracking-wide">{t('common.brand')}</p>
              <p className="text-[10px] font-semibold text-cyan-300">{t('nav.customer')} · VIP Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SessionHeaderIndicator compact />
            <span className="hidden sm:flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-2.5 py-0.5 text-[10.5px] font-bold text-cyan-300">
              <Sparkles className="h-3 w-3" /> Live
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'HOME' && (
          <motion.div key="home" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-5">
            <HomeScreen customerName={order.customer.name.split(' ')[0]} activeOrder={activeOrder} onViewActive={() => setTab('TRIPS')} />
          </motion.div>
        )}

        {tab === 'TRIPS' && (
          <motion.div key="trips" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-5">
            <TripsScreen
              order={order}
              orders={sortedOrders}
              onSelectOrder={setFocusOrder}
              driver={driver}
              vehicle={vehicle}
              vehicles={vehicles}
              profile={customerProfile}
              liveOrders={customerLiveOrders}
              onGoToSafety={() => setTab('SAFETY')}
            />
          </motion.div>
        )}

        {tab === 'SAFETY' && (
          <motion.div key="safety" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-5">
            <SafetyScreen order={activeOrder ?? order} />
          </motion.div>
        )}

        {tab === 'ACCOUNT' && (
          <motion.div key="account" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-5">
            <AccountScreen
              profile={customerProfile}
              fallbackOrder={order}
              totalTrips={totalTrips}
              totalSpent={totalSpent}
              orders={sortedOrders}
              onSelectOrder={setFocusOrder}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <CustomerTabBar active={tab} onChange={setTab} />
      <CustomerAiConciergeDrawer />
    </div>
  )
}
