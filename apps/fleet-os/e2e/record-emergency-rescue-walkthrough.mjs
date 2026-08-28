// Records an end-to-end screen recording walkthrough video of the Emergency Incident SOS,
// Fleet OS Emergency Alert & Rescue Re-dispatch Drawer, Rescue Driver acceptance, and Customer App Tracking.
// Usage: node e2e/record-emergency-rescue-walkthrough.mjs [port]
import { chromium } from 'playwright'
import fs from 'node:fs'

const PORT = process.argv[2] || 5183
const BASE = `http://localhost:${PORT}`
const videoDir = '/tmp/pw-video-emergency'
const OUT = '/opt/cursor/artifacts'
fs.mkdirSync(videoDir, { recursive: true })
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
})
const page = await context.newPage()
const wait = (ms) => page.waitForTimeout(ms)

const gotoApp = async (routeSlug) => {
  const linkId = routeSlug === 'fleet-os' ? 'control' : routeSlug
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.click(`[data-testid="demo-link-${linkId}"]`)
  await wait(800)
}

try {
  console.log('1. Setting up active trip in Driver App…')
  await page.goto(BASE + '/driver', { waitUntil: 'networkidle' })
  await wait(1000)

  // Seed active order
  const orderInfo = await page.evaluate(() => {
    const store = window.__fleetStore
    const state = store.getState()
    const driver = state.drivers[0]
    const vehicle = state.vehicles.find((v) => v.id === driver.vehicleId)

    const order = state.createOrder({
      channel: 'Website',
      pickupId: 'tpe-airport',
      dropoffId: 'taipei-101',
      scheduledTime: new Date().toISOString(),
      vehicleType: 'SEDAN',
      vehicleCategory: 'COMFORT_SEDAN',
      passengers: 2,
      luggage: 2,
      customer: { name: 'Sophia Chen', phone: '+886 912-345-678', email: 'sophia@example.com' },
      flightNumber: 'CI101',
      notes: 'VIP guest on arrival',
      paymentMethod: 'card',
      bookingUrgency: 'STANDARD',
    })

    const updated = {
      ...order,
      status: 'PASSENGER_ONBOARD',
      driverId: driver.id,
      vehicleId: vehicle?.id ?? null,
      legProgress: 0.42,
      currentPos: { lat: 25.075, lng: 121.392, x: 270, y: 195 },
    }

    store.setState({
      orders: state.orders.map((o) => (o.id === order.id ? updated : o)),
      drivers: state.drivers.map((d) => (d.id === driver.id ? { ...d, status: 'BUSY' } : d)),
      focusOrderId: order.id,
      focusDriverId: driver.id,
    })

    return { id: order.id, orderNo: order.orderNo, driverId: driver.id }
  })

  await wait(1200)

  // 2. Driver triggers Emergency SOS
  console.log('2. Reporting Emergency SOS in Driver App…')
  await page.click('[data-testid="driver-report-emergency-btn"]')
  await wait(1200)
  await page.click('[data-testid="emergency-type-breakdown"]')
  await wait(600)
  await page.click('[data-testid="emergency-passenger-safe-btn"]')
  await wait(600)
  await page.fill('[data-testid="emergency-note-input"]', 'Vehicle breakdown on highway shoulder. Passenger safe and waiting.')
  await wait(800)
  await page.click('[data-testid="emergency-submit-btn"]')
  await wait(1500)

  // 3. Jump to Fleet OS to inspect flashing Emergency Banner
  console.log('3. Viewing Emergency Alert Banner in Fleet OS…')
  await gotoApp('fleet-os')
  await wait(1500)

  // Open Emergency Rescue Dispatch Drawer
  const openDrawerBtn = page.locator('[data-testid^="open-rescue-drawer-btn-"]').first()
  await openDrawerBtn.click()
  await wait(1800)

  // Dispatch rescue driver
  console.log('4. Dispatching nearest compatible rescue driver…')
  const firstCandBtn = page.locator('[data-testid^="dispatch-rescue-driver-btn-"]').first()
  await firstCandBtn.click()
  await wait(1500)
  await page.click('[data-testid="emergency-drawer-close"]')
  await wait(800)

  // 4. Switch to replacement driver in Driver App
  const rescueInfo = await page.evaluate(() => {
    const store = window.__fleetStore
    const order = store.getState().orders.find((o) => o.incidentReportedAt)
    const dId = order?.rescueDriverId
    if (dId) {
      store.setState({ focusDriverId: dId })
    }
    return { orderId: order?.id, rescueDriverId: dId }
  })

  console.log('5. Accepting rescue mission in Replacement Driver App…', rescueInfo)
  await gotoApp('driver')
  await page.evaluate((dId) => {
    const store = window.__fleetStore
    if (dId) store.setState({ focusDriverId: dId })
  }, rescueInfo.rescueDriverId)
  await wait(800)
  await page.waitForSelector('[data-testid="incoming-request-modal"]')
  await page.click('[data-testid="accept-request-button"]')
  await wait(1500)

  // 5. Customer App Reassurance and Tracking
  console.log('6. Checking Customer App live rescue tracking…')
  await gotoApp('customer')
  await page.click('[data-testid="customer-tab-trips"]')
  await page.evaluate((oId) => {
    const store = window.__fleetStore
    if (oId) store.setState({ focusOrderId: oId })
  }, rescueInfo.orderId)
  await wait(2200)

  console.log('🎉 Emergency Rescue walkthrough recording complete!')
} catch (err) {
  console.error('Walkthrough recording error:', err)
} finally {
  await page.close()
  await context.close()
  await browser.close()

  const files = fs.readdirSync(videoDir)
  const videoFile = files.find((f) => f.endsWith('.webm'))
  if (videoFile) {
    const sourcePath = `${videoDir}/${videoFile}`
    const targetPath = `${OUT}/video_emergency_rescue_redispatch_walkthrough.mp4`
    fs.copyFileSync(sourcePath, targetPath)
    console.log(`📹 Saved video artifact to: ${targetPath}`)
  }
}
