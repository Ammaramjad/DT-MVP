// Generates walkthrough artifact screenshots of the new Emergency Incident & Rescue Re-dispatch flow
import { chromium } from 'playwright'
import fs from 'node:fs'

const PORT = process.argv[2] || 5183
const BASE = `http://localhost:${PORT}`
const OUT = '/opt/cursor/artifacts'

fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

const wait = (ms) => page.waitForTimeout(ms)

const gotoApp = async (routeSlug) => {
  const linkId = routeSlug === 'fleet-os' ? 'control' : routeSlug
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.click(`[data-testid="demo-link-${linkId}"]`)
  await wait(500)
}

try {
  console.log('1. Setting up active trip for Driver App screenshot…')
  await page.goto(BASE + '/booking', { waitUntil: 'networkidle' })
  await wait(800)

  // Create an active order in PASSENGER_ONBOARD state via store
  const orderId = await page.evaluate(() => {
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
      notes: 'Please meet at Arrival Hall Gate 2',
      paymentMethod: 'card',
      bookingUrgency: 'STANDARD',
    })

    const updated = {
      ...order,
      status: 'PASSENGER_ONBOARD',
      driverId: driver.id,
      vehicleId: vehicle?.id ?? null,
      legProgress: 0.4,
      currentPos: { lat: 25.075, lng: 121.392, x: 270, y: 195 },
    }

    store.setState({
      orders: state.orders.map((o) => (o.id === order.id ? updated : o)),
      drivers: state.drivers.map((d) => (d.id === driver.id ? { ...d, status: 'BUSY' } : d)),
      focusOrderId: order.id,
      focusDriverId: driver.id,
    })

    return order.id
  })

  // 1. Driver App with prominent Emergency SOS button
  await gotoApp('driver')
  await page.waitForSelector('[data-testid="driver-report-emergency-btn"]')
  await wait(600)
  await page.screenshot({ path: `${OUT}/screenshot_driver_app_active_sos_button.png` })
  console.log('📸 screenshot_driver_app_active_sos_button.png')

  // 2. Driver App opening Emergency Report Modal
  await page.click('[data-testid="driver-report-emergency-btn"]')
  await page.waitForSelector('[data-testid="emergency-report-modal"]')
  await page.click('[data-testid="emergency-type-breakdown"]')
  await page.fill('[data-testid="emergency-note-input"]', 'Vehicle radiator overheated on highway shoulder. Passenger safe outside vehicle.')
  await wait(600)
  await page.screenshot({ path: `${OUT}/screenshot_driver_emergency_report_modal.png` })
  console.log('📸 screenshot_driver_emergency_report_modal.png')

  // Submit Emergency
  await page.click('[data-testid="emergency-submit-btn"]')
  await page.waitForSelector('[data-testid="driver-incident-mode-banner"]')
  await wait(600)
  await page.screenshot({ path: `${OUT}/screenshot_driver_incident_mode_active.png` })
  console.log('📸 screenshot_driver_incident_mode_active.png')

  // 3. Fleet OS with Flashing Emergency Alert Banner
  await gotoApp('fleet-os')
  await page.waitForSelector('[data-testid="emergency-incident-banner"]')
  await wait(800)
  await page.screenshot({ path: `${OUT}/screenshot_fleet_os_emergency_banner.png` })
  console.log('📸 screenshot_fleet_os_emergency_banner.png')

  // 4. Fleet OS Emergency Rescue Dispatch Drawer
  const openDrawerBtn = page.locator('[data-testid^="open-rescue-drawer-btn-"]').first()
  await openDrawerBtn.click()
  await page.waitForSelector('[data-testid="emergency-rescue-drawer"]')
  await wait(800)
  await page.screenshot({ path: `${OUT}/screenshot_fleet_os_emergency_rescue_drawer.png` })
  console.log('📸 screenshot_fleet_os_emergency_rescue_drawer.png')

  // Dispatch rescue driver
  const firstCandBtn = page.locator('[data-testid^="dispatch-rescue-driver-btn-"]').first()
  await firstCandBtn.click()
  await page.waitForSelector('[data-testid="assigned-rescue-driver-card"]')
  await wait(600)
  await page.screenshot({ path: `${OUT}/screenshot_fleet_os_rescue_driver_dispatched.png` })
  console.log('📸 screenshot_fleet_os_rescue_driver_dispatched.png')
  await page.click('[data-testid="emergency-drawer-close"]')

  // 5. Replacement Driver incoming mission modal in Driver App
  const rescueInfo = await page.evaluate(() => {
    const store = window.__fleetStore
    const order = store.getState().orders.find((o) => o.incidentReportedAt)
    const dId = order?.rescueDriverId
    if (dId) {
      store.setState({ focusDriverId: dId })
    }
    return { orderId: order?.id, rescueDriverId: dId, pendingDriverId: order?.pendingDriverId, status: order?.status }
  })

  console.log('Rescue Info:', rescueInfo)

  await gotoApp('driver')
  await page.evaluate((dId) => {
    const store = window.__fleetStore
    if (dId) store.setState({ focusDriverId: dId })
  }, rescueInfo.rescueDriverId)
  await wait(600)
  await page.waitForSelector('[data-testid="incoming-request-modal"]')
  await page.screenshot({ path: `${OUT}/screenshot_rescue_driver_mission_incoming_alert.png` })
  console.log('📸 screenshot_rescue_driver_mission_incoming_alert.png')

  // Rescue driver accepts mission
  await page.click('[data-testid="accept-request-button"]')
  await wait(500)

  // 6. Customer App Reassurance and Rescue Tracking
  await gotoApp('customer')
  await page.click('[data-testid="customer-tab-trips"]')
  await page.evaluate((oId) => {
    const store = window.__fleetStore
    if (oId) store.setState({ focusOrderId: oId })
  }, rescueInfo.orderId)
  await wait(500)
  await page.waitForSelector('[data-testid="customer-emergency-reassurance-card"]')
  await page.waitForSelector('[data-testid="customer-rescue-driver-card"]')
  await page.screenshot({ path: `${OUT}/screenshot_customer_emergency_reassurance_tracking.png` })
  console.log('📸 screenshot_customer_emergency_reassurance_tracking.png')

  console.log('🎉 Successfully created all emergency rescue walkthrough screenshots!')
} catch (err) {
  console.error('Error generating screenshots:', err)
} finally {
  await browser.close()
}
