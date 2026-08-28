import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Sparkles,
  X,
  Send,
} from 'lucide-react'
import type { AiConciergeMessage, AiConciergePrompt } from '../../types'
import { useLang } from '../../i18n'
import clsx from 'clsx'

const PREBUILT_PROMPTS: AiConciergePrompt[] = [
  {
    id: 'prompt-tpe-meeting-point',
    icon: 'Plane',
    titleKey: 'concierge.prompt.tpeT2.title',
    promptKey: 'concierge.prompt.tpeT2.text',
    category: 'AIRPORT',
  },
  {
    id: 'prompt-luggage-calc',
    icon: 'Luggage',
    titleKey: 'concierge.prompt.luggage.title',
    promptKey: 'concierge.prompt.luggage.text',
    category: 'LUGGAGE',
  },
  {
    id: 'prompt-flight-delay',
    icon: 'Clock',
    titleKey: 'concierge.prompt.flightDelay.title',
    promptKey: 'concierge.prompt.flightDelay.text',
    category: 'FLIGHT',
  },
  {
    id: 'prompt-sightseeing',
    icon: 'Compass',
    titleKey: 'concierge.prompt.sightseeing.title',
    promptKey: 'concierge.prompt.sightseeing.text',
    category: 'SIGHTSEEING',
  },
]

