import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useSimulationTicker } from './hooks/useSimulationTicker'
import { NotificationToaster } from './components/ui/NotificationToaster'
import { PersonaSwitcher } from './components/layout/PersonaSwitcher'
import LandingPanel from './panels/LandingPanel'
import BookingPanel from './panels/BookingPanel'
import ControlCenterPanel from './panels/ControlCenterPanel'
import DriverPanel from './panels/DriverPanel'
import CustomerTrackingPanel from './panels/CustomerTrackingPanel'

export default function App() {
  useSimulationTicker()

  return (
    <BrowserRouter>
      <NotificationToaster />
      <Routes>
        <Route path="/" element={<LandingPanel />} />
        <Route path="/booking" element={<BookingPanel />} />
        <Route path="/control" element={<ControlCenterPanel />} />
        <Route path="/driver" element={<DriverPanel />} />
        <Route path="/customer" element={<CustomerTrackingPanel />} />
      </Routes>
      <PersonaSwitcher />
    </BrowserRouter>
  )
}
