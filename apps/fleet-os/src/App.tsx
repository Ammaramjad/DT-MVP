import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useSimulationTicker } from './hooks/useSimulationTicker'
import { useRealRouteHydration } from './hooks/useRealRouteHydration'
import { useLivePresenceTracker } from './lib/livePresence'
import { NotificationToaster } from './components/ui/NotificationToaster'
import { DemoModeSwitcher } from './components/layout/DemoModeSwitcher'
import { DemoTourDock } from './components/layout/DemoTourDock'
import { LanguageProvider } from './i18n'
import { GatekeeperProvider, useGatekeeper } from './lib/gatekeeper'
import { ClientGatekeeper } from './components/security/ClientGatekeeper'
import LandingPanel from './panels/LandingPanel'
import BookingPanel from './panels/BookingPanel'
import ControlCenterPanel from './panels/ControlCenterPanel'
import DriverPanel from './panels/DriverPanel'
import CustomerAppPanel from './panels/CustomerAppPanel'
import MarketplacePanel from './panels/MarketplacePanel'
import SuppliersPanel from './panels/fleetos/SuppliersPanel'
import CatalogPanel from './panels/fleetos/CatalogPanel'
import CampaignsPanel from './panels/fleetos/CampaignsPanel'
import SupportPanel from './panels/fleetos/SupportPanel'
import RefundsPanel from './panels/fleetos/RefundsPanel'
import RosterPanel from './panels/fleetos/RosterPanel'
import CompliancePanel from './panels/fleetos/CompliancePanel'
import FinancePanel from './panels/fleetos/FinancePanel'
import ReportsPanel from './panels/fleetos/ReportsPanel'
import AdminPanel from './panels/fleetos/AdminPanel'
import PricingDynamicPanel from './panels/fleetos/PricingDynamicPanel'
import VehicleInventoryPanel from './panels/fleetos/VehicleInventoryPanel'
import ManualOrderPanel from './panels/fleetos/ManualOrderPanel'
import TranslationQaPanel from './panels/fleetos/TranslationQaPanel'
import FlightBoardPanel from './panels/fleetos/FlightBoardPanel'
import AccountsPanel from './panels/fleetos/AccountsPanel'
import OperatingParametersPanel from './panels/fleetos/OperatingParametersPanel'
import AccessLogsPanel from './panels/fleetos/AccessLogsPanel'
import ForecastPanel from './panels/fleetos/ForecastPanel'
import InvoicesPanel from './panels/fleetos/InvoicesPanel'
import CorporatePanel from './panels/fleetos/CorporatePanel'
import MultiScreenPanel from './panels/fleetos/MultiScreenPanel'
import ScreenMapWall from './panels/screens/ScreenMapWall'
import ScreenOrdersWall from './panels/screens/ScreenOrdersWall'
import ScreenDriversWall from './panels/screens/ScreenDriversWall'
import ScreenNotificationsWall from './panels/screens/ScreenNotificationsWall'
import ScreenFlightsWall from './panels/screens/ScreenFlightsWall'

function AppContent() {
  const { isLocked } = useGatekeeper()
  const location = useLocation()

  // Track real-time live presence and current viewing surface
  useLivePresenceTracker(location.pathname)

  if (isLocked) {
    return <ClientGatekeeper />
  }

  return (
    <>
      <NotificationToaster />
      <Routes>
        <Route path="/" element={<LandingPanel />} />
        <Route path="/booking" element={<BookingPanel />} />
        <Route path="/marketplace" element={<MarketplacePanel />} />
        <Route path="/driver" element={<DriverPanel />} />
        <Route path="/customer" element={<CustomerAppPanel />} />

        {/* Fleet OS — canonical desktop command-center routes per the client
            brief. /control is kept as a working alias (redirect) so the
            existing PR history / any bookmarked links keep resolving. */}
        <Route path="/control" element={<Navigate to="/fleet-os" replace />} />
        <Route path="/fleet-os" element={<ControlCenterPanel />} />
        <Route path="/fleet-os/orders" element={<ControlCenterPanel />} />
        <Route path="/fleet-os/multiscreen" element={<MultiScreenPanel />} />
        {/* Dedicated Standalone Physical Multi-Monitor Operations Wall Screens */}
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
        <Route path="/fleet-os/roster" element={<RosterPanel />} />
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
      <DemoTourDock />
      <DemoModeSwitcher />
    </>
  )
}

export default function App() {
  useSimulationTicker()
  useRealRouteHydration()

  return (
    <LanguageProvider>
      <GatekeeperProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </GatekeeperProvider>
    </LanguageProvider>
  )
}