export function CustomerAiConciergeDrawer() {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AiConciergeMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'AI',
      text:
        lang === 'zh'
          ? '您好！我是您的 走瘋派車 · 智慧行程管家 (AI Travel Concierge)。請點選下方快捷諮詢，或直接輸入您的接送航廈、行李件數或觀光行程需求！'
          : 'Hello! I am your AI Travel Concierge. Feel free to ask about airport pickup meeting points, luggage capacity, flight delay guarantees, or Taiwan tour itineraries!',
      timestamp: Date.now(),
      cards: [
        {
          title: lang === 'zh' ? '桃園機場 T1/T2 接機服務須知' : 'Taoyuan Airport T1/T2 Pickup Meeting Points',
          subtitle: lang === 'zh' ? '出關後右手邊會面點 23/24 號柱 · 司機舉牌專人接待' : 'Exit to arrival lobby pillar 23/24 · Meet & Greet board with your name',
          badge: 'TPE AIRPORT',
        },
      ],
    },
  ])

  const handleSendPrompt = (promptId: string) => {
    if (promptId === 'prompt-tpe-meeting-point') {
      const userText = lang === 'zh' ? '桃園機場第二航廈 (T2) 入境接機的集合地點與舉牌位置在哪裡？' : 'Where is the pickup meeting point and meet & greet location at Taoyuan Airport Terminal 2?'
      const aiReply: AiConciergeMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'AI',
        text:
          lang === 'zh'
            ? '【桃園機場 T2 入境接機指引】\n1. 領取行李並通過海關檢查後，請由入境大廳出口向右走。\n2. 您的司機將於「第 23-25 號會面柱 (Meeting Point Pillar 23-25)」手持印有您姓名的 VIP 專屬電子迎賓舉牌。\n3. 接機服務包含免費 60 分鐘等候期 (自班機實際著陸起算)。若通關需較長時間，請透過 APP 即時傳訊或點選延長等候！'
            : '【Taoyuan Airport T2 Arrival Meeting Guide】\n1. After baggage claim & customs, turn right into the Arrival Hall.\n2. Your chauffeur will be waiting at Meeting Point Pillars 23-25 holding a VIP Meet & Greet sign with your name.\n3. 60 minutes free waiting time starts upon actual flight touchdown.',
        timestamp: Date.now() + 200,
        cards: [
          {
            title: lang === 'zh' ? '桃機 T2 專車上車處' : 'T2 Designated VIP Pickup Zone',
            subtitle: lang === 'zh' ? '第二航廈巡迴接駁車道 · 走瘋特約綠色通道' : 'Terminal 2 Commercial Pickup Lane · Pillar 23',
            badge: 'AIRPORT VIP',
            items: [
              lang === 'zh' ? '司機出車前 15 分鐘主動發送車牌與定位' : 'Driver license plate & GPS sent 15m prior',
              lang === 'zh' ? '免費提供車載 WiFi 與瓶裝礦泉水' : 'Complimentary high-speed WiFi & bottled water',
            ],
          },
        ],
      }
      setMessages((prev) => [
        ...prev,
        { id: `msg-${Date.now()}-user`, sender: 'USER', text: userText, timestamp: Date.now() },
        aiReply,
      ])
    } else if (promptId === 'prompt-luggage-calc') {
      const userText = lang === 'zh' ? '我們有 4 位大人加上 4 件 28 吋大行李箱，推薦預訂哪種車型？' : 'We have 4 adults and four 28-inch suitcases. Which vehicle category is best?'
      const aiReply: AiConciergeMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'AI',
        text:
          lang === 'zh'
            ? '【AI 智慧車型與行李推薦】\n針對 4 位成人 + 4 件 28 吋大行李箱，標準 5 人座轎車後車廂空間不足。\n推薦選用：\n1. 【6人座尊榮廂型車 (VAN_6)】：可容納 5-6 人 + 4-5 件 28 吋大行李，舒適寬敞。\n2. 【9人座豪華商務車 (VAN_9 - Alphard / Granvia)】：極致尊榮，行李空間充裕。\n系統已自動為您預選廂型車優惠方案！'
            : '【AI Vehicle & Luggage Recommendation】\nFor 4 passengers with four 28-inch suitcases, standard Sedans will exceed luggage volume.\nWe recommend:\n1. 6-Seater Van (VAN_6): Fits 5-6 pax + up to 5 large suitcases comfortably.\n2. 9-Seater Luxury Van (VAN_9): Ultimate luxury & huge boot space.',
        timestamp: Date.now() + 200,
        cards: [
          {
            title: lang === 'zh' ? '推薦車型：6人座 / 9人座商務車' : 'Recommended: 6-Seater or 9-Seater Van',
            subtitle: lang === 'zh' ? 'Toyota Granvia / Alphard 旗艦商務' : 'Toyota Granvia / Alphard VIP',
            badge: 'BEST CHOICE',
          },
        ],
      }
      setMessages((prev) => [
        ...prev,
        { id: `msg-${Date.now()}-user`, sender: 'USER', text: userText, timestamp: Date.now() },
        aiReply,
      ])
    } else if (promptId === 'prompt-flight-delay') {
      const userText = lang === 'zh' ? '如果我的班機延誤或提前到達，接機司機會配合調整時間嗎？' : 'If my flight is delayed or arrives early, will the driver adjust pickup time?'
      const aiReply: AiConciergeMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'AI',
        text:
          lang === 'zh'
            ? '【AI 智慧即時航班連動機制】\n走瘋派車系統已直連桃園/松山/高雄機場 ADS-B 航管雷達資料庫。\n無論您的班機延誤數小時或提早降落，派車引擎均會「全自動校準派車時間」，司機將依實際著陸時間準時接駕，完全不收取任何額外延誤等待費！'
            : '【AI Real-Time Flight Telemetry Sync】\nOur platform connects directly to airport ADS-B flight radar systems.\nWhether your flight is delayed or early, dispatch schedules adjust automatically with zero extra fees.',
        timestamp: Date.now() + 200,
      }
      setMessages((prev) => [
        ...prev,
        { id: `msg-${Date.now()}-user`, sender: 'USER', text: userText, timestamp: Date.now() },
        aiReply,
      ])
    } else if (promptId === 'prompt-sightseeing') {
      const userText = lang === 'zh' ? '推薦台灣一日遊包車熱門路線與特色景點？' : 'Recommend popular Taiwan 1-day sightseeing charter routes?'
      const aiReply: AiConciergeMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'AI',
        text:
          lang === 'zh'
            ? '【台灣經典一日包車路線推薦】\n1. 【東北角山海經典】：台北 → 九份老街 → 十分放天燈 → 陰陽海 / 黃金瀑布 (約 8 小時)\n2. 【中部秘境森呼吸】：台中 → 日月潭環湖 → 清境農場 / 高美濕地夕陽\n3. 【東台灣鬼斧神工】：花蓮市區 → 太魯閣國家公園 (燕子口、長春祠) → 七星潭海灘\n您可直接在「訂購平台 (Marketplace)」或「預訂頁面」選用計時包車服務！'
            : '【Top Taiwan 1-Day Charter Routes】\n1. North Coast & Jiufen: Taipei → Jiufen Old Street → Shifen Sky Lanterns → Golden Waterfall (8 hrs)\n2. Central Taiwan: Taichung → Sun Moon Lake → Gaomei Wetlands Sunset\n3. East Coast: Hualien → Taroko Gorge National Park → Qixingtan Beach',
        timestamp: Date.now() + 200,
        cards: [
          {
            title: lang === 'zh' ? '九份十分一日包車 · 熱門首選' : 'Jiufen & Shifen 1-Day Charter',
            subtitle: lang === 'zh' ? '全包式計時服務 · 專屬司導帶路' : 'All-inclusive hourly charter with local expert driver',
            badge: 'POPULAR',
          },
        ],
      }
      setMessages((prev) => [
        ...prev,
        { id: `msg-${Date.now()}-user`, sender: 'USER', text: userText, timestamp: Date.now() },
        aiReply,
      ])
    }
  }

  const handleCustomSend = () => {
    if (!input.trim()) return
    const text = input.trim()
    setInput('')
    const aiReply: AiConciergeMessage = {
      id: `msg-${Date.now()}-ai`,
      sender: 'AI',
      text:
        lang === 'zh'
          ? `已收到您的行程需求：「${text}」。走瘋智慧調度中心已將相關接送偏好與備註同步至您當前的行程訂單中。若有任何即時變更，隨時為您服務！`
          : `Got your request: "${text}". Our dispatch center has synced your preferences with your current itinerary. Let me know if you need any other assistance!`,
      timestamp: Date.now() + 200,
    }
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}-user`, sender: 'USER', text, timestamp: Date.now() },
      aiReply,
    ])
  }

  return (
    <>
      {/* Floating Concierge Assistant Bubble Button */}
      <div className="fixed bottom-20 right-4 z-[800] sm:bottom-24 sm:right-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="customer-ai-concierge-btn"
          className="group flex items-center gap-2 rounded-full border border-cyan-400/40 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 px-4 py-3 text-xs font-bold text-white shadow-[0_4px_25px_rgba(34,211,238,0.4)] backdrop-blur-xl transition hover:scale-105 active:scale-95"
        >
          <Bot className="h-5 w-5 text-cyan-200 animate-bounce" />
          <span className="hidden sm:inline">{lang === 'zh' ? 'AI 智慧行程管家' : 'AI Travel Concierge'}</span>
          <Sparkles className="h-4 w-4 text-amber-300" />
        </button>
      </div>

      {/* Slide-out AI Concierge Drawer */}
      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-[1400] flex justify-end bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            data-testid="ai-concierge-drawer-overlay"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-full max-w-md flex-col border-l border-cyan-400/30 bg-slate-950/95 p-5 text-white shadow-2xl backdrop-blur-2xl"
              data-testid="ai-concierge-drawer"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-1.5">
                      {lang === 'zh' ? '走瘋派車 · 智慧行程管家' : 'AI Travel Concierge'}
                      <Sparkles className="h-4 w-4 text-amber-300" />
                    </h3>
                    <p className="text-[11px] text-cyan-300">{lang === 'zh' ? '24H 智慧即時解答 · 多語系尊榮服務' : '24/7 Smart Travel & Flight Advisor'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  data-testid="close-ai-concierge-btn"
                  className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1" data-testid="ai-concierge-messages">
                {messages.map((msg) => {
                  const isAi = msg.sender === 'AI'
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={clsx('flex flex-col', isAi ? 'items-start' : 'items-end')}
                    >
                      <div
                        className={clsx(
                          'max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed',
                          isAi
                            ? 'bg-slate-900 border border-white/10 text-slate-200 shadow-md'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium shadow-md shadow-cyan-500/20',
                        )}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>

                        {msg.cards && (
                          <div className="mt-3 space-y-2 border-t border-white/10 pt-2.5">
                            {msg.cards.map((c, i) => (
                              <div
                                key={i}
                                className="rounded-xl border border-cyan-400/20 bg-cyan-950/40 p-2.5 text-[11px]"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <p className="font-bold text-cyan-200">{c.title}</p>
                                  {c.badge && (
                                    <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 text-[9px] font-mono text-cyan-300">
                                      {c.badge}
                                    </span>
                                  )}
                                </div>
                                {c.subtitle && <p className="mt-1 text-slate-300">{c.subtitle}</p>}
                                {c.items && (
                                  <ul className="mt-1.5 space-y-0.5 text-slate-400">
                                    {c.items.map((it, idx) => (
                                      <li key={idx}>✓ {it}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Prebuilt Quick Prompts */}
              <div className="border-t border-white/10 pt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {lang === 'zh' ? '常用快捷諮詢 (Quick Prompts)' : 'Quick Travel Prompts'}
                </p>
                <div className="grid grid-cols-2 gap-1.5 mb-3" data-testid="ai-concierge-quick-prompts">
                  {PREBUILT_PROMPTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSendPrompt(p.id)}
                      data-testid={`quick-prompt-btn-${p.id}`}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-left text-[11px] font-medium text-slate-300 transition hover:border-cyan-400/40 hover:bg-white/[0.08] hover:text-white"
                    >
                      <Sparkles className="h-3 w-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{t(p.titleKey)}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Input Box */}
                <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-900 px-3 py-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomSend()}
                    placeholder={lang === 'zh' ? '請輸入您的行程諮詢...' : 'Ask your AI travel concierge...'}
                    data-testid="ai-concierge-input"
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleCustomSend}
                    data-testid="ai-concierge-send-btn"
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 p-2 text-white shadow-md shadow-cyan-500/20 hover:scale-105 active:scale-95 transition"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
