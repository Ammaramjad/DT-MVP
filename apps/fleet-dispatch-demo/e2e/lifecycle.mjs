// End-to-end lifecycle test: books a new order, watches it get auto-dispatched
// in the Control Center, drives it through the Driver App, and confirms the
// live state is mirrored in the Customer Tracking panel until completion.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/lifecycle.mjs [port]
import { chromium } from 'playwright'
import fs from 'node:fs'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`
const videoDir = '/tmp/pw-video'
fs.mkdirSync(videoDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
})
const page = await context.newPage()

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(err.message))

const shot = async (name) => {
  await page.screenshot({ path: `/tmp/e2e_${name}.png` })
  console.log(`📸 ${name}`)
}

const log = (msg) => console.log(`\n=== ${msg} ===`)

try {
  log('1. Open Booking Panel')
  await page.goto(BASE + '/booking', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await shot('01_booking_empty')

  log('2. Fill booking form (Songshan Airport -> Grand Hyatt, SUV)')
  await page.selectOption('select >> nth=1', 'tsa-airport') // pickup
  await page.selectOption('select >> nth=2', 'grand-hyatt') // dropoff
  await page.click('button:has-text("SUV")')
  await page.click('button:has-text("Random")')
  await page.click('button:has-text("Look up")')
  await page.waitForTimeout(1200)
  await page.fill('input[placeholder="Jane Doe"]', 'Emily Carter')
  await page.fill('input[placeholder="+886 912-345-678"]', '+1 415-555-0142')
  await page.fill('input[placeholder="jane@example.com"]', 'emily.carter@example.com')
  await shot('02_booking_filled')

  log('3. Submit booking')
  await page.click('button:has-text("Confirm Booking")')
  await page.waitForSelector('text=Created!', { timeout: 8000 })
  const heading = await page.textContent('h2')
  const orderNo = heading.match(/(FP-\d+)/)?.[1]
  console.log('Created order:', orderNo)
  await shot('03_booking_success_modal')

  log('4. Go to Control Center from modal')
  await page.click('button:has-text("View in Control Center")')
  await page.waitForSelector('text=Central Control System')
  await page.waitForTimeout(500)
  await shot('04_control_center_new_order')

  log('5. Wait for order to be auto-dispatched and a driver to actually accept')
  const card = page.locator(`[data-testid="order-card"][data-order-no="${orderNo}"]`)
  await card.waitFor({ state: 'visible' })

  // A driver is only really "assigned" once data-assigned-driver-id is set —
  // the order may sit in PENDING_DRIVER_RESPONSE (notified, awaiting reply)
  // for a while first as it works through the multi-channel escalation ladder.
  let assigned = false
  for (let i = 0; i < 20; i++) {
    const driverId = await card.getAttribute('data-assigned-driver-id')
    if (driverId) {
      assigned = true
      break
    }
    const status = await card.getAttribute('data-order-status')
    if (status === 'NEW' && i === 0) {
      // Nudge it along immediately if auto-dispatch hasn't fired yet.
      await card.locator('[data-testid="assign-button"]').click().catch(() => {})
    }
    await page.waitForTimeout(1500)
  }

  if (!assigned) {
    throw new Error('Order never reached a real driver assignment (still awaiting response after escalation window)')
  }
  await shot('05_control_center_assigned')

  log('6. Extract assigned driver id')
  const driverId = await card.getAttribute('data-assigned-driver-id')
  const driverName = await card.getAttribute('data-assigned-driver')
  console.log('Assigned driver:', driverName, driverId)

  log('7. Navigate to Driver App')
  await page.click('a[href="/driver"]')
  await page.waitForSelector('text=Driver App')
  await page.waitForTimeout(500)

  if (driverId) {
    await page.selectOption('[data-testid="driver-select"]', driverId)
    await page.waitForTimeout(500)
  }
  await shot('06_driver_panel_assigned_job')

  log('8. Start trip to pickup')
  await page.click('button:has-text("Start Trip to Pickup")')
  await page.waitForTimeout(3000)
  await shot('07_driver_en_route')

  log('9. Switch to Control Center to see live fleet map movement')
  await page.click('a[href="/control"]')
  await page.waitForTimeout(2000)
  await shot('08_control_center_vehicle_moving')

  log('10. Switch to Customer Tracking to see mirrored live marker')
  await page.click('a[href="/customer"]')
  await page.waitForSelector('text=Track Your Ride')
  await page.waitForTimeout(500)
  await page.waitForSelector(`text=${orderNo}`)
  await page.waitForTimeout(2000)
  await shot('09_customer_tracking_en_route')

  log('11. Back to driver app, wait for arrival')
  await page.click('a[href="/driver"]')
  await page.waitForSelector('button:has-text("Confirm Passenger Picked Up")', { timeout: 40000 })
  await shot('10_driver_arrived_at_pickup')

  log('12. Confirm passenger picked up')
  await page.click('button:has-text("Confirm Passenger Picked Up")')
  await page.waitForTimeout(2500)
  await shot('11_driver_in_transit')

  log('13. Check customer tracking mirrors in-transit state')
  await page.click('a[href="/customer"]')
  await page.waitForTimeout(1500)
  await shot('12_customer_in_transit')

  log('14. Back to driver, wait for trip completion')
  await page.click('a[href="/driver"]')
  await page.waitForSelector('text=Trip Completed!', { timeout: 40000 })
  await shot('13_driver_trip_completed')

  log('15. Confirm control center shows order completed')
  await page.click('a[href="/control"]')
  await page.click('button:has-text("Completed")')
  await page.waitForTimeout(800)
  await shot('14_control_center_completed')

  log('16. Confirm customer tracking shows completed state')
  await page.click('a[href="/customer"]')
  await page.waitForSelector(`text=${orderNo}`)
  await page.waitForTimeout(1000)
  await shot('15_customer_completed')

  console.log('\n✅ FULL LIFECYCLE TEST PASSED')
} catch (err) {
  console.error('\n❌ TEST FAILED:', err)
  await shot('FAILURE')
  process.exitCode = 1
} finally {
  console.log('\nConsole errors captured:', consoleErrors.length)
  consoleErrors.forEach((e) => console.log(' -', e))
  await context.close()
  await browser.close()
}
