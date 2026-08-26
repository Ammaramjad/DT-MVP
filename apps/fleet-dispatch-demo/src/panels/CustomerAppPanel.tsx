import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Car } from 'lucide-react'
import { useFleetStore } from '../store/useFleetStore'
import { CustomerTabBar, type CustomerTab } from '../components/customer/CustomerTabBar'
import { HomeScreen } from '../components/customer/HomeScreen'
import { ActivityScreen } from '../components/customer/ActivityScreen'
import { AccountScreen } from '../components/customer/AccountScreen'
import { useLang } from '../i18n'

const ACTIVE_STATUSES = ['NEW', 'PENDING_DRIVER_RESPONSE', 'ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT']

/**
 * The standalone Customer App shell — bright, friendly, consumer-grade, and
 * deliberately distinct from the Admin Console's dark mission-control theme
 * and the Driver App's cyan/amber palette. IA (Home / Activity / Account tab
 * bar) follows the pattern used by real Taiwan ride-hailing apps such as
 * 55688 Taiwan Taxi and Uber Taiwan: a map/search-led home screen, a
 * dedicated trip/activity feed for live tracking + history, and a simple
 * account area — rather than reading as a view inside the ops backend.
 */
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 via-white to-white text-slate-500">
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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white pb-24 text-slate-900" data-testid="customer-app-shell">
      <div className="sticky top-0 z-[700] border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur-xl" data-testid="customer-app-header">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 text-white">
              <Car className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-slate-900">{t('common.brand')}</p>
              <p className="text-[10px] text-slate-400">{t('nav.customer')}</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'HOME' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5">
            <HomeScreen customerName={order.customer.name.split(' ')[0]} activeOrder={activeOrder} onViewActive={() => setTab('ACTIVITY')} />
          </motion.div>
        )}

        {tab === 'ACTIVITY' && (
          <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5">
            <ActivityScreen
              order={order}
              orders={sortedOrders}
              onSelectOrder={setFocusOrder}
              driver={driver}
              vehicle={vehicle}
              profile={customerProfile}
              liveOrders={customerLiveOrders}
            />
          </motion.div>
        )}

        {tab === 'ACCOUNT' && (
          <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5">
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
    </div>
  )
}
