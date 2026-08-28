import { chromium } from 'playwright'
import fs from 'node:fs'
import { spawn } from 'node:child_process'

const ARTIFACTS_DIR = '/opt/cursor/artifacts'
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })

async function captureArtifacts() {
  console.log('Building & Starting preview server for artifact capture...')

  const preview = spawn('npx', ['vite', 'preview', '--port', '5189', '--host'], {
    cwd: '/workspace/apps/fleet-os',
    stdio: 'ignore',
  })

  // Wait 2.5s for server startup
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
  const BASE = 'http://localhost:5189'

  try {
    // 1. Artifact: Dedicated Interactive Drag-and-Drop Dispatch Board (/fleet-os/dispatch)
    console.log('Capturing Drag & Drop Dispatch Board (/fleet-os/dispatch)...')
    await page.goto(`${BASE}/fleet-os/dispatch`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/drag_and_drop_dispatch_board.png` })
    console.log('✓ Saved /opt/cursor/artifacts/drag_and_drop_dispatch_board.png')

    // 2. Artifact: Schedule & Conflict Guard Confirmation Dialog
    console.log('Capturing Schedule & Shift Conflict Guard Dialog...')
    await page.goto(`${BASE}/fleet-os/dispatch`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    // Filter drivers to find night shift driver or any driver with conflict
    await page.fill('[data-testid="dispatch-driver-search-input"]', 'Chien-Cheng')
    await page.waitForTimeout(500)
    const quickAssignBtn = page.locator('[data-testid^="quick-assign-driver-btn-"]').first()
    await quickAssignBtn.click()
    await page.waitForSelector('[data-testid="conflict-override-dialog"]', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/dispatch_conflict_guard_alert.png` })
    console.log('✓ Saved /opt/cursor/artifacts/dispatch_conflict_guard_alert.png')

    // 3. Artifact: Dedicated Fleet OS Messenger Operations Communications Center (/fleet-os/messenger)
    console.log('Capturing Dedicated Fleet OS Messenger (/fleet-os/messenger)...')
    await page.goto(`${BASE}/fleet-os/messenger`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.click('[data-testid="toggle-quick-presets"]')
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/dedicated_fleet_messenger_operations_center.png` })
    console.log('✓ Saved /opt/cursor/artifacts/dedicated_fleet_messenger_operations_center.png')

    // 4. Artifact: Driver App Home Tab Quick-Access Messenger Card (/driver)
    console.log('Capturing Driver App Home Tab with Messenger & Swaps Quick Access Card...')
    await page.goto(`${BASE}/driver`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/driver_app_messenger_quick_access.png` })
    console.log('✓ Saved /opt/cursor/artifacts/driver_app_messenger_quick_access.png')

    // 5. Artifact: Fleet OS Header Floating Dock Launcher with Glowing Badge
    console.log('Capturing Fleet OS Header with Messenger Floating Launcher...')
    await page.goto(`${BASE}/fleet-os/roster`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.click('[data-testid="header-messenger-toggle-btn"]')
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/fleet_os_header_messenger_launcher.png` })
    console.log('✓ Saved /opt/cursor/artifacts/fleet_os_header_messenger_launcher.png')

    console.log('🎉 All walkthrough artifacts captured successfully!')
  } catch (err) {
    console.error('Artifact capture failed:', err)
  } finally {
    await browser.close()
    preview.kill()
  }
}

captureArtifacts()
