import { chromium } from 'playwright'
import fs from 'node:fs'
import { spawn } from 'node:child_process'

const ARTIFACTS_DIR = '/opt/cursor/artifacts'
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })

async function captureArtifacts() {
  console.log('Building & Starting preview server for artifact capture...')

  const preview = spawn('npx', ['vite', 'preview', '--port', '5188', '--host'], {
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
  const BASE = 'http://localhost:5188'

  try {
    // 1. Artifact: Driver Shift Schedule Editor & Management in Fleet OS
    console.log('Capturing driver shift schedule in Fleet OS...')
    await page.goto(`${BASE}/fleet-os/roster`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const editShiftBtn = page.locator('[data-testid="edit-driver-shift-btn"]').first()
    await editShiftBtn.click()
    await page.waitForSelector('[data-testid="driver-shift-modal"]', { state: 'visible' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/driver_shift_schedule_editor.png` })
    console.log('✓ Saved /opt/cursor/artifacts/driver_shift_schedule_editor.png')

    // Close modal
    await page.click('[data-testid="close-shift-modal"]')
    await page.waitForTimeout(500)

    // 2. Artifact: Smart Manual Assignment Modal with Conflict & Overlap Detection
    console.log('Capturing manual assignment with schedule conflict alert...')
    await page.goto(`${BASE}/fleet-os`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const assignBtn = page.locator('[data-testid="open-assign-modal-btn"]').first()
    await assignBtn.click()
    await page.waitForSelector('[data-testid="manual-assignment-modal"]', { state: 'visible' })

    // Find and click a driver with conflict to show the warning banners and override options
    const conflictDriverCard = page.locator('[data-has-conflict="true"]').first()
    if (await conflictDriverCard.isVisible()) {
      await conflictDriverCard.click()
    } else {
      await page.locator('[data-testid^="assign-driver-card-"]').first().click()
    }
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/manual_assignment_conflict_detection.png` })
    console.log('✓ Saved /opt/cursor/artifacts/manual_assignment_conflict_detection.png')

    // Close modal
    await page.click('[data-testid="close-assignment-modal-btn"]')
    await page.waitForTimeout(500)

    // 3. Artifact: Real-Time Team Messenger with Channels & Airport Presets
    console.log('Capturing team messenger floating dock...')
    await page.click('[data-testid="toggle-fleet-messenger-btn"]')
    await page.waitForSelector('[data-testid="team-messenger-dock"]', { state: 'visible' })
    await page.click('[data-testid="toggle-quick-presets"]')
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/fleet_team_messenger_channels.png` })
    console.log('✓ Saved /opt/cursor/artifacts/fleet_team_messenger_channels.png')

    // 4. Artifact: Driver Order Swap / Handover Exchange Card in Driver App
    console.log('Capturing driver order swap exchange...')
    await page.goto(`${BASE}/driver`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    const swapBtn = page.locator('[data-testid="driver-request-swap-btn"]')
    if (await swapBtn.isVisible()) {
      await swapBtn.click()
      await page.waitForSelector('[data-testid="order-swap-modal"]', { state: 'visible' })
      await page.waitForTimeout(600)
      await page.screenshot({ path: `${ARTIFACTS_DIR}/driver_order_swap_modal.png` })
      console.log('✓ Saved /opt/cursor/artifacts/driver_order_swap_modal.png')

      await page.click('[data-testid="swap-reason-fatigue_shift_end"]')
      await page.click('[data-testid="submit-swap-request-btn"]')
      await page.waitForTimeout(1500)
    }

    // Switch to Driver App Messenger tab showing the published swap card
    await page.click('[data-testid="driver-tab-messenger"]')
    await page.waitForTimeout(1000)
    await page.click('[data-testid="messenger-channel-order-swaps"]')
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${ARTIFACTS_DIR}/driver_order_swap_exchange_board.png` })
    console.log('✓ Saved /opt/cursor/artifacts/driver_order_swap_exchange_board.png')

    console.log('\nAll required screenshot artifacts captured successfully!')
  } catch (err) {
    console.error('Artifact capture error:', err)
  } finally {
    await browser.close()
    preview.kill()
  }
}

captureArtifacts()
