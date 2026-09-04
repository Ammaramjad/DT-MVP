import { useState, useEffect, useMemo, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  BadgeDollarSign,
  Building2,
  Car,
  ChevronDown,
  ClipboardEdit,
  Command,
  FileText,
  Gauge,
  Headset,
  Languages,
  LayoutGrid,
  MessageSquare,
  Package,
  PackageSearch,
  Plane,
  ReceiptText,
  Repeat,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Truck,
  Tv2,
  Users2,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { useLang } from '../../i18n'
import { useFleetStore } from '../../store/useFleetStore'

export interface NavItem {
  to: string
  end?: boolean
  labelKey: string
  labelEn: string
  labelZh: string
  icon: typeof Gauge
  badgeKey?: 'unassigned' | 'messenger' | 'reviews' | 'lostFound'
  descriptionEn?: string
  descriptionZh?: string
}

export interface NavGroup {
  id: string
  emoji: string
  titleKey: string
  titleEn: string
  titleZh: string
  color: string
  accentBorder: string
  accentBg: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'group-ops',
    emoji: '🛰️',
    titleKey: 'fleetos.groups.ops',
    titleEn: 'Operations & Dispatch',
    titleZh: '即時調度與監控',
    color: 'from-cyan-500 to-blue-600',
    accentBorder: 'border-cyan-500/40',
    accentBg: 'bg-cyan-500/10 text-cyan-300',
    items: [
      {
        to: '/fleet-os',
        end: true,
        labelKey: 'fleetos.nav.dashboard',
        labelEn: 'Central Control Mission Room',
        labelZh: '中央任務控制中心',
        icon: Gauge,
        descriptionEn: 'Live fleet map, active order queue, telemetry & auto-dispatch',
        descriptionZh: '即時全島地圖、派單佇列、運力KPI與一鍵智慧調度',
      },
      {
        to: '/fleet-os/dispatch',
        labelKey: 'fleetos.nav.dispatch',
        labelEn: 'Interactive Drag & Drop Board',
        labelZh: '拖曳智慧調度看板',
        icon: ArrowLeftRight,
        badgeKey: 'unassigned',
        descriptionEn: 'Visual timeline, order drag & drop, schedule conflict detection',
        descriptionZh: '即時視覺化時間軸、司機/訂單雙向拖曳、時程衝突防呆',
      },
      {
        to: '/fleet-os/messenger',
        labelKey: 'fleetos.nav.messenger',
        labelEn: 'Fleet Ops Messenger & Swap Hub',
        labelZh: '車隊通訊與轉單交接',
        icon: MessageSquare,
        badgeKey: 'messenger',
        descriptionEn: 'Dispatcher-driver push broadcast, direct chat & fast handover',
        descriptionZh: '調度員與全島司機即時對講、轉單申請與核准中心',
      },
      {
        to: '/fleet-os/multiscreen',
        labelKey: 'fleetos.nav.multiscreen',
        labelEn: 'Multi-Monitor Operations Wall',
        labelZh: '多螢幕電視牆控制台',
        icon: Tv2,
        descriptionEn: 'Multi-display physical wall launcher, BroadcastChannel sync',
        descriptionZh: '雙螢/四螢實體戰情牆獨立視窗投放與即時同步匯流排',
      },
      {
        to: '/fleet-os/flights',
        labelKey: 'fleetos.nav.flights',
        labelEn: 'Airport Flight Radar Matrix',
        labelZh: '機場即時航班雷達',
        icon: Plane,
        descriptionEn: 'Real-time TPE/TSA/KHH flight radar, landing delays & gate alerts',
        descriptionZh: '桃機/松機/小港航班即時狀態、降落延誤與接機司機連動',
      },
    ],
  },
  {
    id: 'group-workforce',
    emoji: '👥',
    titleKey: 'fleetos.groups.workforce',
    titleEn: 'Workforce & Drivers',
    titleZh: '司機與班表運作',
    color: 'from-purple-500 to-indigo-600',
    accentBorder: 'border-purple-500/40',
    accentBg: 'bg-purple-500/10 text-purple-300',
    items: [
      {
        to: '/fleet-os/roster',
        labelKey: 'fleetos.nav.roster',
        labelEn: 'Driver Roster & Shift HoS',
        labelZh: '司機班表與工時管理',
        icon: Users2,
        descriptionEn: 'Working shifts, fatigue HoS monitoring, manual dispatch override',
        descriptionZh: '早中晚輪班表、疲勞工時監控與手動指定派單',
      },
      {
        to: '/fleet-os/compliance',
        labelKey: 'fleetos.nav.compliance',
        labelEn: 'Compliance & Document OCR',
        labelZh: '合規驗證與證件 OCR',
        icon: ShieldCheck,
        descriptionEn: 'Driver licenses, insurance expiration alerts, auto OCR audits',
        descriptionZh: '駕照/執業登記/保險到期警示與 OCR 證件自動審查',
      },
      {
        to: '/fleet-os/reviews',
        labelKey: 'fleetos.nav.reviews',
        labelEn: 'Driver CSAT & Reviews',
        labelZh: '司機服務評鑑與滿意度',
        icon: Star,
        descriptionEn: 'Customer 5-star feedback, sentiment analysis, CSAT rankings',
        descriptionZh: '乘客五星滿意度回饋、情緒分析與金牌司機評級',
      },
      {
        to: '/fleet-os/accounts',
        labelKey: 'fleetos.nav.accounts',
        labelEn: 'Staff & Driver Directory',
        labelZh: '帳號目錄與登入權限',
        icon: Headset,
        descriptionEn: 'Ops staff access control, driver app account status switches',
        descriptionZh: '調度客服人員帳號管理、司機 App 登入權限啟閉',
      },
    ],
  },
  {
    id: 'group-commercial',
    emoji: '💼',
    titleKey: 'fleetos.groups.commercial',
    titleEn: 'Commercial & Finance',
    titleZh: '訂單、企業商務與財務',
    color: 'from-emerald-500 to-teal-600',
    accentBorder: 'border-emerald-500/40',
    accentBg: 'bg-emerald-500/10 text-emerald-300',
    items: [
      {
        to: '/fleet-os/manual-order',
        labelKey: 'fleetos.nav.manualOrder',
        labelEn: 'Manual Booking Desk',
        labelZh: '電話/櫃檯手動開單',
        icon: ClipboardEdit,
        descriptionEn: 'Counter & phone reservation entry, instant quote & confirm',
        descriptionZh: '調度櫃檯電話訂單快速錄入、即時報價並自動確認',
      },
      {
        to: '/fleet-os/corporate',
        labelKey: 'fleetos.nav.corporate',
        labelEn: 'Corporate B2B & Credit Lines',
        labelZh: '企業合約與月結額度',
        icon: Building2,
        descriptionEn: 'B2B enterprise credit limits, travel policies & monthly billing',
        descriptionZh: 'TSMC/聯發科/長榮企業月結、簽帳額度與差旅審批政策',
      },
      {
        to: '/fleet-os/invoices',
        labelKey: 'fleetos.nav.invoices',
        labelEn: 'Taiwan e-Invoice (e-GUI) Center',
        labelZh: '電子發票與折讓中心',
        icon: FileText,
        descriptionEn: 'Taiwan MOF B2B/B2C e-GUI invoicing, voiding & tax allowance',
        descriptionZh: '財政部電子發票開立、作廢、折讓單與媒體申報檔匯出',
      },
      {
        to: '/fleet-os/finance',
        labelKey: 'fleetos.nav.finance',
        labelEn: 'Finance, Splits & Payouts',
        labelZh: '財務拆帳與撥款結算',
        icon: BadgeDollarSign,
        descriptionEn: 'Commission splits, driver payouts & instant cashout ledger',
        descriptionZh: '車隊抽成拆帳、司機週結/即時提現錢包與撥款紀錄',
      },
      {
        to: '/fleet-os/refunds',
        labelKey: 'fleetos.nav.refunds',
        labelEn: 'Refunds & Cancellations',
        labelZh: '退款與取消審查',
        icon: ReceiptText,
        descriptionEn: 'Flight cancellation refunds, customer dispute approvals',
        descriptionZh: '航班異動退款審核、取消違約金扣除與款項退回',
      },
      {
        to: '/fleet-os/subscriptions',
        labelKey: 'fleetos.nav.subscriptions',
        labelEn: 'Commuter & Route Passes',
        labelZh: '機場通勤與定期月票',
        icon: Repeat,
        descriptionEn: 'Recurring weekly VIP passes, corporate commuter subscriptions',
        descriptionZh: '竹科 ↔ 桃機固定每週專車、高頻通勤定額方案與排班',
      },
    ],
  },
  {
    id: 'group-assets',
    emoji: '⚡',
    titleKey: 'fleetos.groups.assets',
    titleEn: 'Intelligence & Fleet Assets',
    titleZh: 'AI 預測與車隊資產',
    color: 'from-amber-500 to-orange-600',
    accentBorder: 'border-amber-500/40',
    accentBg: 'bg-amber-500/10 text-amber-300',
    items: [
      {
        to: '/fleet-os/forecast',
        labelKey: 'fleetos.nav.forecast',
        labelEn: 'AI Demand & Weather Forecast',
        labelZh: 'AI 需量與天氣預測',
        icon: TrendingUp,
        descriptionEn: 'Machine learning demand surge forecasting, auto-rebalancing',
        descriptionZh: '颱風/大雨天氣加乘、跨區運力缺口預測與一鍵調度廣播',
      },
      {
        to: '/fleet-os/pricing/dynamic',
        labelKey: 'fleetos.nav.pricingDynamic',
        labelEn: 'Dynamic Pricing Engine',
        labelZh: '動態定價與費率加乘',
        icon: Gauge,
        descriptionEn: 'Real-time zone surcharge multipliers, fairness cap controls',
        descriptionZh: '區域即時浮動加價係數、尖峰倍率與消費者保護上限',
      },
      {
        to: '/fleet-os/vehicles',
        labelKey: 'fleetos.nav.vehicles',
        labelEn: 'Vehicle Inventory & Maintenance',
        labelZh: '車輛資產與保養檢驗',
        icon: Car,
        descriptionEn: 'Fleet inventory catalog, maintenance logs, pre-trip checklists',
        descriptionZh: '360+ 實體車輛清冊、進廠維修排程與出車安全點檢',
      },
      {
        to: '/fleet-os/suppliers',
        labelKey: 'fleetos.nav.suppliers',
        labelEn: 'Suppliers & Subcontractors',
        labelZh: '供應商與外包車隊',
        icon: Truck,
        descriptionEn: 'Klook, KKday, ezTravel OTA integrations & fleet partners',
        descriptionZh: '客路/KKday/易遊網 OTA 串接與跨平台訂單配給',
      },
      {
        to: '/fleet-os/catalog',
        labelKey: 'fleetos.nav.catalog',
        labelEn: 'Vehicle Tier & Rate Catalog',
        labelZh: '車種規格與費率目錄',
        icon: Package,
        descriptionEn: '10-category vehicle specs, luggage rules, base pricing catalog',
        descriptionZh: '10大車種服務規格、行李乘載上限與公開牌價定義',
      },
    ],
  },
  {
    id: 'group-governance',
    emoji: '🛡️',
    titleKey: 'fleetos.groups.governance',
    titleEn: 'Governance, Analytics & Support',
    titleZh: '報表、安全與客服',
    color: 'from-rose-500 to-pink-600',
    accentBorder: 'border-rose-500/40',
    accentBg: 'bg-rose-500/10 text-rose-300',
    items: [
      {
        to: '/fleet-os/reports',
        labelKey: 'fleetos.nav.reports',
        labelEn: 'BI Reports & Executive Analytics',
        labelZh: '商業智慧與營運報表',
        icon: LayoutGrid,
        descriptionEn: 'Capacity calendar, hourly volume curves, revenue metrics',
        descriptionZh: '運力日曆熱圖、每小時旅運量曲線與高階營收指標',
      },
      {
        to: '/fleet-os/lost-found',
        labelKey: 'fleetos.nav.lostFound',
        labelEn: 'Lost & Found Resolution Desk',
        labelZh: '遺失物協尋與失物歸還',
        icon: PackageSearch,
        badgeKey: 'lostFound',
        descriptionEn: 'Passenger lost items, vehicle search, hub vault & courier returns',
        descriptionZh: '專車遺留物協尋、司機車內保管、金庫入庫與專車快遞歸還',
      },
      {
        to: '/fleet-os/campaigns',
        labelKey: 'fleetos.nav.campaigns',
        labelEn: 'Marketing Campaigns & Coupons',
        labelZh: '行銷活動與折扣碼',
        icon: Sparkles,
        descriptionEn: 'Promotional discount codes, usage limits & redemption tracking',
        descriptionZh: '優惠代碼發行、折抵額度設定與行銷轉換追蹤',
      },
      {
        to: '/fleet-os/support',
        labelKey: 'fleetos.nav.support',
        labelEn: 'Passenger Support Desk',
        labelZh: '客服工單與客訴處理',
        icon: Headset,
        descriptionEn: 'Live customer inquiries, ticketing system & escalation',
        descriptionZh: '即時乘客詢問、工單指派與優先順序處理中心',
      },
      {
        to: '/fleet-os/translation-qa',
        labelKey: 'fleetos.nav.translationQa',
        labelEn: 'Translation QA Review',
        labelZh: '多國語系校對中心',
        icon: Languages,
        descriptionEn: 'Foreign passenger note translation proofreading (EN/JA/KO)',
        descriptionZh: '外籍旅客訂單備註多國語系 AI 翻譯與人工校對',
      },
      {
        to: '/fleet-os/access-logs',
        labelKey: 'fleetos.nav.accessLogs',
        labelEn: 'Online Visitors & Security Logs',
        labelZh: '線上訪客與安全日誌',
        icon: ShieldAlert,
        descriptionEn: 'Real-time live presence tracking, geo-IP telemetry & access audit',
        descriptionZh: '全站即時在線訪客心跳、地理 IP 軌跡與安全驗證日誌',
      },
      {
        to: '/fleet-os/params',
        labelKey: 'fleetos.nav.params',
        labelEn: 'Operating Parameters',
        labelZh: '系統營運參數設定',
        icon: Settings2,
        descriptionEn: 'Day/night shift window bounds, auto-planning lookahead days',
        descriptionZh: '日夜班時段邊界、自動排班天數與航班看板更新頻率',
      },
      {
        to: '/fleet-os/admin',
        labelKey: 'fleetos.nav.admin',
        labelEn: 'Admin Roles & Permissions',
        labelZh: '管理權限與系統健康',
        icon: ShieldCheck,
        descriptionEn: 'RBAC user roles, permissions matrix & microservice health',
        descriptionZh: '角色權限矩陣、2FA 安全強制設定與系統微服務監控',
      },
    ],
  },
]

