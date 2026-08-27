import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useSimulationTicker } from './hooks/useSimulationTicker'
import { useRealRouteHydration } from './hooks/useRealRouteHydration'
import { NotificationToaster } from './components/ui/NotificationToaster'
import { DemoModeSwitcher } from './components/layout/DemoModeSwitcher'
import { LanguageProvider } from './i18n'
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

export default function App() {
  useSimulationTicker()
  useRealRouteHydration()

  return (
    <LanguageProvider>
      <BrowserRouter>
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
          <Route path="/fleet-os/accounts" element={<AccountsPanel />} />
          <Route path="/fleet-os/params" element={<OperatingParametersPanel />} />
        </Routes>
        <DemoModeSwitcher />
      </BrowserRouter>
    </LanguageProvider>
  )
}
