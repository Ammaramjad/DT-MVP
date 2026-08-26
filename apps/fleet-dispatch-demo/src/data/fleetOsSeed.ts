import type {
  AuditLogEntry,
  CatalogProduct,
  Campaign,
  Driver,
  Order,
  PayoutRecord,
  RefundRequest,
  Role,
  Supplier,
  SupportTicket,
  SystemHealthMetric,
} from '../types'
import { genId } from './../lib/pricing'

function iso(daysFromNow: number, hour = 9): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

export const SUPPLIERS: Supplier[] = [
  { id: 'sup-direct', name: 'Direct B2C Marketplace', nameZh: '官網直營', channel: 'Website', status: 'ACTIVE', commissionPct: 0, avgConfirmMinutes: 0, activeOrders: 0, rating: 4.9, contactEmail: 'ops@zoufengpaiche.tw', productsListed: 42 },
  { id: 'sup-klook', name: 'Klook', nameZh: '客路', channel: 'Klook', status: 'ACTIVE', commissionPct: 18, avgConfirmMinutes: 6, activeOrders: 0, rating: 4.7, contactEmail: 'partners@klook.com', productsListed: 18 },
  { id: 'sup-kkday', name: 'KKday', nameZh: 'KKday', channel: 'KKday', status: 'ACTIVE', commissionPct: 16, avgConfirmMinutes: 4, activeOrders: 0, rating: 4.6, contactEmail: 'supply@kkday.com', productsListed: 22 },
  { id: 'sup-eztravel', name: 'ezTravel', nameZh: '易遊網', channel: 'ezTravel', status: 'ACTIVE', commissionPct: 15, avgConfirmMinutes: 8, activeOrders: 0, rating: 4.5, contactEmail: 'b2b@eztravel.com.tw', productsListed: 11 },
  { id: 'sup-booking', name: 'Booking.com', nameZh: 'Booking.com', channel: 'Booking.com', status: 'PAUSED', commissionPct: 20, avgConfirmMinutes: 12, activeOrders: 0, rating: 4.3, contactEmail: 'ground-transport@booking.com', productsListed: 7 },
  { id: 'sup-lineoa', name: 'LINE OA Storefront', nameZh: 'LINE官方帳號', channel: 'LINE@', status: 'ACTIVE', commissionPct: 5, avgConfirmMinutes: 2, activeOrders: 0, rating: 4.8, contactEmail: 'line-oa@zoufengpaiche.tw', productsListed: 9 },
]

export const CAMPAIGNS: Campaign[] = [
  { id: 'camp-flyhigh10', code: 'FLYHIGH10', name: 'Fly High 10% Off', nameZh: '飛航開幕 9折', kind: 'PERCENT', value: 10, startsAt: iso(-30), endsAt: iso(60), usageLimit: 5000, perUserLimit: 1, usedCount: 1284, status: 'ACTIVE', eligibility: 'All airport pickup/drop-off bookings' },
  { id: 'camp-nt100off', code: 'NT100OFF', name: 'NT$100 Off', nameZh: '折抵 NT$100', kind: 'FIXED', value: 100, startsAt: iso(-60), endsAt: iso(120), usageLimit: 10000, perUserLimit: 3, usedCount: 3021, status: 'ACTIVE', eligibility: 'All bookings over NT$500' },
  { id: 'camp-welcome50', code: 'WELCOME50', name: 'Welcome NT$50 Off', nameZh: '新客首單折抵 NT$50', kind: 'FIXED', value: 50, startsAt: iso(-180), endsAt: iso(365), usageLimit: 20000, perUserLimit: 1, usedCount: 8492, status: 'ACTIVE', eligibility: 'First-time customers only' },
  { id: 'camp-summer25', code: 'SUMMER25', name: 'Summer Charter 25% Off', nameZh: '夏日包車 75折', kind: 'PERCENT', value: 25, startsAt: iso(14), endsAt: iso(90), usageLimit: 2000, perUserLimit: 2, usedCount: 0, status: 'SCHEDULED', eligibility: 'Hourly charter & tour products only' },
  { id: 'camp-klook-exclusive', code: 'KLOOKVIP', name: 'Klook Exclusive 12% Off', nameZh: 'Klook 專屬 88折', kind: 'PERCENT', value: 12, startsAt: iso(-90), endsAt: iso(-3), usageLimit: 1500, perUserLimit: 1, usedCount: 1497, status: 'ENDED', eligibility: 'Klook channel bookings only' },
  { id: 'camp-cny-pause', code: 'CNYSPECIAL', name: 'CNY Golden Week Special', nameZh: '春節黃金週優惠', kind: 'FIXED', value: 150, startsAt: iso(-10), endsAt: iso(40), usageLimit: 800, perUserLimit: 1, usedCount: 212, status: 'PAUSED', eligibility: 'Intercity transfers during CNY period' },
]

