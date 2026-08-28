import { useEffect, useState, useMemo } from 'react'
import {
  CheckCircle2,
  Maximize2,
  Minimize2,
  Search,
  ShieldAlert,
  Zap,
} from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { OrderQueueCard } from '../../components/control/OrderQueueCard'
import { useLang } from '../../i18n'
import { multiScreenBus } from '../../lib/multiScreenSync'
import clsx from 'clsx'

export default function ScreenOrdersWall() {
  const { lang } = useLang()
  const orders = useFleetStore((s) => s.orders)
  const focusOrderId = useFleetStore((s) => s.focusOrderId)
  const setFocusOrder = useFleetStore((s) => s.setFocusOrder)

  const [filter, setFilter] = useState<'ALL' | 'UNASSIGNED' | 'DISPATCHED' | 'IN_TRANSIT' | 'EMERGENCY'>('ALL')
  const [query, setQuery] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    multiScreenBus.init()
    return () => multiScreenBus.close()
  }, [])

  const activeOrders = useMemo(
    () => orders.filter((o) => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status)),
    [orders],
  )

  const emergencyOrders = useMemo(
    () => orders.filter((o) => o.incidentReportedAt && o.emergencyStatus !== 'RESOLVED'),
    [orders],
  )

  const filteredOrders = useMemo(() => {
    let result = activeOrders
    if (filter === 'UNASSIGNED') {
      result = result.filter((o) => o.status === 'CONFIRMED' || o.status === 'DRIVER_MATCHING')
    } else if (filter === 'DISPATCHED') {
      result = result.filter((o) => o.status === 'ASSIGNED' || o.status === 'DRIVER_EN_ROUTE')
    } else if (filter === 'IN_TRANSIT') {
      result = result.filter((o) => o.status === 'ARRIVED' || o.status === 'PASSENGER_ONBOARD')
    } else if (filter === 'EMERGENCY') {
      result = emergencyOrders
    }

    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(
        (o) =>
          o.orderNo.toLowerCase().includes(q) ||
          o.customer.name.toLowerCase().includes(q) ||
          o.pickup.name.toLowerCase().includes(q) ||
          o.dropoff.name.toLowerCase().includes(q),
      )
    }

    return result
  }, [activeOrders, emergencyOrders, filter, query])

  const handleSelectOrder = (id: string) => {
    setFocusOrder(id)
    multiScreenBus.broadcast({ type: 'FOCUS_ORDER', orderId: id })
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#030712] text-white overflow-hidden select-none" data-testid="screen-orders-wall">
      {/* HUD Header Bar */}
      <header className="flex h-14 items-center justify-between border-b border-purple-500/30 bg-slate-950/90 px-4 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Zap className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase text-white flex items-center gap-2">
              <span>{lang === 'zh' ? '螢幕 2：派單調度與隊列戰情牆' : 'Screen 2: Order Dispatch & Queue Matrix'}</span>
              <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono text-purple-300 border border-purple-400/30">
                DISPATCH CONSOLE
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              REAL-TIME BROADCAST SYNC ACTIVE · AUTO-ESCALATION ONLINE
            </p>
          </div>
        </div>

        {/* Filter Toolbar & Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'zh' ? '搜尋訂單編號/乘客/地點…' : 'Filter orders…'}
              className="bg-transparent text-xs text-white outline-none placeholder:text-slate-500 w-44"
            />
          </div>

          <div className="flex rounded-xl border border-white/10 bg-white/5 p-0.5 text-xs">
            {(['ALL', 'UNASSIGNED', 'DISPATCHED', 'IN_TRANSIT', 'EMERGENCY'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'rounded-lg px-2.5 py-1 font-semibold transition text-[11px]',
                  filter === f
                    ? f === 'EMERGENCY'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                      : 'bg-purple-500/30 text-purple-200 border border-purple-400/30'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-xl bg-purple-500/20 border border-purple-400/30 px-3 py-1.5 text-xs font-bold text-purple-200 hover:bg-purple-500/30 transition shadow-[0_0_10px_rgba(168,85,247,0.2)]"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* Dispatch Cards Grid Area */}
      <main className="flex-1 overflow-y-auto p-4">
        {emergencyOrders.length > 0 && (
          <div className="mb-4 rounded-2xl border-2 border-rose-500 bg-rose-950/60 p-3 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs mb-2">
              <ShieldAlert className="h-4 w-4 text-rose-400 animate-pulse" />
              <span>EMERGENCY RESCUE LADDER DISPATCH ACTIVATED ({emergencyOrders.length} CASES)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {emergencyOrders.map((em) => (
                <OrderQueueCard
                  key={em.id}
                  order={em}
                  focused={em.id === focusOrderId}
                  onFocus={() => handleSelectOrder(em.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredOrders.map((order) => (
            <OrderQueueCard
              key={order.id}
              order={order}
              focused={order.id === focusOrderId}
              onFocus={() => handleSelectOrder(order.id)}
            />
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-sm">
            <CheckCircle2 className="h-8 w-8 text-slate-600 mb-2" />
            <p>{lang === 'zh' ? '目前無符合篩選之隊列訂單' : 'No active orders matching this filter'}</p>
          </div>
        )}
      </main>
    </div>
  )
}
