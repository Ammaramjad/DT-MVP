// Records a walkthrough video of this round's trip-lifecycle realism
// additions: driver-info-reveal timing, vehicle-substitution transparency,
// and the late-boarding waiting fee — using the dev store hook to force
// deterministic, watchable states (the same technique e2e/realism-features.mjs
// uses) rather than waiting on random dispatch timing.
// Usage: node e2e/record-trip-lifecycle-realism.mjs [port]
import { chromium } from 'playwright'
import fs from 'node:fs'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`
const videoDir = '/tmp/pw-video-trip-lifecycle'
fs.mkdirSync(videoDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
})
const page = await context.newPage()
const wait = (ms) => page.waitForTimeout(ms)

try {
  await page.goto(BASE + '/customer', { waitUntil: 'networkidle' })
  await wait(800)

  // ---- Set up two forced states directly via the dev store hook ----
  const setup = await page.evaluate(() => {
    const store = window.__fleetStore
    const state = store.getState()

    // 1. Driver-info-reveal + vehicle-substitution: an ASSIGNED trip 20h out
    // whose dispatched vehicle category differs from what was booked (a
    // compatible-but-not-identical substitution, Wanma-style), with driver
    // contact details still withheld (機場快綫/萬馬接送-style reveal timing).
    const driverA = state.drivers.find((d) => d.vehicleId)
    const vehicleA = state.vehicles.find((v) => v.id === driverA.vehicleId)
    const revealOrder = state.orders.find((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
    const substituteCategory = vehicleA.category === 'VAN_9' ? 'VAN_6' : 'VAN_9'
    const scheduledTime = new Date(Date.now() + 20 * 60 * 60_000).toISOString()
    let orders = state.orders.map((o) =>
      o.id === revealOrder.id
        ? { ...o, status: 'ASSIGNED', driverId: driverA.id, vehicleId: driverA.vehicleId, vehicleCategory: substituteCategory, driverInfoRevealOverride: false, scheduledTime, bookingUrgency: 'STANDARD' }
        : o,
    )

    // 2. Late-boarding waiting fee: a second driver with an ARRIVED trip,
    // waitStartedAt 20 minutes in the past (past the 15-min grace period).
    const activeDriverIds = new Set(orders.filter((o) => o.driverId && !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status)).map((o) => o.driverId))
    const driverB = state.drivers.find((d) => d.vehicleId && d.id !== driverA.id && !activeDriverIds.has(d.id))
    const waitOrder = orders.find((o) => o.id !== revealOrder.id && o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
    orders = orders.map((o) =>
      o.id === waitOrder.id ? { ...o, status: 'ARRIVED', driverId: driverB.id, vehicleId: driverB.vehicleId, waitStartedAt: Date.now() - 20 * 60_000, waitingFeeAgreed: false } : o,
    )

    store.setState({ orders, focusOrderId: revealOrder.id })
    return { driverBId: driverB.id, substituteCategory, revealOrderNo: revealOrder.orderNo, waitOrderNo: waitOrder.orderNo }
  })
  console.log('Forced demo states:', setup)

  // ---- Part 1: Customer App — driver-info-reveal + vehicle-substitution ----
  // (No page reload here — that would wipe the in-memory store state we just
  // forced above. Navigate purely within the already-loaded SPA instead.)
  await page.click('[data-testid="customer-tab-trips"]')
  await page.click('[data-testid="trips-filter-active"]').catch(() => {})
  await page.waitForSelector('[data-testid="customer-driver-not-revealed-card"]')
  await wait(2200)

  await page.locator('[data-testid="customer-vehicle-substituted-notice"]').scrollIntoViewIfNeeded().catch(() => {})
  await wait(2200)

  await page.click('[data-testid="customer-reveal-driver-now"]')
  await page.waitForSelector('[data-testid="customer-driver-revealed-card"]')
  await wait(2600)

  // ---- Part 2: Driver App — late-boarding waiting fee ----
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.click('[data-testid="demo-link-driver"]')
  await wait(600)
  await page.waitForSelector('[data-testid="driver-app-header"]')
  await page.click('[data-testid="driver-tab-account"]')
  await page.waitForSelector('[data-testid="driver-select"]')
  await page.selectOption('[data-testid="driver-select"]', setup.driverBId)
  await page.click('[data-testid="driver-tab-home"]')
  await page.waitForSelector('[data-testid="driver-wait-timer"]')
  await wait(2400)

  await page.waitForSelector('[data-testid="driver-agree-to-wait"]')
  await wait(1600)
  await page.click('[data-testid="driver-agree-to-wait"]')
  await wait(2200)

  console.log('✅ Trip-lifecycle-realism walkthrough recorded')
} catch (err) {
  console.error('❌ Recording failed:', err)
  process.exitCode = 1
} finally {
  await context.close()
  await browser.close()
  const files = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'))
  console.log('Video file:', files[0] ? `${videoDir}/${files[0]}` : 'NONE')
}