export const ROLES: Role[] = [
  { id: 'role-super-admin', name: 'Super Admin', nameZh: '系統管理員', permissions: ['orders.manage', 'drivers.manage', 'suppliers.manage', 'campaigns.manage', 'finance.manage', 'roles.manage', 'audit.view', 'system.manage'], userCount: 2, twoFactorRequired: true },
  { id: 'role-ops-manager', name: 'Ops Manager', nameZh: '營運經理', permissions: ['orders.manage', 'drivers.manage', 'suppliers.manage', 'campaigns.manage', 'audit.view'], userCount: 5, twoFactorRequired: true },
  { id: 'role-dispatcher', name: 'Dispatcher', nameZh: '調度員', permissions: ['orders.manage', 'drivers.manage'], userCount: 12, twoFactorRequired: false },
  { id: 'role-finance', name: 'Finance', nameZh: '財務', permissions: ['finance.manage', 'audit.view'], userCount: 3, twoFactorRequired: true },
  { id: 'role-support', name: 'Support Agent', nameZh: '客服人員', permissions: ['orders.manage', 'support.manage'], userCount: 8, twoFactorRequired: false },
  { id: 'role-read-only', name: 'Read-only Analyst', nameZh: '數據分析(只讀)', permissions: ['audit.view'], userCount: 4, twoFactorRequired: false },
]

