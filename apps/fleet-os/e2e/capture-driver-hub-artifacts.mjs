import { chromium } from 'playwright'
import fs from 'node:fs'
import { spawn } from 'node:child_process'

const ARTIFACTS_DIR = '/opt/cursor/artifacts'
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })

async function run() {
  console.log('Starting preview server & capturing walkthrough artifacts...')

  const PORT = 5198
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
    // 1. Fixed Map Sizing on Main Page / Control Center (/fleet-os)
    console.log('Capturing map sizing on /fleet-os...')
    await page.goto(`${BASE}/fleet-os`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/screenshot_control_center_map_fixed.png`, fullPage: false })
    console.log('✓ Captured screenshot_control_center_map_fixed.png')

    // 2. Standalone Driver App Cockpit / Home Tab (/driver)
    console.log('Capturing Driver App Home Tab...')
    const driverContext = await browser.newContext({ viewport: { width: 420, height: 880 } })
    await driverContext.addInitScript(() => {
      try {
        localStorage.setItem('fleet_preview_auth_token', 'test_e2e_token_' + Date.now())
        localStorage.setItem('fleet_lang', 'zh')
      } catch {}
    })
    const driverPage = await driverContext.newPage()
    await driverPage.goto(`${BASE}/driver`, { waitUntil: 'networkidle' })
    await driverPage.waitForTimeout(1500)
    await driverPage.screenshot({ path: `${ARTIFACTS_DIR}/screenshot_driver_app_cockpit_home.png`, fullPage: false })
    console.log('✓ Captured screenshot_driver_app_cockpit_home.png')

    // 3. Driver App Activity Tab (Rides & Schedule, Airport bookings, Shift)
    console.log('Capturing Driver App Activity Tab...')
    await driverPage.click('[data-testid="driver-tab-activity"]')
    await driverPage.waitForTimeout(1000)
    await driverPage.screenshot({ path: `${ARTIFACTS_DIR}/screenshot_driver_app_activity_schedule.png`, fullPage: false })
    console.log('✓ Captured screenshot_driver_app_activity_schedule.png')

    // 4. Driver App Earnings Tab (Instant Cashout, Revenue breakdown)
    console.log('Capturing Driver App Earnings Tab...')
    await driverPage.click('[data-testid="driver-tab-earnings"]')
    await driverPage.waitForTimeout(1000)
    await driverPage.screenshot({ path: `${ARTIFACTS_DIR}/screenshot_driver_app_earnings_wallet.png`, fullPage: false })
    console.log('✓ Captured screenshot_driver_app_earnings_wallet.png')

    // 5. Driver App Account & MOTC HoS / Safety Inspection
    console.log('Capturing Driver App Account & Safety...')
    await driverPage.click('[data-testid="driver-tab-account"]')
    await driverPage.waitForTimeout(1000)
    await driverPage.screenshot({ path: `${ARTIFACTS_DIR}/screenshot_driver_app_account_safety.png`, fullPage: false })
    console.log('✓ Captured screenshot_driver_app_account_safety.png')
    await driverContext.close()

    // 6. Fleet OS Driver Management Hub (/fleet-os/roster & /fleet-os/drivers)
    console.log('Capturing Fleet OS Driver Management Hub...')
    await page.goto(`${BASE}/fleet-os/drivers`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/screenshot_fleet_os_driver_hub.png`, fullPage: false })
    console.log('✓ Captured screenshot_fleet_os_driver_hub.png')

    // 7. Driver Hub Shift Modal & 1-Click Dispatch
    console.log('Capturing Driver Hub Shift Modal...')
    const shiftBtn = page.locator('[data-testid^="driver-shift-btn-"]').first()
    if (await shiftBtn.isVisible()) {
      await shiftBtn.click()
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${ARTIFACTS_DIR}/screenshot_driver_hub_shift_modal.png`, fullPage: false })
      console.log('✓ Captured screenshot_driver_hub_shift_modal.png')
    }
  } catch (err) {
    console.error('Error capturing artifacts:', err)
  } finally {
    await browser.close()
    preview.kill('SIGTERM')
  }
  console.log('All walkthrough artifacts captured!')
}

run()