export function FleetOsNav() {
  const { t, lang } = useLang()
  const location = useLocation()
  const navigate = useNavigate()

  const orders = useFleetStore((s) => s.orders)
  const chatMessages = useFleetStore((s) => s.chatMessages)

  const unassignedCount = orders.filter((o) => ['CONFIRMED', 'DRIVER_MATCHING'].includes(o.status)).length
  const unreadMsgCount = chatMessages.length > 0 ? Math.min(chatMessages.length, 5) : 0

  // Quick Command Palette Search (Cmd+K / Ctrl+K)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [activeGroupDropdown, setActiveGroupDropdown] = useState<string | null>(null)
  const paletteInputRef = useRef<HTMLInputElement | null>(null)

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      } else if (e.key === 'Escape' && paletteOpen) {
        setPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [paletteOpen])

  useEffect(() => {
    if (paletteOpen) {
      setTimeout(() => paletteInputRef.current?.focus(), 50)
    } else {
      setPaletteQuery('')
    }
  }, [paletteOpen])

  // Flatten all items for palette search
  const allNavItems = useMemo(() => {
    return NAV_GROUPS.flatMap((g) =>
      g.items.map((item) => ({
        ...item,
        groupTitleZh: g.titleZh,
        groupTitleEn: g.titleEn,
        groupEmoji: g.emoji,
        color: g.color,
      })),
    )
  }, [])

  const filteredPaletteItems = useMemo(() => {
    if (!paletteQuery.trim()) return allNavItems
    const q = paletteQuery.toLowerCase()
    return allNavItems.filter((item) => {
      return (
        item.labelEn.toLowerCase().includes(q) ||
        item.labelZh.includes(paletteQuery) ||
        item.to.toLowerCase().includes(q) ||
        (item.descriptionEn && item.descriptionEn.toLowerCase().includes(q)) ||
        (item.descriptionZh && item.descriptionZh.includes(paletteQuery)) ||
        item.groupTitleZh.includes(paletteQuery) ||
        item.groupTitleEn.toLowerCase().includes(q)
      )
    })
  }, [allNavItems, paletteQuery])

  // Determine current active group based on location.pathname
  const currentActiveGroup = useMemo(() => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)) {
          return group
        }
      }
    }
    return NAV_GROUPS[0]
  }, [location.pathname])

  return (
    <>
      <nav
        className="sticky top-[64px] z-[600] mb-5 rounded-3xl border border-white/10 bg-slate-950/90 p-2.5 backdrop-blur-2xl shadow-2xl"
        data-testid="fleetos-nav"
      >
        {/* Top Row: Group Pills + Quick Command Palette Button */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {NAV_GROUPS.map((g) => {
              const isCurrentGroup = currentActiveGroup.id === g.id
              const isDropdownOpen = activeGroupDropdown === g.id

              return (
                <div key={g.id} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeGroupDropdown === g.id) {
                        setActiveGroupDropdown(null)
                      } else {
                        setActiveGroupDropdown(g.id)
                      }
                    }}
                    data-testid={`fleetos-${g.id}`}
                    className={clsx(
                      'group flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-bold transition duration-200 border',
                      isCurrentGroup
                        ? `bg-gradient-to-r ${g.color} text-white shadow-lg border-white/20 scale-[1.02]`
                        : 'text-slate-400 bg-white/[0.03] border-white/5 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <span className="text-sm">{g.emoji}</span>
                    <span>{lang === 'zh' ? g.titleZh : g.titleEn}</span>
                    <ChevronDown
                      className={clsx(
                        'h-3 w-3 transition-transform duration-200 opacity-60 group-hover:opacity-100',
                        isDropdownOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {/* Dropdown Menu for this Group */}
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-[650]"
                          onClick={() => setActiveGroupDropdown(null)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 top-full mt-2 z-[700] w-72 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-2xl"
                          data-testid={`fleetos-dropdown-${g.id}`}
                        >
                          <div className="px-2.5 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between">
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                              {g.emoji} {lang === 'zh' ? g.titleZh : g.titleEn}
                            </p>
                            <span className="text-[9px] font-mono text-slate-500">{g.items.length} MODULES</span>
                          </div>

                          <div className="space-y-1">
                            {g.items.map((item) => {
                              const isActive = item.end
                                ? location.pathname === item.to
                                : location.pathname.startsWith(item.to)
                              const ItemIcon = item.icon

                              return (
                                <NavLink
                                  key={item.to}
                                  to={item.to}
                                  end={item.end}
                                  onClick={() => setActiveGroupDropdown(null)}
                                  className={clsx(
                                    'flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition',
                                    isActive
                                      ? 'bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-400/30'
                                      : 'text-slate-300 hover:bg-white/10 hover:text-white',
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 truncate">
                                    <div
                                      className={clsx(
                                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs',
                                        isActive
                                          ? 'border-cyan-400/50 bg-cyan-400/20 text-cyan-300'
                                          : 'border-white/10 bg-white/5 text-slate-400',
                                      )}
                                    >
                                      <ItemIcon className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="truncate">
                                      <p className="truncate font-medium">{lang === 'zh' ? item.labelZh : item.labelEn}</p>
                                      <p className="truncate text-[10px] text-slate-500 font-normal">
                                        {lang === 'zh' ? item.descriptionZh : item.descriptionEn}
                                      </p>
                                    </div>
                                  </div>

                                  {item.badgeKey === 'unassigned' && unassignedCount > 0 && (
                                    <span className="ml-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/30 px-1 text-[10px] font-bold text-amber-300 border border-amber-400/40">
                                      {unassignedCount}
                                    </span>
                                  )}
                                  {item.badgeKey === 'messenger' && unreadMsgCount > 0 && (
                                    <span className="ml-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-500/40 px-1 text-[10px] font-bold text-purple-200 border border-purple-400/50">
                                      {unreadMsgCount}
                                    </span>
                                  )}
                                </NavLink>
                              )
                            })}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          {/* Quick Command Palette Launcher Pill */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            data-testid="fleetos-command-palette-trigger"
            className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 hover:border-cyan-400/40 hover:text-white"
          >
            <Search className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline text-[11px] font-medium text-slate-400">
              {lang === 'zh' ? '快速跳轉模組或搜尋…' : 'Quick Jump / Search…'}
            </span>
            <kbd className="flex items-center gap-0.5 rounded-lg border border-white/20 bg-slate-900 px-1.5 py-0.5 text-[9.5px] font-mono text-cyan-300">
              <Command className="h-2.5 w-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Bottom Row: Active Category's Nested Module Strip (Instant 1-Click Access) */}
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[11px] font-bold text-slate-500 shrink-0 pl-1 pr-1.5 flex items-center gap-1">
            <span>{currentActiveGroup.emoji}</span>
            <span className="hidden sm:inline">{lang === 'zh' ? currentActiveGroup.titleZh : currentActiveGroup.titleEn}:</span>
          </span>

          {currentActiveGroup.items.map((m) => {
            const ItemIcon = m.icon
            const navTestId = `fleetos-nav-${m.to.split('/').filter(Boolean).pop() || 'dashboard'}`

            return (
              <NavLink
                key={m.to}
                to={m.to}
                end={m.end}
                data-testid={navTestId}
                className={({ isActive }) =>
                  clsx(
                    'relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition duration-150',
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                      : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-slate-200',
                  )
                }
              >
                <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">{t(m.labelKey) || (lang === 'zh' ? m.labelZh : m.labelEn)}</span>
                {m.badgeKey === 'unassigned' && unassignedCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/30 px-1 text-[10px] font-bold text-amber-300 border border-amber-400/40 animate-pulse">
                    {unassignedCount}
                  </span>
                )}
                {m.badgeKey === 'messenger' && unreadMsgCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-500/40 px-1 text-[10px] font-bold text-purple-200 border border-purple-400/50 shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                    {unreadMsgCount}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Global Quick Command Palette Modal (`Cmd+K`) */}
      <AnimatePresence>
        {paletteOpen && (
          <div className="fixed inset-0 z-[900] flex items-start justify-center p-4 pt-20 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-2xl rounded-3xl border border-white/20 bg-slate-950 p-4 shadow-2xl text-white space-y-3"
              data-testid="fleetos-command-palette-modal"
            >
              {/* Search Bar Input */}
              <div className="relative flex items-center border-b border-white/10 pb-3">
                <Search className="absolute left-3 h-5 w-5 text-cyan-400" />
                <input
                  ref={paletteInputRef}
                  type="text"
                  value={paletteQuery}
                  onChange={(e) => setPaletteQuery(e.target.value)}
                  placeholder={
                    lang === 'zh'
                      ? '輸入關鍵字搜尋功能模組、調度看板、定期月票、失物協尋…'
                      : 'Type to jump to any module, dispatch board, subscription, lost & found…'
                  }
                  data-testid="command-palette-input"
                  className="w-full rounded-2xl bg-white/[0.03] pl-11 pr-10 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:bg-white/[0.06] border border-white/10 focus:border-cyan-400/50 transition"
                />
                <button
                  type="button"
                  onClick={() => setPaletteOpen(false)}
                  className="absolute right-3 rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Module Results */}
              <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
                {filteredPaletteItems.map((item) => {
                  const ItemIcon = item.icon
                  const isCurrent = item.end
                    ? location.pathname === item.to
                    : location.pathname.startsWith(item.to)

                  return (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => {
                        navigate(item.to)
                        setPaletteOpen(false)
                      }}
                      data-testid={`palette-item-${item.to.replace(/\//g, '-')}`}
                      className={clsx(
                        'flex w-full items-center justify-between rounded-2xl p-3 text-left transition',
                        isCurrent
                          ? 'bg-cyan-500/15 border border-cyan-400/40 text-cyan-200'
                          : 'bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-white/15',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-300">
                          <ItemIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-white">
                              {lang === 'zh' ? item.labelZh : item.labelEn}
                            </p>
                            <span className="font-mono text-[10px] text-slate-500">{item.to}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {lang === 'zh' ? item.descriptionZh : item.descriptionEn}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400 border border-white/10">
                          {item.groupEmoji} {lang === 'zh' ? item.groupTitleZh : item.groupTitleEn}
                        </span>
                      </div>
                    </button>
                  )
                })}

                {filteredPaletteItems.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-500">
                    {lang === 'zh' ? '找不到相符的模組或功能' : 'No modules match search query.'}
                  </div>
                )}
              </div>

              {/* Footer Helper */}
              <div className="flex items-center justify-between border-t border-white/10 pt-2 px-1 text-[10.5px] text-slate-500 font-mono">
                <span>走瘋派車 Fleet OS · Enterprise Command Suite</span>
                <span>ESC to close</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