export const SYSTEM_HEALTH: SystemHealthMetric[] = [
  { id: 'sys-dispatch-engine', name: 'Dispatch Engine', status: 'OPERATIONAL', latencyMs: 82, uptimePct: 99.98, lastIncident: null, acknowledged: true },
  { id: 'sys-maps-routing', name: 'Maps & Routing (OSRM)', status: 'OPERATIONAL', latencyMs: 210, uptimePct: 99.9, lastIncident: iso(-6), acknowledged: true },
  { id: 'sys-payments', name: 'Payment Gateway', status: 'DEGRADED', latencyMs: 640, uptimePct: 99.2, lastIncident: iso(0, 2), acknowledged: false },
  { id: 'sys-line-notify', name: 'LINE Notify / Messaging API', status: 'OPERATIONAL', latencyMs: 145, uptimePct: 99.95, lastIncident: iso(-14), acknowledged: true },
  { id: 'sys-sms-gateway', name: 'SMS Gateway', status: 'OPERATIONAL', latencyMs: 320, uptimePct: 99.7, lastIncident: iso(-20), acknowledged: true },
  { id: 'sys-einvoice', name: 'E-Invoice Service', status: 'DOWN', latencyMs: 0, uptimePct: 97.4, lastIncident: iso(0, 8), acknowledged: false },
  { id: 'sys-supplier-adapters', name: 'Supplier Adapters (Klook/KKday/ezTravel)', status: 'OPERATIONAL', latencyMs: 410, uptimePct: 99.5, lastIncident: iso(-3), acknowledged: true },
]

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  { id: 'cat-tpe-taipei-sedan', name: 'TPE Airport \u2192 Taipei City (Sedan)', nameZh: '桃機 \u2192 台北市區（轎車）', routeLabel: 'TPE \u2194 Taipei', vehicleType: 'SEDAN', basePrice: 1350, status: 'PUBLISHED', inventory: 48, region: 'TAOYUAN' },
  { id: 'cat-tpe-taipei-van', name: 'TPE Airport \u2192 Taipei City (Van)', nameZh: '桃機 \u2192 台北市區（廂型車）', routeLabel: 'TPE \u2194 Taipei', vehicleType: 'VAN', basePrice: 1800, status: 'PUBLISHED', inventory: 30, region: 'TAOYUAN' },
  { id: 'cat-tsa-taipei-luxury', name: 'TSA Airport \u2192 Taipei City (Luxury)', nameZh: '松山機場 \u2192 台北市區（豪華轎車）', routeLabel: 'TSA \u2194 Taipei', vehicleType: 'LUXURY', basePrice: 2200, status: 'PUBLISHED', inventory: 14, region: 'TAIPEI' },
  { id: 'cat-jiufen-charter', name: 'Jiufen & Shifen Full-Day Charter', nameZh: '九份十分一日包車', routeLabel: 'Taipei \u2194 Jiufen', vehicleType: 'VAN', basePrice: 4200, status: 'PUBLISHED', inventory: 20, region: 'NEW_TAIPEI' },
  { id: 'cat-sunmoonlake-charter', name: 'Sun Moon Lake Day Charter', nameZh: '日月潭一日包車', routeLabel: 'Taichung \u2194 Sun Moon Lake', vehicleType: 'SUV', basePrice: 5200, status: 'PUBLISHED', inventory: 12, region: 'NANTOU' },
  { id: 'cat-khh-airport-sedan', name: 'KHH Airport \u2192 Kaohsiung City (Sedan)', nameZh: '高雄機場 \u2192 高雄市區（轎車）', routeLabel: 'KHH \u2194 Kaohsiung', vehicleType: 'SEDAN', basePrice: 650, status: 'PUBLISHED', inventory: 26, region: 'KAOHSIUNG' },
  { id: 'cat-hualien-taroko', name: 'Taroko Gorge Half-Day Tour', nameZh: '太魯閣半日遊', routeLabel: 'Hualien \u2194 Taroko', vehicleType: 'SUV', basePrice: 3400, status: 'PUBLISHED', inventory: 9, region: 'HUALIEN' },
  { id: 'cat-hsr-intercity', name: 'HSR Station Intercity Transfer', nameZh: '高鐵站城際接送', routeLabel: 'Taoyuan HSR \u2194 Taichung HSR', vehicleType: 'SEDAN', basePrice: 2800, status: 'DRAFT', inventory: 0, region: 'TAICHUNG' },
  { id: 'cat-minibus-group', name: 'Group Tour Minibus (12-seat)', nameZh: '團體巴士（12人座）', routeLabel: 'Taipei \u2194 Anywhere', vehicleType: 'MINIBUS', basePrice: 6800, status: 'ARCHIVED', inventory: 0, region: 'TAIPEI' },
]

