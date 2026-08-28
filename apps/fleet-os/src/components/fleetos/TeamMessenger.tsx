import { useState, useMemo, useRef, useEffect } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Hash,
  Minimize2,
  MessageSquare,
  Radio,
  Send,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { useLang } from '../../i18n'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import type { ChatMessage, Driver } from '../../types'

interface TeamMessengerProps {
  /** Mode: floating dock in Fleet OS or embedded panel / tab inside Driver App */
  mode?: 'FLOATING' | 'EMBEDDED'
  defaultChannel?: string
  currentDriverId?: string
  onClose?: () => void
}

const PRESET_MESSAGES_TAIWAN = [
  '✈️ 航班 BR105 預估延誤 30 分鐘抵達，請司機調整接機時段',
  '🛬 乘客已於桃機第二航廈 E3 接機大廳等候，請前往會合',
  '🌧️ 國道一號林口至泰山路段大雨積水回堵，請行經車輛注意安全',
  '🆘 需備援司機支援！請在桃機附近空車同仁協助接單',
  '✅ 航班準點抵達，已於接機告示牌迎接到 VIP 貴賓',
  '⚡ 暴雨導致高速公路速限降低，請司機向乘客告知行車時間延長',
]

const CHANNELS = [
  { id: 'dispatch-ops', labelZh: '#dispatch-ops 車隊調度廣播', labelEn: '#dispatch-ops Central Fleet', icon: Radio },
  { id: 'urgent-help', labelZh: '#urgent-help 緊急路況求助', labelEn: '#urgent-help Urgent & Traffic', icon: AlertTriangle },
  { id: 'order-swaps', labelZh: '#order-swaps 訂單轉單交接', labelEn: '#order-swaps Order Swaps', icon: Zap },
]

