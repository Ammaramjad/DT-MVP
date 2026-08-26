import { LayoutGrid } from 'lucide-react'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { AnalyticsDashboard } from '../../components/control/AnalyticsDashboard'
import { HourlyVolumeChart } from '../../components/control/HourlyVolumeChart'
import { CapacityCalendar } from '../../components/control/CapacityCalendar'
import { useLang } from '../../i18n'

export default function ReportsPanel() {
  const { t } = useLang()
  return (
    <FleetOsPage title={t('fleetos.reports.title')} subtitle={t('fleetos.reports.subtitle')} icon={<LayoutGrid className="h-5 w-5" />}>
      <div className="mt-4 glass-panel rounded-2xl p-4">
        <AnalyticsDashboard />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass-panel rounded-2xl p-4">
          <CapacityCalendar />
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <HourlyVolumeChart />
        </div>
      </div>
    </FleetOsPage>
  )
}
