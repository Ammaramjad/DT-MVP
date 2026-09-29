import { Component, lazy, Suspense, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { initScroll } from './lib/scroll'
import { useStore } from './store'
import { CutOverlay, Fallback, Loader, MobileBar, Nav, Progress } from './ui/Chrome'
import { Choose, Confirm, Destination, Fleet, Hero, Journey, Outro, Pickup, Showcase, Why } from './ui/Sections'

const Scene = lazy(() => import('./three/Scene'))

class WebGLErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Fleet OS 3D scene could not initialize.', error, info.componentStack)
  }

  render() {
    return this.state.failed ? <Fallback message="The 3D preview is unavailable on this device. You can still complete your booking request." /> : this.props.children
  }
}

export default function App() {
  const webgl = useStore((s) => s.webgl)
  const ready = useStore((s) => s.ready)
  const isMobile = useStore((s) => s.isMobile)
  const locale = useStore((s) => s.locale)

  useEffect(() => initScroll(), [])

  useEffect(() => { document.documentElement.lang = locale }, [locale])

  useEffect(() => {
    document.documentElement.classList.toggle('is-ready', ready || !webgl)
    document.documentElement.classList.toggle('is-mobile', isMobile)
  }, [ready, webgl, isMobile])

  return (
    <>
      <Loader />
      <div className="stage">
        {webgl ? (
          <WebGLErrorBoundary>
            <Suspense fallback={<Fallback message="Loading the interactive city…" />}>
              <Scene />
            </Suspense>
          </WebGLErrorBoundary>
        ) : (
          <Fallback message="WebGL is unavailable. The booking experience remains fully usable." />
        )}
        <CutOverlay />
      </div>
      <Nav />
      <Progress />
      <main className="page">
        <Hero />
        <Pickup />
        <Destination />
        <Choose />
        <Confirm />
        <Journey />
        <Fleet />
        <Why />
        <Showcase />
        <Outro />
      </main>
      {isMobile && <MobileBar />}
    </>
  )
}
