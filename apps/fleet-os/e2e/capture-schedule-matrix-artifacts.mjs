import { chromium } from 'playwright'
import fs from 'node:fs'
import { spawn } from 'node:child_process'

const ARTIFACTS_DIR = '/opt/cursor/artifacts'
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })

async function run() {
  console.log('Starting preview server & capturing Schedule Matrix walkthrough artifacts...')

  const PORT = 5199
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
  const BASE = `http://localhost:${PORT}`

  try {
    // 1. Navigate to /fleet-os/roster and open Schedule Matrix tab
    console.log('Navigating to /fleet-os/roster...')
    await page.goto(`${BASE}/fleet-os/roster`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    // Unlock gatekeeper if present
    const gatekeeper = page.locator('[data-testid="client-gatekeeper-overlay"]')
    if (await gatekeeper.isVisible()) {
      await page.click('[data-testid="gatekeeper-tab-passcode"]')
      await page.fill('[data-testid="gatekeeper-passcode-input"]', '8888')
      await page.click('[data-testid="gatekeeper-passcode-verify-btn"]')
      await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 5000 })
      await page.waitForTimeout(1000)
    }

    console.log('Clicking Schedule Matrix Tab...')
    await page.click('[data-testid="driver-hub-tab-schedule"]')
    await page.waitForSelector('[data-testid="driver-schedule-matrix-root"]', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(1000)

    // Capture Schedule Matrix Overview with Quick Stats and Filter Bar
    console.log('Capturing screenshot_schedule_matrix_overview.png...')
    await page.screenshot({ path: `${ARTIFACTS_DIR}/screenshot_schedule_matrix_overview.png`, fullPage: false })
    console.log('✓ Captured screenshot_schedule_matrix_overview.png')

    // 2. Test Search & Filters in Matrix
    console.log('Testing search and filter...')
    const searchInput = page.locator('[data-testid="schedule-search-input"]')
    await searchInput.fill('ABC-5581')
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/screenshot_schedule_matrix_filtered.png`, fullPage: false })
    console.log('✓ Captured screenshot_schedule_matrix_filtered.png')

    // Clear search
    await searchInput.fill('')
    await page.waitForTimeout(500)

    // 3. Test Clicking Shift Cell (Day/Night/Off Quick Popover)
    console.log('Opening Shift cell quick edit modal...')
    const firstCell = page.locator('[data-testid^="shift-cell-"]').first()
    await firstCell.click()
    await page.waitForSelector('[data-testid="shift-cell-edit-modal"]', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/screenshot_schedule_shift_cell_modal.png`, fullPage: false })
    console.log('✓ Captured screenshot_schedule_shift_cell_modal.png')

    // Click Night shift in popover to adjust
    await page.click('[data-testid="shift-modal-set-night"]')
    await page.waitForSelector('[data-testid="shift-cell-edit-modal"]', { state: 'detached', timeout: 5000 })
    await page.waitForTimeout(800)
    console.log('✓ Adjusted shift via quick cell modal')

    // 4. Test Clicking Driver Profile Trigger from Schedule Matrix
    console.log('Opening Driver Profile Modal from matrix...')
    const firstProfileBtn = page.locator('[data-testid^="schedule-driver-profile-"]').first()
    await firstProfileBtn.click()
    await page.waitForSelector('[data-testid="driver-profile-modal"]', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/screenshot_schedule_driver_profile_opened.png`, fullPage: false })
    console.log('✓ Captured screenshot_schedule_driver_profile_opened.png')

    // Close Profile Modal
    await page.click('[data-testid="close-driver-profile-modal"]')
    await page.waitForSelector('[data-testid="driver-profile-modal"]', { state: 'detached', timeout: 5000 })
    await page.waitForTimeout(500)

    // 5. Test Compact View Toggle
    console.log('Toggling compact view...')
    await page.click('[data-testid="schedule-view-mode-toggle"]')
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/screenshot_schedule_matrix_compact_view.png`, fullPage: false })
    console.log('✓ Captured screenshot_schedule_matrix_compact_view.png')

    console.log('\n=============================================')
    console.log(' ALL ARTIFACTS CAPTURED SUCCESSFULLY! ')
    console.log('=============================================\n')
  } catch (err) {
    console.error('Failed to capture artifacts:', err)
    process.exit(1)
  } finally {
    await browser.close()
    preview.kill()
  }
}

run()