export function buildFleetOsSeed(orders: Order[], drivers: Driver[]): {
  suppliers: Supplier[]
  campaigns: Campaign[]
  supportTickets: SupportTicket[]
  refundRequests: RefundRequest[]
  roles: Role[]
  systemHealth: SystemHealthMetric[]
  catalogProducts: CatalogProduct[]
  payouts: PayoutRecord[]
  globalAuditLog: AuditLogEntry[]
} {
  const supplierChannelCounts = new Map<string, number>()
  for (const o of orders) {
    if (['DRAFT', 'CANCELLED', 'COMPLETED', 'FAILED', 'REFUNDED'].includes(o.status)) continue
    supplierChannelCounts.set(o.channel, (supplierChannelCounts.get(o.channel) ?? 0) + 1)
  }
  const suppliers = SUPPLIERS.map((s) => ({ ...s, activeOrders: supplierChannelCounts.get(s.channel) ?? 0 }))

  const cancelledOrPendingRefund = orders.filter((o) => o.status === 'CANCELLATION_REQUESTED')
  const refundPendingOrders = orders.filter((o) => o.status === 'REFUND_PENDING')

  const supportTickets: SupportTicket[] = [
    ...cancelledOrPendingRefund.slice(0, 4).map((o, i) => ({
      id: genId('tix'),
      ticketNo: `SUP-${2200 + i}`,
      orderId: o.id,
      orderNo: o.orderNo,
      customerName: o.customer.name,
      subject: 'Cancellation request needs review',
      category: 'Cancellation',
      status: (i % 3 === 0 ? 'OPEN' : 'IN_PROGRESS') as SupportTicket['status'],
      priority: (i % 2 === 0 ? 'HIGH' : 'MEDIUM') as SupportTicket['priority'],
      createdAt: Date.now() - (30 + i * 15) * 60_000,
      updatedAt: Date.now() - i * 5 * 60_000,
      messages: [
        { id: genId('msg'), from: 'CUSTOMER' as const, text: `I need to cancel order ${o.orderNo}, my plans changed.`, at: Date.now() - (30 + i * 15) * 60_000 },
      ],
    })),
    {
      id: genId('tix'),
      ticketNo: 'SUP-2101',
      orderId: null,
      orderNo: null,
      customerName: 'Isabelle Laurent',
      subject: 'App keeps showing wrong driver photo',
      category: 'App bug',
      status: 'RESOLVED',
      priority: 'LOW',
      createdAt: Date.now() - 2 * 86_400_000,
      updatedAt: Date.now() - 2 * 86_400_000 + 3_600_000,
      messages: [
        { id: genId('msg'), from: 'CUSTOMER' as const, text: 'The driver photo does not match who picked me up.', at: Date.now() - 2 * 86_400_000 },
        { id: genId('msg'), from: 'AGENT' as const, text: 'Thanks for flagging — fixed the cached profile photo. Sorry about that!', at: Date.now() - 2 * 86_400_000 + 3_600_000 },
      ],
    },
    {
      id: genId('tix'),
      ticketNo: 'SUP-2098',
      orderId: null,
      orderNo: null,
      customerName: 'Marcus Webb',
      subject: 'Driver took a longer route than expected',
      category: 'Trip experience',
      status: 'OPEN',
      priority: 'MEDIUM',
      createdAt: Date.now() - 5 * 3_600_000,
      updatedAt: Date.now() - 5 * 3_600_000,
      messages: [{ id: genId('msg'), from: 'CUSTOMER' as const, text: 'Route seemed 10 minutes longer than Google Maps suggested.', at: Date.now() - 5 * 3_600_000 }],
    },
  ]

  const refundRequests: RefundRequest[] = refundPendingOrders.map((o) => ({
    id: genId('rfd'),
    orderId: o.id,
    orderNo: o.orderNo,
    customerName: o.customer.name,
    amount: o.priceEstimate,
    reason: o.cancellationReason ?? 'Customer requested cancellation',
    status: 'PENDING' as const,
    requestedAt: Date.now() - 20 * 60_000,
    resolvedAt: null,
  }))

  const payouts: PayoutRecord[] = drivers.map((d, i) => ({
    id: genId('pay'),
    driverId: d.id,
    driverName: d.name,
    period: 'This week',
    grossAmount: 8000 + i * 640,
    commission: Math.round((8000 + i * 640) * 0.15),
    netAmount: Math.round((8000 + i * 640) * 0.85),
    status: (i % 4 === 0 ? 'PAID' : i % 3 === 0 ? 'PROCESSING' : 'PENDING') as PayoutRecord['status'],
    method: 'Bank transfer (mock)',
  }))

  const globalAuditLog: AuditLogEntry[] = [
    { id: genId('aud'), at: Date.now() - 3_600_000, actor: 'ops.chen@zoufengpaiche.tw', action: 'Updated commission rate for KKday to 16%', targetType: 'Supplier', targetId: 'sup-kkday' },
    { id: genId('aud'), at: Date.now() - 7_200_000, actor: 'system', action: 'Paused Booking.com supplier after 3 late confirmations', targetType: 'Supplier', targetId: 'sup-booking' },
    { id: genId('aud'), at: Date.now() - 86_400_000, actor: 'finance@zoufengpaiche.tw', action: 'Processed weekly driver payout batch', targetType: 'Payout', targetId: 'batch-week' },
  ]

  return { suppliers, campaigns: CAMPAIGNS, supportTickets, refundRequests, roles: ROLES, systemHealth: SYSTEM_HEALTH, catalogProducts: CATALOG_PRODUCTS, payouts, globalAuditLog }
}
