import { BrowserRouter, Route, Routes } from 'react-router-dom'
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
          <Route path="/control" element={<ControlCenterPanel />} />
          <Route path="/driver" element={<DriverPanel />} />
          <Route path="/customer" element={<CustomerAppPanel />} />
        </Routes>
        <DemoModeSwitcher />
      </BrowserRouter>
    </LanguageProvider>
  )
}
