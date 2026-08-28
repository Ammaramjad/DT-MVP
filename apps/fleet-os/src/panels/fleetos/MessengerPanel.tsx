import { MessageSquare } from 'lucide-react'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { TeamMessenger } from '../../components/fleetos/TeamMessenger'
import { useLang } from '../../i18n'

export default function MessengerPanel() {
  const { lang } = useLang()

  return (
    <FleetOsPage
      title={lang === 'zh' ? '車隊通訊中心 (Operations Communications Center)' : 'Operations Communications Center'}
      subtitle={
        lang === 'zh'
          ? '全島 350+ 司機即時對講、調度廣播、路況緊急通報與轉單快速交接'
          : 'Real-time dispatcher-driver broadcast, emergency traffic reports, direct 1:1 chat, and 1-click order handover matrix'
      }
      icon={<MessageSquare className="h-5 w-5 text-purple-400" />}
    >
      <div className="mt-2" data-testid="fleetos-messenger-page">
        <TeamMessenger mode="FULLSCREEN" />
      </div>
    </FleetOsPage>
  )
}
