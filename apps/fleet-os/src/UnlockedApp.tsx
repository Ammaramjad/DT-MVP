import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useSimulationTicker } from './hooks/useSimulationTicker'
import { useRealRouteHydration } from './hooks/useRealRouteHydration'
import { useLivePresenceTracker } from './lib/livePresence'
import { NotificationToaster } from './components/ui/NotificationToaster'
import { DemoModeSwitcher } from './components/layout/DemoModeSwitcher'
import { DemoTourDock } from './components/layout/DemoTourDock'

const LandingPanel = lazy(() => import('./panels/LandingPanel'))
const BookingPanel = lazy(() => import('./panels/BookingPanel'))
const ControlCenterPanel = lazy(() => import('./panels/ControlCenterPanel'))
const DriverPanel = lazy(() => import('./panels/DriverPanel'))
const CustomerAppPanel = lazy(() => import('./panels/CustomerAppPanel'))
const MarketplacePanel = lazy(() => import('./panels/MarketplacePanel'))
const SuppliersPanel = lazy(() => import('./panels/fleetos/SuppliersPanel'))
const CatalogPanel = lazy(() => import('./panels/fleetos/CatalogPanel'))
const CampaignsPanel = lazy(() => import('./panels/fleetos/CampaignsPanel'))
const SupportPanel = lazy(() => import('./panels/fleetos/SupportPanel'))
const RefundsPanel = lazy(() => import('./panels/fleetos/RefundsPanel'))
const RosterPanel = lazy(() => import('./panels/fleetos/RosterPanel'))
const CompliancePanel = lazy(() => import('./panels/fleetos/CompliancePanel'))
const FinancePanel = lazy(() => import('./panels/fleetos/FinancePanel'))
const ReportsPanel = lazy(() => import('./panels/fleetos/ReportsPanel'))
const AdminPanel = lazy(() => import('./panels/fleetos/AdminPanel'))
const PricingDynamicPanel = lazy(() => import('./panels/fleetos/PricingDynamicPanel'))
const VehicleInventoryPanel = lazy(() => import('./panels/fleetos/VehicleInventoryPanel'))
const ManualOrderPanel = lazy(() => import('./panels/fleetos/ManualOrderPanel'))
const TranslationQaPanel = lazy(() => import('./panels/fleetos/TranslationQaPanel'))
const FlightBoardPanel = lazy(() => import('./panels/fleetos/FlightBoardPanel'))
const AccountsPanel = lazy(() => import('./panels/fleetos/AccountsPanel'))
const OperatingParametersPanel = lazy(() => import('./panels/fleetos/OperatingParametersPanel'))
const AccessLogsPanel = lazy(() => import('./panels/fleetos/AccessLogsPanel'))
const ForecastPanel = lazy(() => import('./panels/fleetos/ForecastPanel'))
const InvoicesPanel = lazy(() => import('./panels/fleetos/InvoicesPanel'))
const CorporatePanel = lazy(() => import('./panels/fleetos/CorporatePanel'))
const MultiScreenPanel = lazy(() => import('./panels/fleetos/MultiScreenPanel'))
const MessengerPanel = lazy(() => import('./panels/fleetos/MessengerPanel'))
const DispatchBoardPanel = lazy(() => import('./panels/fleetos/DispatchBoardPanel'))
const ScreenMapWall = lazy(() => import('./panels/screens/ScreenMapWall'))
const ScreenOrdersWall = lazy(() => import('./panels/screens/ScreenOrdersWall'))
const ScreenDriversWall = lazy(() => import('./panels/screens/ScreenDriversWall'))
const ScreenNotificationsWall = lazy(() => import('./panels/screens/ScreenNotificationsWall'))
const ScreenFlightsWall = lazy(() => import('./panels/screens/ScreenFlightsWall'))
const LostFoundPanel = lazy(() => import('./panels/fleetos/LostFoundPanel'))
const ReviewsPanel = lazy(() => import('./panels/fleetos/ReviewsPanel'))
const SubscriptionsPanel = lazy(() => import('./panels/fleetos/SubscriptionsPanel'))
const CustomersPanel = lazy(() => import('./panels/fleetos/CustomersPanel'))
const FutureOrdersPanel = lazy(() => import('./panels/fleetos/FutureOrdersPanel'))

