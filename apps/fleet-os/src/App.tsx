import { lazy, Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from './i18n'
import { GatekeeperProvider } from './lib/gatekeeper'

const UnlockedApp = lazy(() => import('./UnlockedApp'))

function AppFallback() {
  return (
    <div
      className="gatekeeper-fallback flex min-h-[100dvh] min-h-[100vh] min-h-[-webkit-fill-available] w-full items-center justify-center bg-[#030712] text-sm text-slate-400"
      aria-busy="true"
    >
      Loading…
    </div>
  )
}

function AppRouter() {
  return (
    <Suspense fallback={<AppFallback />}>
      <UnlockedApp />
    </Suspense>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <GatekeeperProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </GatekeeperProvider>
    </LanguageProvider>
  )
}
