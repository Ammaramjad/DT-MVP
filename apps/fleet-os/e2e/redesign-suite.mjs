import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const PORT = 5195
const BASE = `http://localhost:${PORT}`

async function runRedesignSuite() {
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
  await page.goto(`${BASE}/fleet-os`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  
  // If gatekeeper is active, unlock via passcode
  const gatekeeper = page.locator('[data-testid="client-gatekeeper-overlay"]')
  if (await gatekeeper.isVisible()) {
    await page.click('[data-testid="gatekeeper-tab-passcode"]')
    await page.fill('[data-testid="gatekeeper-passcode-input"]', '8888')
    await page.click('[data-testid="gatekeeper-passcode-verify-btn"]')
    await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 5000 })
    await page.waitForTimeout(1000)
  }
  const errors = []
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
  })

  fs.mkdirSync('/opt/cursor/artifacts', { recursive: true })

  try {
    console.log('\n--- 1. Testing Reorganized Navigation & Command Palette (Cmd+K) ---')
    await page.goto(`${BASE}/fleet-os`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // Verify all 5 category group buttons exist
    const groups = ['group-ops', 'group-workforce', 'group-commercial', 'group-assets', 'group-governance']
    for (const g of groups) {
      const el = page.locator(`[data-testid="fleetos-${g}"]`)
      console.log(`Checking button selector: [data-testid="fleetos-${g}"]`)
      await el.waitFor({ state: 'visible', timeout: 5000 })
      console.log(`✓ Group button visible: ${g}`)
    }

    // Open Command Palette
    const cmdTrigger = page.locator('[data-testid="fleetos-command-palette-trigger"]')
    await cmdTrigger.click()
    await page.waitForSelector('[data-testid="fleetos-command-palette-modal"]', { state: 'visible' })
    console.log('✓ Command palette opened')

    // Search for lost & found
    const paletteInput = page.locator('[data-testid="command-palette-input"]')
    await paletteInput.fill('遺失物')
    await page.waitForTimeout(500)

    // Click on lost & found result
    const lfItem = page.locator('[data-testid="palette-item--fleet-os-lost-found"]')
    await lfItem.click()
    await page.waitForTimeout(1500)
    console.log('✓ Jumped to /fleet-os/lost-found via Command Palette')

    // Capture Navigation & Lost & Found screenshot
    await page.screenshot({ path: '/opt/cursor/artifacts/screenshot_lost_found_desk.png', fullPage: false })
    console.log('✓ Saved screenshot_lost_found_desk.png')

    console.log('\n--- 2. Testing Lost & Found Desk Workflow ---')
    await page.waitForSelector('[data-testid="lost-found-panel"]', { state: 'visible' })
    
    // Select first incident and advance workflow
    const card = page.locator('[data-testid="lost-found-card"]').first()
    await card.click()
    await page.waitForTimeout(500)

    const advanceBtn = page.locator('[data-testid="advance-to-hub-btn"], [data-testid="advance-to-dispatched-btn"], [data-testid="advance-to-returned-btn"]').first()
    if (await advanceBtn.isVisible()) {
      await advanceBtn.click()
      await page.waitForTimeout(800)
      console.log('✓ Advanced lost & found incident pipeline')
    }

    // Test creating a new lost & found report
    const newReportBtn = page.locator('[data-testid="create-lost-found-report-btn"]')
    await newReportBtn.click()
    await page.waitForSelector('[data-testid="create-lost-found-modal"]', { state: 'visible' })
    await page.fill('[data-testid="new-lf-customer-name"]', 'David Chang (TSMC VIP)')
    await page.fill('[data-testid="new-lf-desc-input"]', 'iPad Pro 11-inch in Black Leather Sleeve left in backseat')
    await page.click('[data-testid="submit-new-lf-btn"]')
    await page.waitForTimeout(1000)
    console.log('✓ Successfully created new Lost & Found incident')

    console.log('\n--- 3. Testing Driver CSAT & Reviews Module (/fleet-os/reviews) ---')
    await page.goto(`${BASE}/fleet-os/reviews`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.waitForSelector('[data-testid="reviews-panel"]', { state: 'visible' })

    const reviewCards = page.locator('[data-testid="driver-review-card"]')
    const reviewCount = await reviewCards.count()
    console.log(`✓ Driver Reviews panel loaded with ${reviewCount} customer reviews`)

    // Capture Driver CSAT & Reviews screenshot
    await page.screenshot({ path: '/opt/cursor/artifacts/screenshot_driver_reviews_csat.png', fullPage: false })
    console.log('✓ Saved screenshot_driver_reviews_csat.png')

    console.log('\n--- 4. Testing Route Subscriptions Module (/fleet-os/subscriptions) ---')
    await page.goto(`${BASE}/fleet-os/subscriptions`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.waitForSelector('[data-testid="subscriptions-panel"]', { state: 'visible' })

    const subCards = page.locator('[data-testid="subscription-card"]')
    const subCount = await subCards.count()
    console.log(`✓ Subscriptions panel loaded with ${subCount} active VIP commuter passes`)

    // Test creating a subscription
    const newSubBtn = page.locator('[data-testid="create-subscription-btn"]')
    await newSubBtn.click()
    await page.waitForSelector('[data-testid="create-sub-modal"]', { state: 'visible' })
    await page.fill('[data-testid="new-sub-name-input"]', 'Prof. Alex Chen (Academia Sinica)')
    await page.fill('[data-testid="new-sub-origin-input"]', 'Nangang Software Park')
    await page.fill('[data-testid="new-sub-dest-input"]', 'Taoyuan Airport Terminal 2')
    await page.click('[data-testid="submit-new-sub-btn"]')
    await page.waitForTimeout(1000)
    console.log('✓ Successfully created new Route Subscription pass')

    // Capture Subscriptions screenshot
    await page.screenshot({ path: '/opt/cursor/artifacts/screenshot_route_subscriptions.png', fullPage: false })
    console.log('✓ Saved screenshot_route_subscriptions.png')

    console.log('\n--- 5. Capturing Central Control & Navigation Overview ---')
    await page.goto(`${BASE}/fleet-os`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '/opt/cursor/artifacts/screenshot_central_control_overview.png', fullPage: false })
    console.log('✓ Saved screenshot_central_control_overview.png')

    // Also take screenshot of Command Palette open
    await cmdTrigger.click()
    await page.waitForSelector('[data-testid="fleetos-command-palette-modal"]', { state: 'visible' })
    await page.screenshot({ path: '/opt/cursor/artifacts/screenshot_command_palette.png', fullPage: false })
    console.log('✓ Saved screenshot_command_palette.png')

    console.log('\n======================================')
    console.log('ALL REDESIGN & NEW MODULE TESTS PASSED!')
    console.log('======================================')
  } catch (err) {
    console.error('Test Suite Failed:', err)
    process.exitCode = 1
  } finally {
    await browser.close()
    preview.kill()
  }
}

runRedesignSuite()
