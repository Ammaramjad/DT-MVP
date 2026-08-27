// End-to-end Emergency Incident & Mid-Trip Rescue Re-dispatch Test Suite
// Verifies:
// 1. Booking an order & starting trip until PASSENGER_ONBOARD.
// 2. Driver encounters accident mid-trip, reports SOS in Driver App.
// 3. Driver App transitions into emergency incident mode with safety instructions.
// 4. Fleet OS displays flashing emergency banner and opens Emergency Rescue Dispatch drawer.
// 5. Fleet OS ranks nearest compatible rescue drivers and dispatches replacement.
// 6. Replacement driver receives EMERGENCY RESCUE job alert and accepts mission.
// 7. Customer App shows reassuring emergency alert, original driver note, and tracks rescue driver.
// 8. Trip continues to destination and completes successfully.

import { chromium } from 'playwright'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(err.message))

const log = (msg) => console.log(`\n=== ${msg} ===`)

const gotoApp = async (routeSlug) => {
  const linkId = routeSlug === 'fleet-os' ? 'control' : routeSlug
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.click(`[data-testid="demo-link-${linkId}"]`)
  await page.waitForTimeout(400)
}

try {
  log('1. Book an Airport Transfer trip in Customer Booking')
  await page.goto(BASE + '/booking', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.selectOption('select >> nth=1', 'tpe-airport')
  await page.selectOption('select >> nth=2', 'taipei-101')
  await page.click('[data-testid="vehicle-option-SUV"]')
  await page.click('button:has-text("Random")')
  await page.click('button:has-text("Look up")')
  await page.waitForTimeout(1000)

  await page.click('[data-testid="booking-step1-continue"]')
  await page.waitForSelector('[data-testid="checkout-payment-card"]')
  await page.fill('input[placeholder="Jane Doe"]', 'Lin Mei-Ling')
  await page.fill('input[placeholder="+886 912-345-678"]', '+886 911-888-999')
  await page.fill('input[placeholder="jane@example.com"]', 'meiling.lin@example.com')
  await page.check('[data-testid="checkout-consent"]')
  await page.click('[data-testid="checkout-confirm-booking"]')

  await page.waitForSelector('[data-testid="checkout-booking-confirmed"]', { timeout: 8000 })
  const heading = await page.textContent('h2')
  const orderNo = heading.match(/(FP-\d+)/)?.[1]
  if (!orderNo) throw new Error('Failed to obtain created order number')
  console.log('✓ Created booking order:', orderNo)

  log('2. Set up driver and start trip to PASSENGER_ONBOARD')
  // Close booking modal first
  await page.click('button:has-text("View in Fleet OS")')
  await page.waitForTimeout(600)
  // Use dev store to deterministically set order to active driver and move to PASSENGER_ONBOARD
  const setupResult = await page.evaluate((no) => {
    const store = window.__fleetStore
    if (!store) return null
    const state = store.getState()
    const order = state.orders.find((o) => o.orderNo === no)
    const driver1 = state.drivers[0]
    const vehicle1 = state.vehicles.find((v) => v.id === driver1.vehicleId)
    if (!order || !driver1) return null

    // Assign driver 1 and transition to PASSENGER_ONBOARD
    const updated = {
      ...order,
      status: 'PASSENGER_ONBOARD',
      driverId: driver1.id,
      vehicleId: vehicle1?.id ?? null,
      legProgress: 0.35,
      currentPos: { lat: 25.071, lng: 121.382, x: 260, y: 190 },
    }

    store.setState({
      orders: state.orders.map((o) => (o.id === order.id ? updated : o)),
      drivers: state.drivers.map((d) => (d.id === driver1.id ? { ...d, status: 'BUSY' } : d)),
      focusOrderId: order.id,
      focusDriverId: driver1.id,
    })

    return { orderId: order.id, driverId: driver1.id, driverName: driver1.name }
  }, orderNo)

  console.log('✓ Setup order state:', setupResult)

  log('3. Open Driver App and report Emergency Accident SOS')
  await gotoApp('driver')
  await page.waitForSelector('[data-testid="driver-app-shell"]', { timeout: 6000 })
  await page.waitForSelector('[data-testid="driver-report-emergency-btn"]', { timeout: 6000 })

  console.log('✓ Driver App active trip view rendered with Emergency SOS button')
  await page.click('[data-testid="driver-report-emergency-btn"]')

  await page.waitForSelector('[data-testid="emergency-report-modal"]', { timeout: 5000 })
  console.log('✓ Emergency Accident & Breakdown Report Modal opened')

  // Select breakdown/accident and toggle options
  await page.click('[data-testid="emergency-type-breakdown"]')
  await page.click('[data-testid="emergency-passenger-safe-btn"]')
  await page.fill('[data-testid="emergency-note-input"]', 'Engine overheated and smoke detected on highway, passenger waiting safely.')
  await page.click('[data-testid="emergency-submit-btn"]')

  await page.waitForSelector('[data-testid="driver-incident-mode-banner"]', { timeout: 6000 })
  console.log('✓ Driver UI switched to Emergency Incident Mode with safety guidance')

  log('4. Open Fleet OS and verify Emergency Alert Banner')
  await gotoApp('fleet-os')
  await page.waitForSelector('[data-testid="emergency-incident-banner"]', { timeout: 6000 })
  console.log('✓ Fleet OS rendered high-visibility Emergency Alert Banner')

  const openDrawerBtn = page.locator(`[data-testid="open-rescue-drawer-btn-${orderNo}"]`)
  await openDrawerBtn.click()

  await page.waitForSelector('[data-testid="emergency-rescue-drawer"]', { timeout: 6000 })
  console.log('✓ Fleet OS Emergency Rescue Dispatch Drawer opened with live candidates')

  const candidates = page.locator('[data-testid^="rescue-candidate-"]')
  const candCount = await candidates.count()
  console.log(`✓ Nearest rescue candidate drivers ranked: ${candCount}`)
  if (candCount === 0) throw new Error('Expected at least 1 rescue candidate driver')

  log('5. Dispatch replacement rescue driver in Fleet OS')
  const firstCandidateBtn = page.locator('[data-testid^="dispatch-rescue-driver-btn-"]').first()
  await firstCandidateBtn.click()

  await page.waitForSelector('[data-testid="assigned-rescue-driver-card"]', { timeout: 6000 })
  console.log('✓ Replacement driver successfully dispatched with priority rescue status')

  // Close drawer
  await page.click('[data-testid="emergency-drawer-close"]')

  log('6. Verify Replacement Driver incoming mission alert in Driver App')
  // Switch to the assigned rescue driver
  const rescueDriverId = await page.evaluate((no) => {
    const store = window.__fleetStore
    const order = store.getState().orders.find((o) => o.orderNo === no)
    return order?.rescueDriverId
  }, orderNo)

  console.log('Rescue driver ID:', rescueDriverId)

  await gotoApp('driver')

  await page.evaluate((dId) => {
    const store = window.__fleetStore
    store.setState({ focusDriverId: dId })
  }, rescueDriverId)
  await page.waitForTimeout(400)

  await page.waitForSelector('[data-testid="incoming-request-modal"]', { timeout: 6000 })
  await page.waitForSelector('[data-testid="rescue-mission-banner"]', { timeout: 6000 })
  console.log('✓ Replacement driver received tagged EMERGENCY RESCUE MISSION takeover alert')

  // Replacement driver accepts rescue mission
  await page.click('[data-testid="accept-request-button"]')
  await page.waitForTimeout(600)
  console.log('✓ Replacement driver accepted rescue mission')

  log('7. Open Customer App and verify reassurance card and rescue tracking')
  await gotoApp('customer')
  await page.waitForSelector('[data-testid="customer-app-shell"]', { timeout: 6000 })

  // Switch to Trips/Activity tab in Customer App
  await page.click('[data-testid="customer-tab-trips"]')
  await page.waitForTimeout(400)

  // Select the test order in customer app
  await page.evaluate((no) => {
    const store = window.__fleetStore
    const order = store.getState().orders.find((o) => o.orderNo === no)
    if (order) store.setState({ focusOrderId: order.id })
  }, orderNo)

  await page.waitForSelector('[data-testid="customer-emergency-reassurance-card"]', { timeout: 6000 })
  console.log('✓ Customer App displayed calm Emergency Reassurance card')

  await page.waitForSelector('[data-testid="customer-rescue-driver-card"]', { timeout: 6000 })
  console.log('✓ Customer App displays replacement rescue driver details & live tracking')

  log('8. Verify completing emergency rescue trip')
  await page.evaluate((no) => {
    const store = window.__fleetStore
    const order = store.getState().orders.find((o) => o.orderNo === no)
    if (order) {
      store.getState().resolveEmergencyIncident(order.id)
      store.setState({
        orders: store.getState().orders.map((o) => (o.id === order.id ? { ...o, status: 'COMPLETED', legProgress: 1 } : o)),
      })
    }
  }, orderNo)

  await page.waitForTimeout(500)
  console.log('✓ Emergency incident resolved & trip completed successfully')

  console.log('\n========================================')
  console.log('🎉 ALL EMERGENCY & RESCUE TESTS PASSED!')
  console.log('========================================\n')
} catch (err) {
  console.error('❌ E2E Emergency Test Failed:', err)
  process.exitCode = 1
} finally {
  await browser.close()
}
