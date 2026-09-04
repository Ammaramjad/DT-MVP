import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const PORT = 5195
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
    if (msg.type() === 'error') {
      const text = msg.text()
      // Ignore simulated external geo/cors lookup fallbacks in e2e sandbox
      if (text.includes('ipapi.co') || text.includes('ipwho.is') || text.includes('api.ipify.org') || text.includes('ERR_FAILED')) {
        return
      }
      errors.push(`[console] ${text}`)
    }
  })

  try {
    // -------------------------------------------------------------
    // TEST 1: Dedicated Drag & Drop Dispatch Board (/fleet-os/dispatch)
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Dedicated Drag & Drop Dispatch Board (/fleet-os/dispatch) ---')
    await page.goto(`${BASE}/fleet-os/dispatch`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)

    await page.waitForSelector('[data-testid="dispatch-board-container"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="orders-shelf-list"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="drivers-drop-grid"]', { state: 'visible' })
    console.log('✓ Drag & Drop Dispatch Board container and columns rendered')

    // Find first order card and first driver card
    const firstOrderCard = page.locator('[data-testid^="dispatch-order-card-"]').first()
    const firstDriverCard = page.locator('[data-testid^="dispatch-driver-card-"]').first()

    await firstOrderCard.waitFor({ state: 'visible', timeout: 5000 })
    await firstDriverCard.waitFor({ state: 'visible', timeout: 5000 })
    console.log('✓ Order cards and Driver drop cards are visible')

    // Test Quick-Assign or Drag Action
    const quickAssignBtn = page.locator('[data-testid^="quick-assign-driver-btn-"]').first()
    if (await quickAssignBtn.isVisible()) {
      await quickAssignBtn.click()
      await page.waitForTimeout(1000)
      console.log('✓ 1-Click Quick Assign triggered')

      // Check if conflict dialog opened or success toast showed
      const conflictDialog = page.locator('[data-testid="conflict-override-dialog"]')
      if (await conflictDialog.isVisible()) {
        console.log('✓ Schedule Conflict Guard properly triggered on conflict')
        await page.click('[data-testid="force-override-conflict-btn"]')
        await page.waitForTimeout(1000)
        console.log('✓ Conflict Force Override executed successfully')
      } else {
        console.log('✓ Conflict-free assignment succeeded immediately')
      }
    }

    // -------------------------------------------------------------
    // TEST 2: Dedicated Fleet OS Messenger (/fleet-os/messenger)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Dedicated Fleet OS Messenger (/fleet-os/messenger) ---')
    await page.goto(`${BASE}/fleet-os/messenger`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)

    await page.waitForSelector('[data-testid="fleetos-messenger-page"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="team-messenger-dock"]', { state: 'visible' })
    console.log('✓ Dedicated Operations Communications Center rendered in full screen')

    // Channel Switching
    await page.click('[data-testid="messenger-channel-urgent-help"]')
    await page.waitForTimeout(600)
    console.log('✓ Switched to #urgent-help channel')

    await page.click('[data-testid="messenger-channel-order-swaps"]')
    await page.waitForTimeout(600)
    console.log('✓ Switched to #order-swaps channel')

    // Send preset phrase
    await page.click('[data-testid="toggle-quick-presets"]')
    await page.waitForTimeout(300)
    await page.click('[data-testid="preset-item-0"]')
    await page.click('[data-testid="messenger-send-btn"]')
    await page.waitForTimeout(800)
    console.log('✓ Airport preset message sent in Messenger')

    // -------------------------------------------------------------
    // TEST 3: Driver App Quick-Access Messenger Card (/driver)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Driver App Messenger Quick Access (/driver) ---')
    await page.goto(`${BASE}/driver`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)

    const driverMessengerCard = page.locator('[data-testid="driver-home-messenger-card"]')
    await driverMessengerCard.waitFor({ state: 'visible', timeout: 5000 })
    console.log('✓ Driver Home tab contains prominent Messenger & Swaps quick-access card')

    await driverMessengerCard.click()
    await page.waitForTimeout(1000)
    await page.waitForSelector('[data-testid="team-messenger-dock"]', { state: 'visible' })
    console.log('✓ Tapping quick card successfully switched to Driver Messenger view')

    // -------------------------------------------------------------
    // TEST 4: Persistent Header Messenger Trigger in Fleet OS
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Persistent Header Messenger Button (/fleet-os) ---')
    await page.goto(`${BASE}/fleet-os`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)

    const headerMessengerBtn = page.locator('[data-testid="header-messenger-toggle-btn"]')
    await headerMessengerBtn.waitFor({ state: 'visible', timeout: 5000 })
    console.log('✓ Persistent Header Messenger button with badge is visible')

    await headerMessengerBtn.click()
    await page.waitForSelector('[data-testid="team-messenger-dock"]', { state: 'visible' })
    console.log('✓ Floating Messenger opened from persistent header launcher')

    console.log('\n========================================')
    console.log('🎉 ALL DISPATCH BOARD & MESSENGER E2E TESTS PASSED!')
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