function RouteFallback() {
  return (
    <div className="flex min-h-[100dvh] min-h-[100vh] min-h-[-webkit-fill-available] items-center justify-center bg-[#030712] text-sm text-slate-400">
      Loading…
    </div>
  )
}

export default function UnlockedApp() {
  const location = useLocation()

  useSimulationTicker()
  useRealRouteHydration()
  useLivePresenceTracker(location.pathname)

  return (
    <>
      <NotificationToaster />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPanel />} />
          <Route path="/booking" element={<BookingPanel />} />
          <Route path="/marketplace" element={<MarketplacePanel />} />
          <Route path="/driver" element={<DriverPanel />} />
          <Route path="/customer" element={<CustomerAppPanel />} />

          <Route path="/control" element={<Navigate to="/fleet-os" replace />} />
          <Route path="/fleet-os" element={<ControlCenterPanel />} />
          <Route path="/fleet-os/dispatch" element={<DispatchBoardPanel />} />
          <Route path="/fleet-os/future-orders" element={<FutureOrdersPanel />} />
          <Route path="/fleet-os/messenger" element={<MessengerPanel />} />
          <Route path="/fleet-os/orders" element={<ControlCenterPanel />} />
          <Route path="/fleet-os/multiscreen" element={<MultiScreenPanel />} />
          <Route path="/fleet-os/screens/map" element={<ScreenMapWall />} />
          <Route path="/fleet-os/screens/orders" element={<ScreenOrdersWall />} />
          <Route path="/fleet-os/screens/drivers" element={<ScreenDriversWall />} />
          <Route path="/fleet-os/screens/notifications" element={<ScreenNotificationsWall />} />
          <Route path="/fleet-os/screens/flights" element={<ScreenFlightsWall />} />
          <Route path="/fleet-os/suppliers" element={<SuppliersPanel />} />
          <Route path="/fleet-os/catalog" element={<CatalogPanel />} />
          <Route path="/fleet-os/pricing/dynamic" element={<PricingDynamicPanel />} />
          <Route path="/fleet-os/vehicles" element={<VehicleInventoryPanel />} />
          <Route path="/fleet-os/campaigns" element={<CampaignsPanel />} />
          <Route path="/fleet-os/support" element={<SupportPanel />} />
          <Route path="/fleet-os/refunds" element={<RefundsPanel />} />
          <Route path="/fleet-os/reviews" element={<ReviewsPanel />} />
          <Route path="/fleet-os/subscriptions" element={<SubscriptionsPanel />} />
          <Route path="/fleet-os/lost-found" element={<LostFoundPanel />} />
          <Route path="/fleet-os/customers" element={<CustomersPanel />} />
          <Route path="/fleet-os/roster" element={<RosterPanel />} />
          <Route path="/fleet-os/drivers" element={<RosterPanel />} />
          <Route path="/fleet-os/compliance" element={<CompliancePanel />} />
          <Route path="/fleet-os/finance" element={<FinancePanel />} />
          <Route path="/fleet-os/reports" element={<ReportsPanel />} />
          <Route path="/fleet-os/admin" element={<AdminPanel />} />
          <Route path="/fleet-os/manual-order" element={<ManualOrderPanel />} />
          <Route path="/fleet-os/translation-qa" element={<TranslationQaPanel />} />
          <Route path="/fleet-os/flights" element={<FlightBoardPanel />} />
          <Route path="/fleet-os/forecast" element={<ForecastPanel />} />
          <Route path="/fleet-os/analytics/forecast" element={<Navigate to="/fleet-os/forecast" replace />} />
          <Route path="/fleet-os/invoices" element={<InvoicesPanel />} />
          <Route path="/fleet-os/corporate" element={<CorporatePanel />} />
          <Route path="/fleet-os/accounts" element={<AccountsPanel />} />
          <Route path="/fleet-os/params" element={<OperatingParametersPanel />} />
          <Route path="/fleet-os/access-logs" element={<AccessLogsPanel />} />
          <Route path="/fleet-os/security" element={<Navigate to="/fleet-os/access-logs" replace />} />
        </Routes>
      </Suspense>
      <DemoTourDock />
      <DemoModeSwitcher />
    </>
  )
}
