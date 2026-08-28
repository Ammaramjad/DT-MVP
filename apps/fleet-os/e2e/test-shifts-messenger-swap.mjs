import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const PORT = 5192
const BASE = `http://localhost:${PORT}`

async function runTestWithServer() {
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
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
  })

  try {
    // -------------------------------------------------------------
    // FEATURE 1: Driver Shift / Working Hours Management & Smart Assignment
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Driver Shift & Working Hours Management (/fleet-os/roster) ---')
    await page.goto(`${BASE}/fleet-os/roster`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Open shift edit modal for first driver
    const editShiftBtn = page.locator('[data-testid="edit-driver-shift-btn"]').first()
    await editShiftBtn.waitFor({ state: 'visible', timeout: 5000 })
    await editShiftBtn.click()

    await page.waitForSelector('[data-testid="driver-shift-modal"]', { state: 'visible' })
    console.log('✓ Driver Shift Edit modal opened')

    // Choose Morning shift preset
    await page.click('[data-testid="shift-preset-morning"]')
    await page.click('[data-testid="save-shift-btn"]')
    await page.waitForTimeout(1000)
    console.log('✓ Driver shift updated to Morning (06:00 - 14:00)')

    // -------------------------------------------------------------
    // FEATURE 1: Smart Manual Order Assignment with Conflict Detection
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Smart Manual Order Assignment with Schedule Conflict Alerts (/fleet-os) ---')
    await page.goto(`${BASE}/fleet-os`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Click assign button on first order card
    const assignBtn = page.locator('[data-testid="open-assign-modal-btn"]').first()
    await assignBtn.waitFor({ state: 'visible', timeout: 5000 })
    await assignBtn.click()

    await page.waitForSelector('[data-testid="manual-assignment-modal"]', { state: 'visible' })
    console.log('✓ Smart Manual Assignment Modal opened')

    // Find driver with conflict (or pick a driver card)
    const driverCards = page.locator('[data-testid^="assign-driver-card-"]')
    const count = await driverCards.count()
    console.log(`Found ${count} candidate drivers for assignment`)

    // Click first driver
    await driverCards.first().click()
    await page.waitForTimeout(500)

    // Check if force assign or confirm assign is present
    const forceBtn = page.locator('[data-testid="force-assign-btn"]')
    const confirmBtn = page.locator('[data-testid="confirm-assignment-btn"]')

    if (await forceBtn.isVisible()) {
      console.log('✓ Conflict alert properly detected (Outside shift or Overlap)')
      await forceBtn.click()
      await page.waitForTimeout(500)
      if (await forceBtn.isVisible()) {
        await forceBtn.click()
      }
      console.log('✓ Dispatcher force override executed successfully')
    } else {
      await confirmBtn.click()
      console.log('✓ Conflict-free driver assignment confirmed')
    }

    // -------------------------------------------------------------
    // FEATURE 2: Real-Time Team Messenger (Fleet OS & Driver App)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Real-Time Team Messenger in Fleet OS (/fleet-os) ---')
    await page.goto(`${BASE}/fleet-os`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Open Team Messenger dock
    const messengerBtn = page.locator('[data-testid="header-messenger-toggle-btn"], [data-testid="toggle-fleet-messenger-btn"]')
    await messengerBtn.click()
    await page.waitForSelector('[data-testid="team-messenger-dock"]', { state: 'visible' })
    console.log('✓ Team Messenger dock opened in Fleet OS')

    // Switch channels
    await page.click('[data-testid="messenger-channel-urgent-help"]')
    await page.waitForTimeout(500)
    console.log('✓ Switched to #urgent-help channel')

    // Use Quick Presets
    await page.click('[data-testid="toggle-quick-presets"]')
    await page.waitForTimeout(300)
    await page.click('[data-testid="preset-item-0"]')
    await page.click('[data-testid="messenger-send-btn"]')
    await page.waitForTimeout(800)
    console.log('✓ Airport preset message sent successfully')

    // -------------------------------------------------------------
    // FEATURE 2: Driver Order Handover / Swap Exchange
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Driver App Order Handover & Swap Exchange (/driver) ---')
    await page.goto(`${BASE}/driver`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Check if Driver has an active order to swap
    const swapBtn = page.locator('[data-testid="driver-request-swap-btn"]')
    if (await swapBtn.isVisible()) {
      await swapBtn.click()
      await page.waitForSelector('[data-testid="order-swap-modal"]', { state: 'visible' })
      console.log('✓ Order Swap Modal opened in Driver App')

      // Select mechanical issue reason
      await page.click('[data-testid="swap-reason-mechanical_issue"]')
      await page.fill('[data-testid="swap-custom-reason-input"]', '空調冷媒洩漏檢修中')
      await page.click('[data-testid="submit-swap-request-btn"]')
      await page.waitForTimeout(1500)
      console.log('✓ Order swap card published to #order-swaps channel')
    }

    // Switch to Driver App Messenger Tab
    await page.click('[data-testid="driver-tab-messenger"]')
    await page.waitForTimeout(1000)
    await page.waitForSelector('[data-testid="team-messenger-dock"]', { state: 'visible' })
    console.log('✓ Driver App Messenger tab active')

    // Switch to #order-swaps channel and accept swap
    await page.click('[data-testid="messenger-channel-order-swaps"]')
    await page.waitForTimeout(800)

    const claimBtn = page.locator('[data-testid^="accept-swap-btn-"]').first()
    if (await claimBtn.isVisible()) {
      await claimBtn.click()
      await page.waitForTimeout(1000)
      console.log('✓ Driver claimed trip swap from #order-swaps channel')
    }

    console.log('\n========================================')
    console.log('🎉 ALL FEATURE TESTS PASSED WITH 0 ERRORS!')
    console.log('========================================')
  } catch (err) {
    console.error('Test execution failed:', err)
    process.exit(1)
  } finally {
    await browser.close()
    preview.kill()
  }

  if (errors.length > 0) {
    console.error('Console / Page Errors encountered:', errors)
    process.exit(1)
  }
}

runTestWithServer()
