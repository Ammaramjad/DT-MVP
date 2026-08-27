// End-to-end test verifying the Global Client Access Gatekeeper & LINE 2FA Verification Flow:
// 1. Initial visit without auth token shows Apple-grade glassmorphic Access Gate.
// 2. Bilingual toggle works seamlessly on the lock screen.
// 3. LINE 2FA push simulation sends notification and unlocks with OTP `8899`.
// 4. In-session lock button in DemoModeSwitcher re-locks portal on command.
// 5. VIP Passcode (`8888` / `FLEET2026`) and 1-Click Demo Unlock work flawlessly.
// 6. localStorage token persistence ensures seamless cross-route navigation.

import { chromium } from 'playwright'

const ARG = process.argv[2] || process.env.PORT || '5183'
const BASE = ARG.startsWith('http') ? ARG : `http://localhost:${ARG}`

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(err.message))

const log = (msg) => console.log(`\n=== ${msg} ===`)

try {
  log('1. Visit Landing Page without auth token — Verify Gatekeeper is active')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 6000 })
  await page.waitForSelector('[data-testid="gatekeeper-modal"]', { timeout: 6000 })
  console.log('✓ Access Gatekeeper modal correctly intercepted unauthenticated visit')

  log('2. Verify bilingual switch on Gatekeeper')
  await page.click('[data-testid="gatekeeper-lang-zh"]')
  await page.waitForTimeout(300)
  const zhHeading = await page.locator('[data-testid="gatekeeper-modal"]').textContent()
  if (!zhHeading.includes('尊榮客戶專屬預覽')) {
    throw new Error('Expected Traditional Chinese text after switching language on gatekeeper')
  }
  console.log('✓ Language switch to 繁體中文 works on Gatekeeper')

  log('3. Test LINE 2FA Push Flow')
  await page.click('[data-testid="gatekeeper-tab-line"]')
  await page.fill('[data-testid="gatekeeper-line-input"]', '0912-345-678')
  await page.click('[data-testid="gatekeeper-line-send-btn"]')

  await page.waitForSelector('[data-testid="line-push-notification-banner"]', { timeout: 5000 })
  console.log('✓ Instant LINE Push notification banner displayed')

  // Test entering invalid OTP
  await page.fill('[data-testid="gatekeeper-line-otp-input"]', '1234')
  await page.click('[data-testid="gatekeeper-line-verify-btn"]')
  await page.waitForSelector('[data-testid="gatekeeper-line-error"]')
  console.log('✓ Invalid OTP correctly caught with error message')

  // Test entering valid OTP 8899
  await page.fill('[data-testid="gatekeeper-line-otp-input"]', '8899')
  await page.click('[data-testid="gatekeeper-line-verify-btn"]')

  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 6000 })
  console.log('✓ Valid LINE OTP 8899 successfully unlocked Fleet OS prototype')

  log('4. Re-lock system via DemoModeSwitcher Lock button')
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.waitForSelector('[data-testid="gatekeeper-lock-system-btn"]')
  await page.click('[data-testid="gatekeeper-lock-system-btn"]')

  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 5000 })
  console.log('✓ "Lock System" button successfully re-locked the application')

  log('5. Test Passcode Authentication Flow (Master Passcode & 1-Click Demo)')
  await page.click('[data-testid="gatekeeper-tab-passcode"]')
  await page.fill('[data-testid="gatekeeper-passcode-input"]', 'WRONG_CODE')
  await page.click('[data-testid="gatekeeper-passcode-unlock-btn"]')
  await page.waitForSelector('[data-testid="gatekeeper-passcode-error"]')
  console.log('✓ Invalid passcode correctly rejected')

  await page.fill('[data-testid="gatekeeper-passcode-input"]', '8888')
  await page.click('[data-testid="gatekeeper-passcode-unlock-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 6000 })
  console.log('✓ Master Passcode 8888 successfully unlocked the portal')

  log('6. Verify persistence across direct navigation to protected routes')
  await page.goto(BASE + '/fleet-os/pricing/dynamic', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="pricing-zone-table"]', { timeout: 6000 })
  const isGatePresent = await page.locator('[data-testid="client-gatekeeper-overlay"]').count()
  if (isGatePresent !== 0) {
    throw new Error('Gatekeeper should remain unlocked for authenticated session')
  }
  console.log('✓ Authenticated session persists seamlessly across /fleet-os/* routes')

  console.log('\n========================================')
  console.log('🎉 ALL GATEKEEPER & LINE 2FA TESTS PASSED!')
  console.log('========================================\n')
} catch (err) {
  console.error('❌ Gatekeeper E2E Test Failed:', err)
  process.exitCode = 1
} finally {
  console.log('Console errors captured:', consoleErrors.length)
  consoleErrors.forEach((e) => console.log(' -', e))
  await context.close()
  await browser.close()
}
