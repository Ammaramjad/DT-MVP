import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PackageSearch,
  Search,
  CheckCircle2,
  Car,
  ShieldCheck,
  Send,
  Building2,
  Truck,
  Plus,
  FileText,
  UserCheck,
} from 'lucide-react'
import { FleetOsPage } from '../../components/fleetos/FleetOsPage'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { StatCard } from '../../components/ui/StatCard'
import { formatRelative, formatDateTime } from '../../lib/format'
import { SEED_LOST_FOUND_INCIDENTS, type LostFoundIncident } from '../../data/newModulesSeed'
import { useLang } from '../../i18n'
import clsx from 'clsx'

const STATUS_TONE = {
  REPORTED: 'red',
  LOCATED: 'amber',
  AT_HUB: 'purple',
  DISPATCHED_RETURN: 'cyan',
  RETURNED: 'green',
} as const

const STATUS_LABELS: Record<LostFoundIncident['status'], { en: string; zh: string }> = {
  REPORTED: { en: 'Reported (Investigating)', zh: '已回報 (調查中)' },
  LOCATED: { en: 'Item Located by Driver', zh: '司機已尋獲 (車內保管)' },
  AT_HUB: { en: 'Safekeeping at Hub', zh: '已送達調度中心金庫' },
  DISPATCHED_RETURN: { en: 'Return Dispatched', zh: '寄送/專車歸還中' },
  RETURNED: { en: 'Returned & Closed', zh: '已順利歸還物主 (結案)' },
}

const CATEGORY_ICONS: Record<LostFoundIncident['itemCategory'], string> = {
  PHONE: '📱',
  WALLET: '👛',
  LUGGAGE: '🧳',
  KEYS: '🔑',
  DOCUMENT: '📄',
  OTHER: '📦',
}