export function TeamMessenger({
  mode = 'FLOATING',
  defaultChannel = 'dispatch-ops',
  currentDriverId,
  onClose,
}: TeamMessengerProps) {
  const { lang } = useLang()
  const chatMessages = useFleetStore((s) => s.chatMessages)
  const sendChatMessage = useFleetStore((s) => s.sendChatMessage)
  const orderSwapRequests = useFleetStore((s) => s.orderSwapRequests)
  const acceptOrderSwap = useFleetStore((s) => s.acceptOrderSwap)
  const drivers = useFleetStore((s) => s.drivers)

  const [activeChannel, setActiveChannel] = useState<string>(defaultChannel)
  const [inputText, setInputText] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isDriverContext = !!currentDriverId
  const currentDriver = currentDriverId ? drivers.find((d: Driver) => d.id === currentDriverId) : null

  // DM channels list
  const dmChannels = useMemo(() => {
    if (isDriverContext && currentDriver) {
      // Driver view: DM with dispatcher, and DMs with top other drivers
      return [
        { id: `dm-dispatcher-${currentDriver.id}`, name: '調度台 (Dispatch Central)', role: 'DISPATCHER', avatar: '🎧' },
        ...drivers
          .filter((d: Driver) => d.id !== currentDriver.id)
          .slice(0, 5)
          .map((d: Driver) => ({
            id: `dm-${[currentDriver.id, d.id].sort().join('-')}`,
            name: lang === 'zh' ? d.nameZh : d.name,
            role: 'DRIVER',
            avatar: d.avatarEmoji,
          })),
      ]
    }

    // Fleet OS view: DMs with active drivers
    return drivers.slice(0, 8).map((d: Driver) => ({
      id: `dm-dispatcher-${d.id}`,
      name: `${lang === 'zh' ? d.nameZh : d.name} (${d.tier === 'OWNED_FLEET' ? '自營' : '隊員'})`,
      role: 'DRIVER',
      avatar: d.avatarEmoji,
    }))
  }, [isDriverContext, currentDriver, drivers, lang])

  const channelMessages = useMemo(() => {
    return chatMessages.filter((m: ChatMessage) => m.channelId === activeChannel)
  }, [chatMessages, activeChannel])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [channelMessages.length, activeChannel])

  const handleSend = () => {
    if (!inputText.trim()) return

    if (isDriverContext && currentDriver) {
      sendChatMessage({
        channelId: activeChannel,
        senderId: currentDriver.id,
        senderName: `${currentDriver.name} (${currentDriver.nameZh})`,
        senderRole: 'DRIVER',
        avatarEmoji: currentDriver.avatarEmoji,
        text: inputText.trim(),
      })
    } else {
      sendChatMessage({
        channelId: activeChannel,
        senderId: 'dispatcher',
        senderName: 'Dispatch Central (調度台)',
        senderRole: 'DISPATCHER',
        avatarEmoji: '🎧',
        text: inputText.trim(),
      })
    }

    setInputText('')
  }

  const handlePresetSelect = (preset: string) => {
    setInputText(preset)
    setShowPresets(false)
  }

  const renderSwapCard = (msg: ChatMessage) => {
    if (!msg.swapRequestId) return null
    const swap = orderSwapRequests.find((s) => s.id === msg.swapRequestId)
    if (!swap) return null

    const canAccept = isDriverContext && currentDriverId !== swap.fromDriverId && swap.status === 'PENDING'

    return (
      <div className="mt-2.5 rounded-xl border border-cyan-500/40 bg-cyan-950/60 p-3.5 shadow-lg shadow-cyan-500/10" data-testid={`swap-card-${swap.id}`}>
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-cyan-500/20 text-cyan-300 font-bold text-xs">
              🔄
            </span>
            <span className="font-mono text-xs font-bold text-cyan-300">{swap.orderNo}</span>
            <Badge tone="cyan">{swap.vehicleCategory}</Badge>
          </div>
          <Badge
            tone={
              swap.status === 'ACCEPTED'
                ? 'green'
                : swap.status === 'PENDING'
                ? 'amber'
                : 'slate'
            }
          >
            {swap.status === 'PENDING' ? '待接單轉讓' : swap.status === 'ACCEPTED' ? '已交接轉單' : swap.status}
          </Badge>
        </div>

        <div className="mt-2 text-xs text-slate-200 space-y-1">
          <p className="font-semibold text-white">
            {swap.pickupName} ➔ {swap.dropoffName}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
            <span>預約時間: {new Date(swap.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="font-bold text-emerald-400">NT${swap.priceEstimate.toLocaleString()}</span>
          </div>
          <p className="text-[10.5px] text-amber-300/90 bg-amber-950/30 p-1.5 rounded border border-amber-500/20">
            轉單原因：{swap.reasonCustom || swap.reason}
          </p>
        </div>

        {swap.status === 'PENDING' && (
          <div className="mt-3 flex items-center justify-end gap-2">
            {canAccept && (
              <Button
                size="sm"
                data-testid={`accept-swap-btn-${swap.id}`}
                onClick={() => acceptOrderSwap(swap.id, currentDriverId!)}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {lang === 'zh' ? '接受 / 承接此行程 (Claim Trip)' : 'Claim Trip'}
              </Button>
            )}
            {isDriverContext && currentDriverId === swap.fromDriverId && (
              <span className="text-[11px] text-cyan-300 font-medium">
                ⏳ {lang === 'zh' ? '已發布轉單，等待附近司機接單…' : 'Awaiting nearby drivers to claim…'}
              </span>
            )}
            {!isDriverContext && (
              <Button
                size="sm"
                data-testid={`dispatcher-claim-swap-${swap.id}`}
                onClick={() => {
                  const targetD = drivers.find((d: Driver) => d.status === 'AVAILABLE' && d.id !== swap.fromDriverId)
                  if (targetD) acceptOrderSwap(swap.id, targetD.id)
                }}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold"
              >
                <Zap className="h-3.5 w-3.5 mr-1" />
                {lang === 'zh' ? '調度台快速指派空車承接' : 'Quick Dispatch Handover'}
              </Button>
            )}
          </div>
        )}

        {swap.status === 'ACCEPTED' && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>已成功轉讓給司機：{swap.toDriverName}</span>
          </div>
        )}
      </div>
    )
  }

  const containerClasses =
    mode === 'FLOATING'
      ? 'fixed bottom-4 right-4 z-[800] w-[460px] h-[600px] flex flex-col rounded-2xl border border-purple-500/30 bg-slate-950/95 backdrop-blur-2xl shadow-2xl shadow-purple-950/50 text-white overflow-hidden'
      : 'flex flex-col w-full h-[620px] max-w-4xl mx-auto rounded-2xl border border-white/10 bg-slate-950/90 backdrop-blur-xl text-white overflow-hidden shadow-2xl'

  return (
    <div className={containerClasses} data-testid="team-messenger-dock">
      {/* Header */}
      <div className="flex h-13 items-center justify-between border-b border-white/10 bg-gradient-to-r from-slate-900 to-purple-950/60 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{lang === 'zh' ? '車隊即時通話對講 (Team Messenger)' : 'Team Messenger'}</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              REAL-TIME FLEET DISPATCH CHAT & SWAP MATRIX
            </p>
          </div>
        </div>

        {mode === 'FLOATING' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {!isMinimized && (
        <div className="flex flex-1 min-h-0">
          {/* Sidebar Channels List */}
          <div className="w-40 border-r border-white/10 bg-slate-900/60 p-2 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="space-y-3">
              <div>
                <p className="px-2 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {lang === 'zh' ? '車隊頻道' : 'Channels'}
                </p>
                <div className="space-y-0.5">
                  {CHANNELS.map((ch) => {
                    const Icon = ch.icon
                    const isSelected = activeChannel === ch.id
                    return (
                      <button
                        key={ch.id}
                        onClick={() => setActiveChannel(ch.id)}
                        data-testid={`messenger-channel-${ch.id}`}
                        className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition ${
                          isSelected
                            ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-400/30'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{lang === 'zh' ? ch.labelZh.split(' ')[0] : ch.labelEn.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="px-2 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {lang === 'zh' ? '私訊 (Direct)' : 'Direct (1:1)'}
                </p>
                <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
                  {dmChannels.map((dm: { id: string; name: string; avatar: string }) => {
                    const isSelected = activeChannel === dm.id
                    return (
                      <button
                        key={dm.id}
                        onClick={() => setActiveChannel(dm.id)}
                        data-testid={`messenger-dm-${dm.id}`}
                        className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition ${
                          isSelected
                            ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-400/30'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        <span>{dm.avatar}</span>
                        <span className="truncate">{dm.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-purple-950/40 p-2 border border-purple-500/20 text-[10px] text-purple-200">
              <span className="font-bold block">✈️ 桃園機場調度台</span>
              <span className="text-slate-400">目前值班員: Lin Da-Ming</span>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex flex-1 flex-col min-w-0 bg-slate-950/70">
            {/* Active Channel Header */}
            <div className="flex h-9 items-center justify-between border-b border-white/5 bg-white/[0.02] px-3 shrink-0">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-purple-400" />
                {activeChannel}
              </span>
              <button
                onClick={() => setShowPresets(!showPresets)}
                data-testid="toggle-quick-presets"
                className="flex items-center gap-1 rounded bg-purple-500/10 border border-purple-400/30 px-2 py-0.5 text-[10.5px] font-medium text-purple-300 hover:bg-purple-500/20"
              >
                <Sparkles className="h-3 w-3" />
                <span>{lang === 'zh' ? '機場快捷常用語' : 'Presets'}</span>
              </button>
            </div>

            {/* Quick Presets Dropdown */}
            {showPresets && (
              <div className="border-b border-purple-500/30 bg-purple-950/80 p-2 space-y-1 shrink-0">
                <p className="text-[10px] font-bold text-purple-300 mb-1">
                  {lang === 'zh' ? '台灣機場接送常用快捷回覆：' : 'Taiwan Airport Quick Presets:'}
                </p>
                {PRESET_MESSAGES_TAIWAN.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetSelect(p)}
                    data-testid={`preset-item-${idx}`}
                    className="block w-full text-left rounded p-1.5 text-[11px] text-slate-200 hover:bg-purple-500/30 transition truncate"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 pr-2" data-testid="messenger-feed">
              {channelMessages.map((msg: ChatMessage) => {
                const isMyMessage =
                  (isDriverContext && currentDriver && msg.senderId === currentDriver.id) ||
                  (!isDriverContext && msg.senderRole === 'DISPATCHER')

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400">
                      <span>{msg.avatarEmoji || (msg.senderRole === 'DISPATCHER' ? '🎧' : '🧑🏻‍✈️')}</span>
                      <span className="font-semibold text-slate-300">{msg.senderName}</span>
                      <span className="text-[9px] text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`rounded-2xl px-3.5 py-2 text-xs max-w-[85%] leading-relaxed ${
                        isMyMessage
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-purple-950/50'
                          : msg.senderRole === 'DISPATCHER'
                          ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-100 rounded-bl-none shadow-md shadow-cyan-950/40'
                          : 'bg-slate-800/90 border border-slate-700/60 text-slate-100 rounded-bl-none shadow-md'
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>

                    <div className="w-full">
                      {renderSwapCard(msg)}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-2 border-t border-white/10 bg-slate-900/80 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={lang === 'zh' ? '輸入訊息或選擇快捷語…' : 'Type a message…'}
                  data-testid="messenger-input"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-400/50"
                />
                <Button
                  size="sm"
                  type="submit"
                  disabled={!inputText.trim()}
                  data-testid="messenger-send-btn"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-2"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
