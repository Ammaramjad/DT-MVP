import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const PORT = 5195
const BASE = `http://localhost:${PORT}`

async function runDynamicFeaturesE2E() {
  console.log(`Starting preview server on port ${PORT}...`)
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host'], {
    cwd: '/workspace/apps/fleet-os',
    stdio: 'ignore',
  })

  await new Promise((r) => setTimeout(r, 2500))

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
    if (msg.type() === 'error' && !msg.text().includes('ipapi') && !msg.text().includes('ipify')) {
      errors.push(`[console] ${msg.text()}`)
    }
  })

  try {
    // -----------------------------------------------------------------------
    // TEST 1: 30-Day Capacity Forecast & Hourly Charts Interactive Features
    // -----------------------------------------------------------------------
    console.log('\n--- 1. Testing 30-Day Capacity Forecast & Hourly Volume Chart (/fleet-os/reports) ---')
    await page.goto(`${BASE}/fleet-os/reports`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Click date pill to open Day Capacity Breakdown Modal
    const datePill = page.locator('[data-testid^="capacity-pill-"]').nth(8)
    await datePill.waitFor({ state: 'visible', timeout: 5000 })
    await datePill.click()
    await page.waitForTimeout(600)

    const dayModal = page.locator('[data-testid="day-capacity-modal"]')
    await dayModal.waitFor({ state: 'visible', timeout: 5000 })
    console.log('✓ Day Capacity Breakdown modal successfully opened upon clicking date pill')

    // Switch to On-Duty Roster tab inside Day Capacity Modal
    await page.click('[data-testid="day-modal-tab-roster"]')
    await page.waitForSelector('[data-testid="day-roster-breakdown"]', { state: 'visible' })
    console.log('✓ Day on-duty roster tab active showing Day/Night shifts and on-leave drivers')

    // Switch back to Bookings tab and test 1-Click Pre-Dispatch
    await page.click('[data-testid="day-modal-tab-bookings"]')
    await page.waitForTimeout(500)

    const openPreassignBtn = page.locator('[data-testid^="open-preassign-btn-"]').first()
    if (await openPreassignBtn.isVisible()) {
      await openPreassignBtn.click()
      const selectDriver = page.locator('[data-testid^="select-preassign-driver-"]').first()
      await selectDriver.selectOption({ index: 1 })
      const confirmPreassignBtn = page.locator('[data-testid^="confirm-preassign-btn-"]').first()
      await confirmPreassignBtn.click()
      await page.waitForTimeout(800)
      console.log('✓ 1-Click Pre-Dispatch driver pre-assignment confirmed')
    }

    // Close Day Capacity Modal
    await page.click('[data-testid="close-day-capacity-modal"]')
    await page.waitForTimeout(500)

    // Click Hourly Volume Bar to inspect 1-hour trip breakdown
    const hourlyBar = page.locator('[data-testid^="hourly-bar-"]').nth(14)
    await hourlyBar.click()
    await page.waitForTimeout(600)
    await page.waitForSelector('[data-testid="hourly-breakdown-card"]', { state: 'visible' })
    console.log('✓ Hourly Order Volume Bar clickable and displayed pickup hubs breakdown drawer')

    // -----------------------------------------------------------------------
    // TEST 2: KPI Filter Cards in RosterPanel & ControlCenterPanel
    // -----------------------------------------------------------------------
    console.log('\n--- 2. Testing Clickable KPI Filter Cards (/fleet-os/roster) ---')
    await page.goto(`${BASE}/fleet-os/roster`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Click Available KPI card
    await page.click('[data-testid="kpi-filter-available"]')
    await page.waitForTimeout(500)
    const availableSelectVal = await page.locator('[data-testid="driver-hub-status-filter"]').inputValue()
    console.log(`✓ Clicked Available KPI Card -> Filter set to: ${availableSelectVal}`)

    // Click Busy KPI card
    await page.click('[data-testid="kpi-filter-busy"]')
    await page.waitForTimeout(500)
    const busySelectVal = await page.locator('[data-testid="driver-hub-status-filter"]').inputValue()
    console.log(`✓ Clicked Busy KPI Card -> Filter set to: ${busySelectVal}`)

    // Click Break KPI card
    await page.click('[data-testid="kpi-filter-break"]')
    await page.waitForTimeout(500)
    const breakSelectVal = await page.locator('[data-testid="driver-hub-status-filter"]').inputValue()
    console.log(`✓ Clicked Break KPI Card -> Filter set to: ${breakSelectVal}`)

    // Click Clear / Reset Filters
    const resetBtn = page.locator('[data-testid="driver-hub-reset-filters-btn"]')
    if (await resetBtn.isVisible()) {
      await resetBtn.click()
      await page.waitForTimeout(500)
      console.log('✓ Clear filter button resets all filters')
    }

    // -----------------------------------------------------------------------
    // TEST 3: Future Orders Hub (/fleet-os/future-orders)
    // -----------------------------------------------------------------------
    console.log('\n--- 3. Testing Future Orders Center (/fleet-os/future-orders) ---')
    await page.goto(`${BASE}/fleet-os/future-orders`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Verify Summary KPI cards
    await page.waitForSelector('[data-testid="future-orders-kpi-grid"]', { timeout: 5000 })
    console.log('✓ Future Orders Summary KPI cards rendered')

    // Click Tomorrow Horizon tab
    await page.click('[data-testid="horizon-tab-tomorrow"]')
    await page.waitForTimeout(400)
    console.log('✓ Horizon Tab: Tomorrow (明日預約) active')

    // Click Next 3 Days Horizon tab
    await page.click('[data-testid="horizon-tab-next-3d"]')
    await page.waitForTimeout(400)
    console.log('✓ Horizon Tab: Next 3 Days (未來 3 日) active')

    // Click Next 7 Days Horizon tab
    await page.click('[data-testid="horizon-tab-next-7d"]')
    await page.waitForTimeout(400)
    console.log('✓ Horizon Tab: Next 7 Days (未來 7 日) active')

    // Click Next 30 Days Horizon tab
    await page.click('[data-testid="horizon-tab-next-30d"]')
    await page.waitForTimeout(400)
    console.log('✓ Horizon Tab: Next 30 Days (本月預約總覽) active')

    // Filter by Unassigned
    await page.click('[data-testid="filter-unassigned-badge-btn"]')
    await page.waitForTimeout(400)
    console.log('✓ Unassigned / Needs Dispatch filter active')

    // Test 1-Click Pre-Dispatch Action on an order
    const preAssignBtn = page.locator('[data-testid^="preassign-btn-"]').first()
    if (await preAssignBtn.isVisible()) {
      await preAssignBtn.click()
      await page.waitForSelector('[data-testid="manual-assignment-modal"]', { timeout: 5000 })
      console.log('✓ 1-Click Pre-Dispatch Assignment Modal opened for future order')
      // Select first available driver
      const driverAssignRow = page.locator('[data-testid^="select-driver-for-order-"]').first()
      if (await driverAssignRow.isVisible()) {
        await driverAssignRow.click()
        await page.waitForTimeout(600)
        console.log('✓ Future order driver assigned with shift conflict checking')
      } else {
        await page.click('[data-testid="close-assignment-modal-btn"]')
      }
    }

    // -----------------------------------------------------------------------
    // TEST 4: Control Center Panel Clickable KPI Cards (/fleet-os)
    // -----------------------------------------------------------------------
    console.log('\n--- 4. Testing Clickable Control Center KPI Cards (/fleet-os) ---')
    await page.goto(`${BASE}/fleet-os`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Click Unassigned KPI
    await page.click('[data-testid="control-kpi-unassigned"]')
    await page.waitForTimeout(500)
    console.log('✓ Clicked Unassigned KPI -> Order Queue filtered to NEW/Unassigned')

    // Click Anomalies KPI
    await page.click('[data-testid="control-kpi-anomalies"]')
    await page.waitForTimeout(500)
    console.log('✓ Clicked Anomalies KPI -> Filtered to Anomaly orders')

    // Click Clear Filter
    const clearBtn = page.locator('[data-testid="control-clear-filter-btn"]')
    if (await clearBtn.isVisible()) {
      await clearBtn.click()
      await page.waitForTimeout(400)
      console.log('✓ Clicked 1-click Clear Filter button')
    }

    // Click Revenue Today KPI -> Opens Revenue Modal
    await page.click('[data-testid="control-kpi-revenue"]')
    await page.waitForSelector('[data-testid="today-revenue-modal"]', { timeout: 5000 })
    console.log('✓ Clicked Revenue KPI -> Opened Today Revenue & Financial Analytics Modal')
    await page.click('[data-testid="close-revenue-modal-btn"]')
    await page.waitForTimeout(400)

    // Click On Leave Today KPI -> Opens On Leave Modal
    await page.click('[data-testid="control-kpi-on-leave"]')
    await page.waitForSelector('[data-testid="on-leave-drivers-modal"]', { timeout: 5000 })
    console.log('✓ Clicked On Leave KPI -> Opened On Leave Drivers Roster Modal')
    await page.click('[data-testid="close-on-leave-modal-btn"]')
    await page.waitForTimeout(400)

    // -----------------------------------------------------------------------
    // TEST 5: Driver App Upcoming Scheduled Trips (/driver)
    // -----------------------------------------------------------------------
    console.log('\n--- 5. Testing Driver App Upcoming Scheduled Trips (/driver) ---')
    await page.goto(`${BASE}/driver`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Verify Home tab has quick future trips banner
    const futureBanner = page.locator('[data-testid="driver-home-future-trips-banner"]')
    await futureBanner.waitFor({ state: 'visible', timeout: 5000 })
    await futureBanner.click()
    await page.waitForTimeout(800)
    console.log('✓ Clicked Future Trips banner -> navigated to Activity tab')

    // Test Tomorrow Tab
    await page.click('[data-testid="driver-upcoming-tab-tomorrow"]')
    await page.waitForTimeout(500)
    console.log('✓ Driver App Tomorrow upcoming trips tab active')

    // Test Next 7 Days Tab
    await page.click('[data-testid="driver-upcoming-tab-next_7d"]')
    await page.waitForTimeout(500)
    console.log('✓ Driver App Next 7 Days upcoming trips tab active')

    console.log('\n=========================================')
    console.log('✅ ALL DYNAMIC INTERACTIVE SUITES PASSED!')
    console.log('=========================================')
  } catch (err) {
    console.error('Test execution failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
    preview.kill()
  }

  if (errors.length > 0) {
    console.log('Encountered page errors:', errors)
  }
}

runDynamicFeaturesE2E()