export default function LostFoundPanel() {
  const { lang } = useLang()
  const [incidents, setIncidents] = useState<LostFoundIncident[]>(SEED_LOST_FOUND_INCIDENTS)
  const [selectedIncident, setSelectedIncident] = useState<LostFoundIncident | null>(incidents[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | LostFoundIncident['status']>('ALL')
  const [actionAlert, setActionAlert] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // New incident form
  const [newOrderNo, setNewOrderNo] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<LostFoundIncident['itemCategory']>('PHONE')
  const [newItemDesc, setNewItemDesc] = useState('')

  const filteredIncidents = incidents.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      item.itemDescription.toLowerCase().includes(q) ||
      item.orderNo.toLowerCase().includes(q) ||
      item.customerName.toLowerCase().includes(q) ||
      item.customerPhone.includes(q) ||
      item.vehiclePlate.toLowerCase().includes(q) ||
      item.driverNameZh.includes(searchQuery) ||
      item.driverName.toLowerCase().includes(q)
    )
  })

  const showAlert = (msg: string) => {
    setActionAlert(msg)
    setTimeout(() => setActionAlert(null), 4000)
  }

  const handleUpdateStatus = (incidentId: string, nextStatus: LostFoundIncident['status'], customNote?: string) => {
    setIncidents((prev) =>
      prev.map((item) => {
        if (item.id !== incidentId) return item
        const updatedNotes = customNote
          ? `${item.dispatcherNotes ? item.dispatcherNotes + '\n' : ''}[${new Date().toLocaleTimeString('zh-TW', { hour12: false })}] ${customNote}`
          : item.dispatcherNotes
        return {
          ...item,
          status: nextStatus,
          dispatcherNotes: updatedNotes,
        }
      }),
    )

    if (selectedIncident && selectedIncident.id === incidentId) {
      setSelectedIncident((prev) =>
        prev
          ? {
              ...prev,
              status: nextStatus,
              dispatcherNotes: customNote
                ? `${prev.dispatcherNotes ? prev.dispatcherNotes + '\n' : ''}[${new Date().toLocaleTimeString('zh-TW', { hour12: false })}] ${customNote}`
                : prev.dispatcherNotes,
            }
          : null,
      )
    }

    const statusName = STATUS_LABELS[nextStatus][lang === 'zh' ? 'zh' : 'en']
    showAlert(
      lang === 'zh'
        ? `案件 ${selectedIncident?.orderNo || incidentId} 狀態已更新為【${statusName}】！物主與司機端已同步更新。`
        : `Incident ${selectedIncident?.orderNo || incidentId} status updated to [${statusName}]. Passenger notified.`,
    )
  }

  const handleAddNote = () => {
    if (!selectedIncident || !noteInput.trim()) return
    const noteText = `[${new Date().toLocaleTimeString('zh-TW', { hour12: false })} Ops Note] ${noteInput.trim()}`
    setIncidents((prev) =>
      prev.map((item) =>
        item.id === selectedIncident.id
          ? { ...item, dispatcherNotes: item.dispatcherNotes ? `${item.dispatcherNotes}\n${noteText}` : noteText }
          : item,
      ),
    )
    setSelectedIncident((prev) =>
      prev ? { ...prev, dispatcherNotes: prev.dispatcherNotes ? `${prev.dispatcherNotes}\n${noteText}` : noteText } : null,
    )
    setNoteInput('')
    showAlert(lang === 'zh' ? '調度日誌紀錄已更新。' : 'Dispatcher log note added.')
  }

  const handleCreateReport = () => {
    if (!newCustomerName.trim() || !newItemDesc.trim()) return
    const newInc: LostFoundIncident = {
      id: `lf-${Date.now()}`,
      orderId: `ord-${Date.now()}`,
      orderNo: newOrderNo.trim() || `FP-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: newCustomerName.trim(),
      customerPhone: newCustomerPhone.trim() || '+886 900-000-000',
      itemCategory: newItemCategory,
      itemDescription: newItemDesc.trim(),
      driverId: 'drv-1',
      driverName: 'Chen Wei-Ming',
      driverNameZh: '陳偉明',
      vehiclePlate: 'ABC-5581',
      route: 'TPE Airport → Taipei City Center',
      reportedAt: Date.now(),
      status: 'REPORTED',
      storageLocation: 'Vehicle Boot (Under Investigation)',
      dispatcherNotes: `New lost item report filed by passenger concierge desk.`,
    }

    setIncidents([newInc, ...incidents])
    setSelectedIncident(newInc)
    setShowCreateModal(false)
    setNewCustomerName('')
    setNewCustomerPhone('')
    setNewOrderNo('')
    setNewItemDesc('')
    showAlert(
      lang === 'zh'
        ? `遺失物案件【${newInc.orderNo}】已建立並推播至負責車輛司機！`
        : `Lost item incident created for order ${newInc.orderNo} and driver notified!`,
    )
  }

  // KPIs
  const totalCount = incidents.length
  const activeCount = incidents.filter((i) => i.status !== 'RETURNED').length
  const locatedCount = incidents.filter((i) => i.status === 'LOCATED' || i.status === 'AT_HUB').length
  const returnedCount = incidents.filter((i) => i.status === 'RETURNED').length

  return (
    <FleetOsPage
      title={lang === 'zh' ? '遺失物協尋與失物歸還中心' : 'Lost & Found Incident Resolution Desk'}
      subtitle={
        lang === 'zh'
          ? '機場專車遺留物即時協尋、司機安全保管、中心金庫入庫、專車快遞歸還全流程追蹤'
          : 'End-to-end resolution workflow: Report ➔ Located in Vehicle ➔ Vault Safekeeping ➔ Return Dispatched ➔ Returned & Closed'
      }
      icon={<PackageSearch className="h-5 w-5 text-amber-400" />}
      right={
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          data-testid="create-lost-found-report-btn"
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-amber-500/25 transition hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>{lang === 'zh' ? '登記遺失物案件' : 'New Report'}</span>
        </button>
      }
    >
      <div className="pb-8" data-testid="lost-found-panel">
        {/* Action Alert Banner */}
        <AnimatePresence>
          {actionAlert && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/80 p-4 shadow-[0_0_20px_rgba(245,158,11,0.3)] backdrop-blur-xl"
              data-testid="lost-found-alert"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-amber-400 shrink-0" />
                <p className="text-sm font-bold text-amber-200">{actionAlert}</p>
              </div>
              <button
                type="button"
                onClick={() => setActionAlert(null)}
                className="text-xs font-semibold text-amber-400 hover:text-amber-200"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top KPI Cards */}
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<PackageSearch className="h-4 w-4" />}
            label={lang === 'zh' ? '處理中遺失案件' : 'Active Cases'}
            value={activeCount}
            tone="amber"
          />
          <StatCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label={lang === 'zh' ? '已尋獲/金庫保管' : 'Secured at Hub/Vehicle'}
            value={locatedCount}
            tone="purple"
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label={lang === 'zh' ? '成功歸還結案' : 'Returned to Owner'}
            value={returnedCount}
            tone="lime"
          />
          <StatCard
            icon={<FileText className="h-4 w-4" />}
            label={lang === 'zh' ? '總協尋紀錄' : 'Total Reports'}
            value={totalCount}
            tone="cyan"
          />
        </div>

        {/* Main 2-Column Split: List & Incident Master Workflow */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1.4fr]">
          {/* Left Column: Filterable List */}
          <div className="glass-panel rounded-3xl p-4 flex flex-col min-h-[600px]">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'zh' ? '搜尋物主、車牌、訂單號、物品…' : 'Search item, passenger, plate, order…'}
                  data-testid="lost-found-search-input"
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400/40"
                />
              </div>
            </div>

            {/* Status Filter Pills */}
            <div className="flex flex-wrap gap-1.5 py-3 border-b border-white/5">
              {(['ALL', 'REPORTED', 'LOCATED', 'AT_HUB', 'DISPATCHED_RETURN', 'RETURNED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={clsx(
                    'rounded-lg px-2.5 py-1 text-[11px] font-bold transition',
                    statusFilter === st
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                      : 'text-slate-400 bg-white/5 hover:bg-white/10',
                  )}
                >
                  {st === 'ALL'
                    ? lang === 'zh'
                      ? '全部案件'
                      : 'All'
                    : STATUS_LABELS[st][lang === 'zh' ? 'zh' : 'en']}
                </button>
              ))}
            </div>

            {/* Incident Cards */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 max-h-[580px]">
              {filteredIncidents.map((item) => {
                const isSelected = selectedIncident?.id === item.id
                return (
                  <motion.div
                    key={item.id}
                    onClick={() => setSelectedIncident(item)}
                    data-testid="lost-found-card"
                    className={clsx(
                      'cursor-pointer rounded-2xl p-3.5 border transition relative overflow-hidden',
                      isSelected
                        ? 'bg-amber-950/40 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{CATEGORY_ICONS[item.itemCategory]}</span>
                        <div>
                          <p className="text-xs font-bold text-white line-clamp-1">{item.itemDescription}</p>
                          <p className="text-[10.5px] font-mono text-amber-300/90">{item.orderNo} · {item.customerName}</p>
                        </div>
                      </div>
                      <Badge tone={STATUS_TONE[item.status]}>
                        {STATUS_LABELS[item.status][lang === 'zh' ? 'zh' : 'en']}
                      </Badge>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2">
                      <span className="flex items-center gap-1 font-mono text-cyan-300">
                        <Car className="h-3 w-3 text-cyan-400" /> {item.vehiclePlate} ({lang === 'zh' ? item.driverNameZh : item.driverName})
                      </span>
                      <span className="text-[10px] text-slate-500">{formatRelative(item.reportedAt, lang)}</span>
                    </div>
                  </motion.div>
                )
              })}

              {filteredIncidents.length === 0 && (
                <div className="py-16 text-center text-xs text-slate-500">
                  {lang === 'zh' ? '無符合條件之遺失物案件' : 'No lost & found incidents match criteria.'}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Detailed Resolution Workflow */}
          <div className="glass-panel rounded-3xl p-5 flex flex-col justify-between" data-testid="lost-found-detail-card">
            {selectedIncident ? (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-400/30 text-2xl shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                      {CATEGORY_ICONS[selectedIncident.itemCategory]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-white">{selectedIncident.itemDescription}</h2>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lang === 'zh' ? '報案編號' : 'Case ID'}: <span className="font-mono text-amber-300">{selectedIncident.id}</span> · {lang === 'zh' ? '關聯訂單' : 'Order'}: <span className="font-mono text-cyan-300">{selectedIncident.orderNo}</span>
                      </p>
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[selectedIncident.status]} className="text-xs px-2.5 py-1">
                    {STATUS_LABELS[selectedIncident.status][lang === 'zh' ? 'zh' : 'en']}
                  </Badge>
                </div>

                {/* 5-Step Resolution Stepper Timeline */}
                <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                    {lang === 'zh' ? '標準處理流程與推進' : 'Standard Resolution Pipeline'}
                  </p>
                  
                  <div className="grid grid-cols-5 gap-2 text-center text-[10.5px]">
                    {(['REPORTED', 'LOCATED', 'AT_HUB', 'DISPATCHED_RETURN', 'RETURNED'] as const).map((step, idx) => {
                      const stepIdx = ['REPORTED', 'LOCATED', 'AT_HUB', 'DISPATCHED_RETURN', 'RETURNED'].indexOf(selectedIncident.status)
                      const isDone = idx <= stepIdx
                      const isCurrent = idx === stepIdx
                      return (
                        <div key={step} className="flex flex-col items-center">
                          <div
                            className={clsx(
                              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold mb-1.5 border transition',
                              isCurrent
                                ? 'border-amber-400 bg-amber-500/30 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.5)] scale-110'
                                : isDone
                                  ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300'
                                  : 'border-white/10 bg-white/5 text-slate-500',
                            )}
                          >
                            {isDone ? '✓' : idx + 1}
                          </div>
                          <span className={clsx('font-bold leading-tight', isCurrent ? 'text-amber-300' : isDone ? 'text-slate-300' : 'text-slate-600')}>
                            {STATUS_LABELS[step][lang === 'zh' ? 'zh' : 'en'].split(' ')[0]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-3 space-y-2">
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-cyan-400" /> {lang === 'zh' ? '物主與專車資訊' : 'Passenger & Trip Info'}
                    </p>
                    <div className="space-y-1 text-slate-300">
                      <p><span className="text-slate-500">{lang === 'zh' ? '乘客姓名' : 'Passenger'}:</span> <strong className="text-white">{selectedIncident.customerName}</strong></p>
                      <p><span className="text-slate-500">{lang === 'zh' ? '聯絡電話' : 'Phone'}:</span> <span className="font-mono text-cyan-300">{selectedIncident.customerPhone}</span></p>
                      <p><span className="text-slate-500">{lang === 'zh' ? '搭乘行程' : 'Route'}:</span> {selectedIncident.route}</p>
                      <p><span className="text-slate-500">{lang === 'zh' ? '負責車輛' : 'Vehicle'}:</span> <span className="font-mono text-amber-300">{selectedIncident.vehiclePlate}</span> ({lang === 'zh' ? selectedIncident.driverNameZh : selectedIncident.driverName})</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-3 space-y-2">
                    <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-purple-400" /> {lang === 'zh' ? '當前實體保管庫位' : 'Current Safekeeping Vault'}
                    </p>
                    <div className="space-y-1 text-slate-300">
                      <p><span className="text-slate-500">{lang === 'zh' ? '庫存位置' : 'Location'}:</span> <span className="font-semibold text-purple-300">{selectedIncident.storageLocation}</span></p>
                      {selectedIncident.trackingNumber && (
                        <p><span className="text-slate-500">{lang === 'zh' ? '快遞單號' : 'Tracking #'}:</span> <span className="font-mono text-emerald-300">{selectedIncident.trackingNumber}</span></p>
                      )}
                      <p><span className="text-slate-500">{lang === 'zh' ? '登記時間' : 'Reported'}:</span> {formatDateTime(new Date(selectedIncident.reportedAt).toISOString(), lang)}</p>
                    </div>
                  </div>
                </div>

                {/* Dispatcher Notes & Activity Log */}
                <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-3.5 space-y-2">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <FileText className="h-3 w-3 text-cyan-400" /> {lang === 'zh' ? '調度日誌與協尋備註' : 'Dispatcher Audit & Notes'}
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-white/5 max-h-32 overflow-y-auto">
                    {selectedIncident.dispatcherNotes || (lang === 'zh' ? '尚無額外備註紀錄' : 'No additional notes logged.')}
                  </pre>
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder={lang === 'zh' ? '輸入調度協尋追蹤備註…' : 'Add dispatcher follow-up note…'}
                      data-testid="lost-found-note-input"
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400/40"
                    />
                    <Button size="sm" onClick={handleAddNote} data-testid="lost-found-add-note-btn">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Pipeline Transition Action Buttons */}
                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-400 font-medium">
                    {lang === 'zh' ? '一鍵狀態推進:' : 'Advance Workflow:'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedIncident.status === 'REPORTED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedIncident.id, 'LOCATED', 'Driver inspected vehicle and confirmed item secured.')}
                        data-testid="advance-to-located-btn"
                        className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/30 transition shadow-sm"
                      >
                        <Car className="h-3.5 w-3.5 text-amber-400" />
                        <span>{lang === 'zh' ? '司機已尋獲' : 'Mark Located in Car'}</span>
                      </button>
                    )}

                    {(selectedIncident.status === 'REPORTED' || selectedIncident.status === 'LOCATED') && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedIncident.id, 'AT_HUB', 'Item handed over to Taipei Central Hub Vault #B-04.')}
                        data-testid="advance-to-hub-btn"
                        className="flex items-center gap-1.5 rounded-xl bg-purple-500/20 border border-purple-400/40 px-3 py-1.5 text-xs font-bold text-purple-200 hover:bg-purple-500/30 transition shadow-sm"
                      >
                        <Building2 className="h-3.5 w-3.5 text-purple-400" />
                        <span>{lang === 'zh' ? '入庫中心金庫' : 'Safekeep at Hub Vault'}</span>
                      </button>
                    )}

                    {selectedIncident.status !== 'DISPATCHED_RETURN' && selectedIncident.status !== 'RETURNED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedIncident.id, 'DISPATCHED_RETURN', 'Dispatched return via Taiwan Pelican Express Courier.')}
                        data-testid="advance-to-dispatched-btn"
                        className="flex items-center gap-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/30 transition shadow-sm"
                      >
                        <Truck className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{lang === 'zh' ? '快遞/專車歸還中' : 'Dispatch Return'}</span>
                      </button>
                    )}

                    {selectedIncident.status !== 'RETURNED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedIncident.id, 'RETURNED', 'Passenger confirmed receipt of item in person. Case resolved.')}
                        data-testid="advance-to-returned-btn"
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 transition shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{lang === 'zh' ? '確認已歸還物主 (結案)' : 'Confirm Returned (Close)'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-500 text-sm">
                {lang === 'zh' ? '請從左側點選案件以查看協尋與歸還細節' : 'Select an incident from the list to view resolution workflow.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Incident Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl text-white space-y-4"
              data-testid="create-lost-found-modal"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                    <PackageSearch className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{lang === 'zh' ? '登記新遺失物協尋案件' : 'New Lost Item Report'}</h3>
                    <p className="text-xs text-slate-400">{lang === 'zh' ? '客服與調度專用建檔' : 'Dispatch & Customer Desk'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'zh' ? '乘客姓名 *' : 'Passenger Name *'}</label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="e.g. David Chang / 渡辺 健二"
                    data-testid="new-lf-customer-name"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">{lang === 'zh' ? '聯絡電話' : 'Contact Phone'}</label>
                    <input
                      type="text"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="+886 912-345-678"
                      data-testid="new-lf-customer-phone"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400/40"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">{lang === 'zh' ? '關聯訂單編號' : 'Order No'}</label>
                    <input
                      type="text"
                      value={newOrderNo}
                      onChange={(e) => setNewOrderNo(e.target.value)}
                      placeholder="FP-1088"
                      data-testid="new-lf-order-no"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'zh' ? '物品類別' : 'Category'}</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as LostFoundIncident['itemCategory'])}
                    data-testid="new-lf-category-select"
                    className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-amber-400/40"
                  >
                    <option value="PHONE">📱 {lang === 'zh' ? '智慧型手機 / 平板' : 'Phone / Tablet'}</option>
                    <option value="WALLET">👛 {lang === 'zh' ? '皮夾 / 護照包 / 現金' : 'Wallet / Passport'}</option>
                    <option value="LUGGAGE">🧳 {lang === 'zh' ? '行李箱 / 手提袋' : 'Luggage / Bag'}</option>
                    <option value="KEYS">🔑 {lang === 'zh' ? '車鑰匙 / 感應門禁卡' : 'Keys / Keyfob'}</option>
                    <option value="DOCUMENT">📄 {lang === 'zh' ? '重要文件 / 合約 / 證件' : 'Documents / ID'}</option>
                    <option value="OTHER">📦 {lang === 'zh' ? '其他隨身物品' : 'Other'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{lang === 'zh' ? '遺失物外觀特徵與描述 *' : 'Item Description & Details *'}</label>
                  <textarea
                    rows={3}
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    placeholder="e.g. iPhone 15 Pro Titanium Blue left in backseat cup holder"
                    data-testid="new-lf-desc-input"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400/40"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateReport}
                  disabled={!newCustomerName.trim() || !newItemDesc.trim()}
                  data-testid="submit-new-lf-btn"
                >
                  {lang === 'zh' ? '立即發布協尋' : 'Create & Dispatch'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FleetOsPage>
  )
}
