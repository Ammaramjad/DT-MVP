import { useEffect } from 'react'
import { GlobalNavigation } from '../components/GlobalNavigation'
import { SiteFooter } from '../components/SiteFooter'
import { BookingExperience } from '../features/booking/BookingExperience'
import { HeroExperience } from '../features/home/HeroExperience'
import { AboutExperience, BusinessExperience, FleetShowcase, IntelligenceExperience, JourneyStory, ServiceExplorer, ValueExperience } from '../features/home/HomeSections'
import { COPY } from '../lib/experienceCopy'
import { useStore } from '../store'

export function AppShell() {
  const locale = useStore(state => state.locale)
  const copy = COPY[locale]
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = locale === 'en' ? 'Fleet OS — Your city, in motion' : 'Fleet OS — 城市隨你而動'
  }, [locale])
  return <><a className="skip-link" href="#main">Skip to content</a><GlobalNavigation copy={copy}/><main id="main"><HeroExperience copy={copy}/><ServiceExplorer copy={copy}/><ValueExperience/><BookingExperience copy={copy}/><JourneyStory copy={copy}/><FleetShowcase/><BusinessExperience copy={copy}/><IntelligenceExperience/><AboutExperience copy={copy}/></main><SiteFooter copy={copy}/></>
}
