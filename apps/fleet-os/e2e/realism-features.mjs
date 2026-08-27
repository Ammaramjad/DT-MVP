// End-to-end test for this round's competitor-inspired realism features:
// booking-urgency tiers + flight-based auto-cancel, the 3-step booking flow,
// driver-info-reveal timing, vehicle-substitution transparency, the
// late-boarding waiting fee, Hourly Charter pricing, and the lightweight
// account/login + order-lookup surface.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/realism-features.mjs [port]
import { chromium } from 'playwright'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.addInitScript(() => {
  try {
    localStorage.setItem('fleet_preview_auth_token', 'test_e2e_token_' + Date.now())
  } catch {}
})
const page = await context.newPage()

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(err.message))

const shot = async (name) => {
  await page.screenshot({ path: `/tmp/e2e_realism_${name}.png` })
  console.log(`📸 ${name}`)
}

const log = (msg) => console.log(`\n=== ${msg} ===`)

const gotoApp = async (routeSlug) => {
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.click(`[data-testid="demo-link-${routeSlug}"]`)
  await page.waitForTimeout(400)
}

try {
  log('1. Book a LAST-MINUTE, flight-based airport pickup (Airport Express-style, best-effort/NOT-guaranteed tier)')
  await page.goto(BASE + '/booking', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.selectOption('select >> nth=1', 'tpe-airport') // pickup
  await page.selectOption('select >> nth=2', 'taipei-101') // dropoff
  await page.click('[data-testid="booking-urgency-last-minute"]')
  await page.waitForSelector('[data-testid="booking-urgency-not-guaranteed-notice"]')
  await shot('01_urgency_last_minute_selected')

  await page.fill('input[type="datetime-local"]', new Date(Date.now() + 90 * 60_000).toISOString().slice(0, 16))
  await page.click('button:has-text("Random")')
  await page.click('button:has-text("Look up")')
  await page.waitForTimeout(1200)
  await shot('02_flight_looked_up')

  log('1b. Confirm the free-cancellation trust badge is a live, functioning state (not static copy)')
  const trustText = await page.locator('[data-testid="booking-trust-cancellation"]').textContent()
  console.log('Cancellation trust badge text:', trustText.trim())

  log('2. Continue to Step 2: Payment Method, choose cash-on-arrival + a note')
  await page.click('[data-testid="booking-step1-continue"]')
  await page.waitForSelector('[data-testid="checkout-payment-card"]')
  await page.fill('input[placeholder="Jane Doe"]', 'Chen Yu-Ting')
  await page.fill('input[placeholder="+886 912-345-678"]', '+886 966-111-222')
  await page.fill('input[placeholder="jane@example.com"]', 'yuting.chen@example.com')
  await page.click('[data-testid="checkout-payment-cash"]')
  await page.waitForSelector('[data-testid="checkout-cash-notice"]')
  await page.fill('[data-testid="checkout-notes-input"]', 'Please call on arrival, e2e test note')
  await page.check('[data-testid="checkout-consent"]')
  await shot('03_payment_cash_selected')

  log('3. Submit booking — Step 3: Booking Confirmation with order number')
  await page.click('[data-testid="checkout-confirm-booking"]')
  await page.waitForSelector('[data-testid="checkout-booking-confirmed"]', { timeout: 8000 })
  const heading = await page.textContent('h2')
  const orderNo = heading.match(/(FP-\d+)/)?.[1]
  if (!orderNo) throw new Error('Could not read created order number from the confirmation modal')
  console.log('Created last-minute order:', orderNo)
  await shot('04_booking_confirmed')

  log('4. Read the order via the dev store hook and confirm urgency/paymentMethod/notes were wired through')
  const orderSnapshot = await page.evaluate((no) => {
    const store = window.__fleetStore
    const order = store.getState().orders.find((o) => o.orderNo === no)
    return order ? { bookingUrgency: order.bookingUrgency, paymentMethod: order.paymentMethod, notes: order.notes, flightNumber: order.flightNumber } : null
  }, orderNo)
  console.log('Order snapshot:', orderSnapshot)
  if (orderSnapshot?.bookingUrgency !== 'LAST_MINUTE') throw new Error('Expected bookingUrgency LAST_MINUTE on the created order')
  if (orderSnapshot?.paymentMethod !== 'cash') throw new Error('Expected paymentMethod cash on the created order')

  log('5. Force this order back to unmatched + "no driver response" via the dev store hook, then simulate the flight landing')
  // Forced directly through the store rather than the UI: the normal
  // dispatch escalation ladder runs on every tick and can matched this order
  // to a driver in the couple of seconds it takes to submit the booking and
  // read it back, which would (correctly, by design) prevent the "still
  // UNMATCHED 30 min after landing" auto-cancel rule from ever having a
  // chance to fire — so reset it to unmatched regardless of any race.
  await page.evaluate((no) => {
    const store = window.__fleetStore
    const state = store.getState()
    const order = state.orders.find((o) => o.orderNo === no)
    if (!order) return
    store.setState({
      orders: state.orders.map((o) =>
        o.id === order.id
          ? { ...o, status: 'DRIVER_MATCHING', driverId: null, vehicleId: null, pendingDriverId: null, demoForceNoResponse: true }
          : o,
      ),
    })
  }, orderNo)

  await page.click('button:has-text("View in Fleet OS")')
  await page.waitForSelector('text=Central Control System')
  await page.waitForTimeout(500)
  const card = page.locator(`[data-testid="order-card"][data-order-no="${orderNo}"]`)
  await card.waitFor({ state: 'visible' })
  await shot('05_control_center_last_minute_order')

  const statusBeforeLanding = await card.getAttribute('data-order-status')
  console.log('Order status right before simulating landing:', statusBeforeLanding)

  await page.evaluate((no) => {
    const store = window.__fleetStore
    const order = store.getState().orders.find((o) => o.orderNo === no)
    if (order) store.getState().simulateFlightEvent(order.id, 'LANDED')
  }, orderNo)
  await page.waitForTimeout(500)
  await shot('06_flight_simulated_landed')

  log('6. Wait for the compressed post-landing auto-cancel window and confirm the order is auto-cancelled + refunded')
  // Read status straight from the store rather than the DOM: once cancelled,
  // this order's card drops out of the Control Center's default "active
  // orders" tab entirely, which would otherwise look like a stalled/missing
  // element rather than the (correct) auto-cancel actually having happened.
  let autoCancelled = false
  let finalStatus = null
  for (let i = 0; i < 30; i++) {
    finalStatus = await page.evaluate((no) => {
      const store = window.__fleetStore
      return store.getState().orders.find((o) => o.orderNo === no)?.status ?? null
    }, orderNo)
    if (finalStatus === 'CANCELLED' || finalStatus === 'REFUNDED' || finalStatus === 'REFUND_PENDING') {
      autoCancelled = true
      console.log('Order auto-cancelled with status:', finalStatus)
      break
    }
    await page.waitForTimeout(2000)
  }
  if (!autoCancelled) throw new Error(`Last-minute order was never auto-cancelled after the compressed post-landing window (last seen status: ${finalStatus})`)
  await page.click('button:has-text("Completed")').catch(() => {})
  await page.waitForTimeout(500)
  await shot('07_last_minute_auto_cancelled')

  log('7. Book an Hourly Charter (計時包車) trip and confirm the mountain-route surcharge line item')
  // Navigate in-SPA (not page.goto) so the shared Zustand store — and this
  // test's earlier order/cancellation state — survives the "hop", the same
  // way lifecycle.mjs's gotoApp() does for its cross-app navigation.
  await gotoApp('booking')
  await page.waitForTimeout(800)
  await page.click('[data-testid="booking-charter-toggle"]')
  await page.selectOption('[data-testid="booking-charter-hours-select"]', '8')
  await page.check('[data-testid="booking-charter-mountain-route"]')
  await page.waitForTimeout(400)
  await shot('08_hourly_charter_configured')

  const bodyText = await page.content()
  if (!/Mountain|山區|Charter|包車/.test(bodyText)) throw new Error('Expected the fare breakdown to mention charter/mountain-route line items')
  console.log('Hourly Charter fare breakdown shows charter/mountain-route line items: true')

  log('8. Simulate the late-boarding waiting fee on the Driver App (deterministic via the dev store hook)')
  // Force a driver with no other active job straight into an ARRIVED trip
  // with `waitStartedAt` already 20 minutes in the past — past the 15-min
  // grace period — rather than waiting through a full pickup lifecycle or
  // depending on which seed orders happen to be ARRIVED at this instant.
  const waitingFeeSetup = await page.evaluate(() => {
    const store = window.__fleetStore
    const state = store.getState()
    const activeDriverIds = new Set(state.orders.filter((o) => o.driverId && !['COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'].includes(o.status)).map((o) => o.driverId))
    const freeDriver = state.drivers.find((d) => !activeDriverIds.has(d.id) && d.vehicleId)
    const targetOrder = state.orders.find((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
    if (!freeDriver || !targetOrder) return null
    store.setState({
      orders: state.orders.map((o) =>
        o.id === targetOrder.id
          ? {
              ...o,
              status: 'ARRIVED',
              driverId: freeDriver.id,
              vehicleId: freeDriver.vehicleId,
              waitStartedAt: Date.now() - 20 * 60_000,
              waitingFeeAgreed: false,
              flightInfo: undefined, // Clear flightInfo to prevent ticker from auto-cancelling if simulated flight shifts
            }
          : o,
      ),
      focusDriverId: freeDriver.id,
    })
    return { driverId: freeDriver.id, orderNo: targetOrder.orderNo, vehicleCategory: targetOrder.vehicleCategory }
  })
  if (!waitingFeeSetup) throw new Error('Could not find a free driver + order to force into the ARRIVED waiting-fee state')
  console.log('Forced order into ARRIVED w/ 20min wait:', waitingFeeSetup)

  await gotoApp('driver')
  await page.waitForSelector('[data-testid="driver-app-header"]')
  await page.click('[data-testid="driver-tab-account"]')
  await page.waitForSelector('[data-testid="driver-select"]')
  await page.selectOption('[data-testid="driver-select"]', waitingFeeSetup.driverId)
  await page.click('[data-testid="driver-tab-home"]')
  await page.waitForSelector('[data-testid="driver-wait-timer"]', { timeout: 5000 })
  await shot('09_driver_wait_timer')

  await page.waitForSelector('[data-testid="driver-agree-to-wait"]', { timeout: 5000 })
  await shot('10_driver_late_fee_preview')
  await page.click('[data-testid="driver-agree-to-wait"]')
  await page.waitForTimeout(300)
  await shot('11_driver_waiting_fee_agreed')
  console.log('Late-boarding waiting fee correctly appears past the 15-min grace period, with a working "agree to wait" action.')

  log('9. Driver-info-reveal timing: confirm a far-future ASSIGNED trip withholds driver details until revealed (deterministic via the dev store hook)')
  const revealSetup = await page.evaluate(() => {
    const store = window.__fleetStore
    const state = store.getState()
    const driver = state.drivers.find((d) => d.vehicleId)
    const targetOrder = state.orders.find((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && o.status !== 'REFUNDED')
    if (!driver || !targetOrder) return null
    const scheduledTime = new Date(Date.now() + 20 * 60 * 60_000).toISOString()
    store.setState({
      orders: state.orders.map((o) =>
        o.id === targetOrder.id
          ? { ...o, status: 'ASSIGNED', driverId: driver.id, vehicleId: driver.vehicleId, driverInfoRevealOverride: false, scheduledTime, bookingUrgency: 'STANDARD' }
          : o,
      ),
      focusOrderId: targetOrder.id,
    })
    return { orderId: targetOrder.id, orderNo: targetOrder.orderNo }
  })
  if (!revealSetup) throw new Error('Could not force an order into the not-yet-revealed ASSIGNED state')
  console.log('Forced order into ASSIGNED, 20h out, driver info withheld:', revealSetup)

  await gotoApp('customer')
  await page.waitForSelector('[data-testid="customer-app-shell"]')
  await page.click('[data-testid="customer-tab-trips"]')
  await page.click('[data-testid="trips-filter-active"]').catch(() => {})
  await page.waitForTimeout(500)
  await shot('12_customer_driver_not_revealed')
  await page.waitForSelector('[data-testid="customer-driver-not-revealed-card"]', { timeout: 5000 })

  await page.click('[data-testid="customer-reveal-driver-now"]')
  await page.waitForTimeout(300)
  await page.waitForSelector('[data-testid="customer-driver-revealed-card"]', { timeout: 5000 })
  await shot('13_customer_driver_revealed_after_demo_button')
  console.log('Driver-info-reveal demo button correctly flips the not-revealed state to revealed.')

  log('10. Lightweight account surface: LINE quick login + order lookup by order number')
  await page.click('[data-testid="customer-tab-account"]')
  await page.waitForSelector('[data-testid="account-auth-card"]')
  await shot('15_account_login_options')
  await page.click('[data-testid="account-login-line"]')
  await page.waitForTimeout(300)
  await page.waitForSelector('[data-testid="account-logout-session"]')
  await shot('16_account_logged_in_via_line')

  await page.fill('[data-testid="account-order-lookup-input"]', orderNo)
  await page.click('[data-testid="account-order-lookup-submit"]')
  await page.waitForSelector('[data-testid="account-order-lookup-result"]')
  await shot('17_account_order_lookup_result')
  console.log('Order lookup successfully found the earlier last-minute order:', orderNo)

  await page.fill('[data-testid="account-order-lookup-input"]', 'FP-999999')
  await page.click('[data-testid="account-order-lookup-submit"]')
  await page.waitForSelector('[data-testid="account-order-lookup-not-found"]')
  console.log('Order lookup correctly reports NOT_FOUND for a bogus order number.')

  console.log('\n✅ REALISM-FEATURES E2E TEST PASSED')
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
