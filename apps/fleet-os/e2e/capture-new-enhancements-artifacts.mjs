import { chromium } from 'playwright'
import fs from 'node:fs'
import { spawn } from 'node:child_process'

const ARTIFACTS_DIR = '/opt/cursor/artifacts'
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })

async function captureNewEnhancementArtifacts() {
  console.log('Starting preview server for new enhancements artifact capture...')

  const preview = spawn('npx', ['vite', 'preview', '--port', '5197', '--host'], {
    cwd: '/workspace/apps/fleet-os',
    stdio: 'ignore',
  })

  await new Promise((r) => setTimeout(r, 2500))

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

  const BASE = 'http://localhost:5197'

  try {
    const page = await context.newPage()

    // 1. Artifact: Clean & Secure 2-Tab Login Screen (No LINE 2FA, no plaintext passwords)
    console.log('1. Capturing Clean 2-Tab Login Screen...')
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 8000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/clean_login_portal_2_tabs.png` })
    console.log('✓ Saved /opt/cursor/artifacts/clean_login_portal_2_tabs.png')

    // Login as Admin
    await page.click('[data-testid="gatekeeper-tab-staff"]')
    await page.fill('[data-testid="gatekeeper-staff-username-input"]', 'admin')
    await page.fill('[data-testid="gatekeeper-staff-password-input"]', 'FleetAdmin2026!')
    await page.click('[data-testid="gatekeeper-staff-submit-btn"]')
    await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 8000 })
    await page.waitForTimeout(800)

    // 2. Artifact: Future Scheduled Orders Center (/fleet-os/future-orders)
    console.log('2. Capturing Future Scheduled Orders Center...')
    await page.goto(`${BASE}/fleet-os/future-orders`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/future_scheduled_orders_center.png` })
    console.log('✓ Saved /opt/cursor/artifacts/future_scheduled_orders_center.png')

    // 3. Artifact: Future Orders 1-Click Pre-Dispatch Modal
    console.log('3. Capturing Pre-Dispatch Assignment Modal for Future Order...')
    const preAssignBtn = page.locator('[data-testid^="preassign-btn-"]').first()
    if (await preAssignBtn.isVisible()) {
      await preAssignBtn.click()
      await page.waitForSelector('[data-testid="manual-assignment-modal"]', { timeout: 5000 })
      await page.waitForTimeout(600)
      await page.screenshot({ path: `${ARTIFACTS_DIR}/future_order_predispatch_modal.png` })
      console.log('✓ Saved /opt/cursor/artifacts/future_order_predispatch_modal.png')
      await page.click('[data-testid="close-assignment-modal-btn"]')
      await page.waitForTimeout(400)
    }

    // 4. Artifact: Control Center Panel with Clickable & Active KPI Filters
    console.log('4. Capturing Control Center Clickable KPI Filter Active State...')
    await page.goto(`${BASE}/fleet-os`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.click('[data-testid="control-kpi-unassigned"]')
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/control_center_clickable_kpi_filter.png` })
    console.log('✓ Saved /opt/cursor/artifacts/control_center_clickable_kpi_filter.png')

    // 5. Artifact: Today Revenue & Financial Analytics Modal
    console.log('5. Capturing Today Revenue & Financial Analytics Modal...')
    await page.click('[data-testid="control-kpi-revenue"]')
    await page.waitForSelector('[data-testid="today-revenue-modal"]', { timeout: 5000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/today_revenue_financial_modal.png` })
    console.log('✓ Saved /opt/cursor/artifacts/today_revenue_financial_modal.png')
    await page.click('[data-testid="close-revenue-modal-btn"]')
    await page.waitForTimeout(400)

    // 6. Artifact: On Leave Drivers Roster Modal
    console.log('6. Capturing On Leave Drivers Roster Modal...')
    await page.click('[data-testid="control-kpi-on-leave"]')
    await page.waitForSelector('[data-testid="on-leave-drivers-modal"]', { timeout: 5000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/on_leave_drivers_roster_modal.png` })
    console.log('✓ Saved /opt/cursor/artifacts/on_leave_drivers_roster_modal.png')
    await page.click('[data-testid="close-on-leave-modal-btn"]')
    await page.waitForTimeout(400)

    console.log('\nAll new enhancement walkthrough artifacts captured successfully!')
  } catch (err) {
    console.error('Artifact capture error:', err)
  } finally {
    await browser.close()
    preview.kill()
  }
}

captureNewEnhancementArtifacts()
