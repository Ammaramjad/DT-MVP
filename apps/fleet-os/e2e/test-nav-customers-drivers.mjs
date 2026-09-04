import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const PORT = 5198
const BASE = `http://localhost:${PORT}`

async function runNavCustomersDriversSuite() {
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
    const text = msg.text()
    if (msg.type() === 'error' && !text.includes('tile.openstreetmap') && !text.includes('ipify') && !text.includes('ipapi')) {
      errors.push(`[console] ${text}`)
    }
  })

  fs.mkdirSync('/opt/cursor/artifacts', { recursive: true })

  try {
    console.log('\n--- 1. Testing Category Group & Immediate Sub-Menu Strip Switching ---')
    await page.goto(`${BASE}/fleet-os`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)

    // Unlock gatekeeper if present
    const gatekeeper = page.locator('[data-testid="client-gatekeeper-overlay"]')
    if (await gatekeeper.isVisible()) {
      await page.click('[data-testid="gatekeeper-tab-passcode"]')
      await page.fill('[data-testid="gatekeeper-passcode-input"]', '8888')
      await page.click('[data-testid="gatekeeper-passcode-verify-btn"]')
      await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 5000 })
      await page.waitForTimeout(1000)
    }

    // A. Click "Workforce & Drivers" group pill
    console.log('Clicking group-workforce pill...')
    await page.click('[data-testid="fleetos-group-workforce"]')
    await page.waitForTimeout(600)
    
    // Sub-menu strip should now show workforce items like roster, compliance, reviews, accounts
    const rosterNavBtn = page.locator('[data-testid="fleetos-nav-roster"]')
    await rosterNavBtn.waitFor({ state: 'visible', timeout: 4000 })
    console.log('✓ Sub-menu strip immediately switched to Workforce & Drivers (found fleetos-nav-roster)')

    // B. Click "Commercial & Finance" group pill
    console.log('Clicking group-commercial pill...')
    await page.click('[data-testid="fleetos-group-commercial"]')
    await page.waitForTimeout(600)

    // Sub-menu strip should show customers, manual-order, corporate, invoices, finance, refunds, subscriptions
    const customersNavBtn = page.locator('[data-testid="fleetos-nav-customers"]')
    await customersNavBtn.waitFor({ state: 'visible', timeout: 4000 })
    console.log('✓ Sub-menu strip immediately switched to Commercial & Finance (found fleetos-nav-customers)')

    // C. Click "Intelligence & Fleet Assets" group pill
    console.log('Clicking group-assets pill...')
    await page.click('[data-testid="fleetos-group-assets"]')
    await page.waitForTimeout(600)
    const forecastNavBtn = page.locator('[data-testid="fleetos-nav-forecast"]')
    await forecastNavBtn.waitFor({ state: 'visible', timeout: 4000 })
    console.log('✓ Sub-menu strip immediately switched to Intelligence & Fleet Assets (found fleetos-nav-forecast)')

    // D. Click "Governance & Support" group pill
    console.log('Clicking group-governance pill...')
    await page.click('[data-testid="fleetos-group-governance"]')
    await page.waitForTimeout(600)
    const reportsNavBtn = page.locator('[data-testid="fleetos-nav-reports"]')
    await reportsNavBtn.waitFor({ state: 'visible', timeout: 4000 })
    console.log('✓ Sub-menu strip immediately switched to Governance & Support (found fleetos-nav-reports)')

    // Capture Navigation Switching Artifact
    await page.screenshot({ path: '/opt/cursor/artifacts/screenshot_navigation_switching.png', fullPage: false })
    console.log('✓ Saved /opt/cursor/artifacts/screenshot_navigation_switching.png')

    console.log('\n--- 2. Testing Customer CRM & Passenger Management Hub (/fleet-os/customers) ---')
    await page.goto(`${BASE}/fleet-os/customers`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Verify Customer CRM panel elements
    await page.waitForSelector('[data-testid="customer-crm-panel"]', { state: 'visible', timeout: 5000 })
    await page.waitForSelector('[data-testid="customer-crm-kpis"]', { state: 'visible', timeout: 5000 })
    await page.waitForSelector('[data-testid="customer-directory-table"]', { state: 'visible', timeout: 5000 })
    console.log('✓ Customer CRM table & KPIs verified')

    // Test Search by customer name
    const searchInput = page.locator('[data-testid="customer-search-input"]')
    await searchInput.fill('Marcus')
    await page.waitForTimeout(500)
    const marcusRow = page.locator('[data-testid="customer-row-cust-marcus"]')
    await marcusRow.waitFor({ state: 'visible', timeout: 4000 })
    console.log('✓ Search filtered to Marcus Webb profile')

    // Test opening Customer Order History Drawer
    const historyBtn = page.locator('[data-testid="customer-history-btn-cust-marcus"]')
    await historyBtn.click()
    await page.waitForSelector('[data-testid="customer-history-drawer"]', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(600)
    console.log('✓ Opened Customer Order History Drawer')

    // Capture Customer History Drawer Artifact
    await page.screenshot({ path: '/opt/cursor/artifacts/screenshot_customer_crm_drawer.png', fullPage: false })
    console.log('✓ Saved /opt/cursor/artifacts/screenshot_customer_crm_drawer.png')

    // Close History Drawer
    await page.click('[data-testid="close-customer-history-drawer"]')
    await page.waitForSelector('[data-testid="customer-history-drawer"]', { state: 'detached', timeout: 4000 })
    await page.waitForTimeout(400)

    // Test Toggle VIP
    const vipToggleBtn = page.locator('[data-testid="customer-toggle-vip-cust-marcus"]')
    await vipToggleBtn.click()
    await page.waitForTimeout(600)
    console.log('✓ Toggled Customer VIP Status')

    // Test Issue Promo Voucher Modal
    const voucherBtn = page.locator('[data-testid="customer-voucher-btn-cust-marcus"]')
    await voucherBtn.click()
    await page.waitForSelector('[data-testid="issue-voucher-modal"]', { state: 'visible', timeout: 5000 })
    await page.fill('[data-testid="voucher-code-input"]', 'VIP-TSMC-AIRPORT-1000')
    await page.click('[data-testid="submit-issue-voucher-btn"]')
    await page.waitForSelector('[data-testid="issue-voucher-modal"]', { state: 'detached', timeout: 4000 })
    await page.waitForTimeout(600)
    console.log('✓ Issued Promotional Voucher to Marcus Webb')

    // Reset search
    await searchInput.fill('')
    await page.waitForTimeout(400)

    // Capture main Customer CRM Overview
    await page.screenshot({ path: '/opt/cursor/artifacts/screenshot_customer_crm_hub.png', fullPage: false })
    console.log('✓ Saved /opt/cursor/artifacts/screenshot_customer_crm_hub.png')

    console.log('\n--- 3. Testing Comprehensive Driver Operations Hub & 6-Tab Profile Modal ---')
    await page.goto(`${BASE}/fleet-os/drivers`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)

    // Verify 350+ driver table & KPIs
    await page.waitForSelector('[data-testid="driver-hub-kpis"]', { state: 'visible', timeout: 5000 })
    await page.waitForSelector('[data-testid="driver-hub-table"]', { state: 'visible', timeout: 5000 })
    console.log('✓ Driver Hub Table & KPIs visible')

    // Click first driver to open 6-Tab Driver Profile Modal
    const firstDriverTrigger = page.locator('[data-testid^="driver-profile-trigger-"]').first()
    await firstDriverTrigger.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await firstDriverTrigger.click()
    await page.waitForSelector('[data-testid="driver-profile-modal"]', { state: 'visible', timeout: 5000 })
    await page.waitForSelector('[data-testid="driver-tab-overview-content"]', { state: 'visible', timeout: 5000 })
    console.log('✓ Opened Driver Profile Modal (Tab 1: Overview & Vehicle)')

    const modalDialog = page.locator('[data-testid="driver-profile-modal"] > div')
    // Capture Tab 1 (Overview & Vehicle)
    await modalDialog.screenshot({ path: '/opt/cursor/artifacts/screenshot_driver_modal_overview.png' })
    console.log('✓ Saved /opt/cursor/artifacts/screenshot_driver_modal_overview.png')

    // Click Tab 2: Rides & Dispatch
    await page.click('[data-testid="driver-tab-dispatch"]')
    await page.waitForSelector('[data-testid="driver-tab-dispatch-content"]', { state: 'visible', timeout: 4000 })
    console.log('✓ Switched to Tab 2: Rides & Dispatch')

    // Click Tab 3: Shift & Schedule
    await page.click('[data-testid="driver-tab-shift"]')
    await page.waitForSelector('[data-testid="driver-tab-shift-content"]', { state: 'visible', timeout: 4000 })
    console.log('✓ Switched to Tab 3: Shift & Schedule')

    // Click Tab 4: Safety & Fatigue (MOTC HoS)
    await page.click('[data-testid="driver-tab-safety_hos"]')
    await page.waitForSelector('[data-testid="driver-tab-safety-content"]', { state: 'visible', timeout: 4000 })
    console.log('✓ Switched to Tab 4: Safety & Fatigue (MOTC HoS)')

    // Test Force Rest Break button in HoS tab
    const forceBreakBtn = page.locator('[data-testid="driver-modal-force-break-btn"]')
    await forceBreakBtn.click()
    await page.waitForTimeout(500)
    console.log('✓ Triggered MOTC Force Rest Break in modal')

    // Capture Tab 4 (Safety & Fatigue HoS)
    await modalDialog.screenshot({ path: '/opt/cursor/artifacts/screenshot_driver_modal_hos_safety.png' })
    console.log('✓ Saved /opt/cursor/artifacts/screenshot_driver_modal_hos_safety.png')

    // Click Tab 5: Financials & Earnings
    await page.click('[data-testid="driver-tab-financials"]')
    await page.waitForSelector('[data-testid="driver-tab-financials-content"]', { state: 'visible', timeout: 4000 })
    console.log('✓ Switched to Tab 5: Financials & Earnings')

    // Click Tab 6: Compliance & Documents OCR
    await page.click('[data-testid="driver-tab-compliance"]')
    await page.waitForSelector('[data-testid="driver-tab-compliance-content"]', { state: 'visible', timeout: 4000 })
    console.log('✓ Switched to Tab 6: Compliance & Documents OCR')

    // Close modal
    await page.click('[data-testid="driver-modal-close-btn"]')
    await page.waitForSelector('[data-testid="driver-profile-modal"]', { state: 'detached', timeout: 4000 })
    console.log('✓ Closed Driver Profile Modal')

    console.log('\n========================================')
    console.log(' ALL E2E TESTS PASSED WITH 0 ERRORS! ')
    console.log('========================================\n')

  } catch (err) {
    console.error('Test failed with error:', err)
    errors.push(err.message)
  } finally {
    await browser.close()
    preview.kill()
  }

  if (errors.length > 0) {
    console.error('Encountered errors during test run:', errors)
    process.exit(1)
  }
}

runNavCustomersDriversSuite()
