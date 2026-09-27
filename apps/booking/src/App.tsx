import { lazy, Suspense, useEffect } from 'react'
import { initScroll } from './lib/scroll'
import { useStore } from './store'
import { CutOverlay, Fallback, Loader, MobileBar, Nav, Progress } from './ui/Chrome'
import { Choose, Confirm, Destination, Fleet, Hero, Journey, Outro, Pickup, Showcase, Why } from './ui/Sections'

const Scene = lazy(() => import('./three/Scene'))

export default function App() {
  const webgl = useStore((s) => s.webgl)
  const ready = useStore((s) => s.ready)
  const isMobile = useStore((s) => s.isMobile)

  useEffect(() => initScroll(), [])

  useEffect(() => {
    document.documentElement.classList.toggle('is-ready', ready || !webgl)
    document.documentElement.classList.toggle('is-mobile', isMobile)
  }, [ready, webgl, isMobile])

  return (
    <>
      <Loader />
      <div className="stage">
        {webgl ? (
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        ) : (
          <Fallback />
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
