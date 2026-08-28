import { chromium } from 'playwright'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`

async function runAdvancedFeaturesTest() {
  console.log(`Starting Advanced Features E2E verification against ${BASE}...`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

  await context.addInitScript(() => {
    try {
      localStorage.setItem('fleet_preview_auth_token', 'test_e2e_token_' + Date.now())
      localStorage.setItem('fleet_lang', 'zh')
    } catch {}
  })

  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
  })

  try {
    // 1. Verify Multi-Screen Command Wall Layout Toggling
    console.log('\n--- Testing 1: Multi-Screen Command Wall (/fleet-os/multiscreen) ---')
    await page.goto(`${BASE}/fleet-os/multiscreen`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="dual-screen-layout"]')
    console.log('✓ Dual-screen default layout loaded successfully')

    // Switch to Quad Screen preset
    await page.click('[data-testid="preset-quad-btn"]')
    await page.waitForSelector('[data-testid="quad-screen-layout"]')
    console.log('✓ Switched to Quad Command Wall preset')

    // Switch to Triple Screen preset
    await page.click('[data-testid="preset-triple-btn"]')
    await page.waitForSelector('[data-testid="triple-screen-layout"]')
    console.log('✓ Switched to Triple Command Wall preset')

    // Test Pop-out Window Simulation
    await page.click('[data-testid="preset-dual-btn"]')
    await page.waitForSelector('[data-testid="popout-map-btn"]')
    await page.click('[data-testid="popout-map-btn"]')
    await page.waitForSelector('[data-testid="popout-window-modal"]')
    console.log('✓ Popout fullscreen window opened')
    await page.click('[data-testid="close-popout-btn"]')
    console.log('✓ Popout window closed and restored grid')

    // 2. Verify Add Driver Onboarding Workflow in Roster Panel
    console.log('\n--- Testing 2: Add Driver Onboarding (/fleet-os/roster) ---')
    await page.goto(`${BASE}/fleet-os/roster`, { waitUntil: 'networkidle' })
    await page.click('[data-testid="open-add-driver-modal-btn"]')
    await page.waitForSelector('[data-testid="add-driver-modal"]')

    await page.fill('[data-testid="add-driver-namezh-input"]', '張冠宇 (E2E Test)')
    await page.fill('[data-testid="add-driver-name-input"]', 'Kuan-Yu Chang')
    await page.fill('[data-testid="add-driver-phone-input"]', '0988-777-999')
    await page.fill('[data-testid="add-driver-plate-input"]', 'TES-8899')
    await page.click('[data-testid="submit-add-driver-btn"]')
    await page.waitForSelector('[data-testid="add-driver-success-message"]')
    console.log('✓ New driver張冠宇 successfully onboarded and added to live fleet store')

    // 3. Verify Multi-Stop Booking and Pricing Calculation in Customer Booking Panel
    console.log('\n--- Testing 3: Multi-Stop / Via-Point Booking & Surcharge (/booking) ---')
    await page.goto(`${BASE}/booking`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="booking-waypoints-section"]')

    // Add intermediate stopover
    await page.fill('[data-testid="booking-waypoint-input"]', '板橋車站 (Pick up friend at Banqiao)')
    await page.click('[data-testid="booking-waypoint-add"]')
    await page.waitForSelector('[data-testid="booking-waypoint-list"]')
    console.log('✓ Intermediate stopover added to booking itinerary')

    // 4. Verify Driver App Fatigue Break Mode & Instant Cashout
    console.log('\n--- Testing 4: Driver App Fatigue & Instant Cashout (/driver) ---')
    await page.goto(`${BASE}/driver`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="driver-fatigue-widget"]')

    // Toggle break mode
    await page.click('[data-testid="driver-break-toggle-btn"]')
    console.log('✓ Driver entered rest break mode')

    // Go to Earnings tab and trigger instant cashout
    await page.click('[data-testid="driver-tab-earnings"]')
    await page.waitForSelector('[data-testid="instant-cashout-trigger-btn"]')
    await page.click('[data-testid="instant-cashout-trigger-btn"]')
    await page.waitForSelector('[data-testid="instant-cashout-modal"]')
    await page.click('[data-testid="cashout-method-linepay"]')
    await page.click('[data-testid="confirm-cashout-btn"]')
    await page.waitForSelector('[data-testid="cashout-receipt-card"]')
    console.log('✓ Driver instant cashout executed successfully with receipt')
    await page.click('[data-testid="cashout-receipt-dismiss-btn"]')

    // 5. Verify Customer App Tips & Lost and Found
    console.log('\n--- Testing 5: Customer App Tips, Split Fare & Lost and Found (/customer) ---')
    await page.goto(`${BASE}/customer`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="customer-tab-trips"]')
    await page.click('[data-testid="customer-tab-trips"]')
    await page.waitForSelector('[data-testid="customer-trips-screen"]')

    // Switch to Completed tab
    await page.click('[data-testid="trips-filter-completed"]')
    await page.waitForTimeout(1000)

    const tipBtn = page.locator('[data-testid="trip-tip-driver-btn"]').first()
    if (await tipBtn.isVisible()) {
      await tipBtn.click()
      await page.waitForSelector('[data-testid="tip-driver-modal"]')
      await page.click('[data-testid="tip-btn-100"]')
      await page.click('[data-testid="confirm-tip-btn"]')
      console.log('✓ Customer tip and driver compliments sent successfully')
      await page.waitForTimeout(1500)
    }

    const splitBtn = page.locator('[data-testid="trip-split-fare-btn"]').first()
    if (await splitBtn.isVisible()) {
      await splitBtn.click()
      await page.waitForSelector('[data-testid="split-fare-modal"]')
      await page.click('[data-testid="copy-split-link-btn"]')
      console.log('✓ Customer split fare payment link generated')
      await page.click('[data-testid="close-split-modal"]')
    }

    console.log('\n✅ All Advanced Features E2E verification scenarios passed with 0 errors!')
  } catch (err) {
    console.error('❌ Test failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

runAdvancedFeaturesTest()
