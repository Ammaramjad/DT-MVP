// End-to-end test verifying the Global Client Access Gatekeeper & LINE 2FA Verification Flow:
// 1. Initial visit without auth token shows Apple-grade glassmorphic Access Gate.
// 2. Strict Zero-Leakage: Zero application DOM, maps, orders, routes, or dashboard components exist in the background when locked.
// 3. Bilingual toggle works seamlessly on the lock screen.
// 4. LINE 2FA push simulation sends notification and unlocks with OTP `8899`.
// 5. In-session lock button in DemoModeSwitcher re-locks portal on command and unmounts all app DOM immediately.
// 6. VIP Passcodes (`8888` / `FLEET2026`) standard entry unlocks cleanly without bypasses or leaks.
// 7. localStorage token persistence ensures seamless cross-route navigation.

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

const checkZeroLeakage = async () => {
  // Verify that zero application / dashboard / map / route DOM elements are mounted
  const appSelectors = [
    '[data-testid="demo-switcher-toggle"]',
    '[data-testid="fleetos-nav"]',
    '.leaflet-container',
    'a[href="/booking"]',
    'a[href="/fleet-os"]',
  ]

  for (const selector of appSelectors) {
    const count = await page.locator(selector).count()
    if (count > 0) {
      throw new Error(`Zero-leakage check failed: DOM element "${selector}" was mounted while system is locked!`)
    }
  }
}

try {
  log('1. Visit Landing Page without auth token — Verify Gatekeeper is active and ZERO app DOM is mounted')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 6000 })
  await page.waitForSelector('[data-testid="gatekeeper-modal"]', { timeout: 6000 })
  console.log('✓ Access Gatekeeper modal correctly intercepted unauthenticated visit')

  await checkZeroLeakage()
  console.log('✓ Verified Zero-Leakage: 0 app/dashboard/map/navigation elements rendered in background')

  log('2. Verify bilingual switch on Gatekeeper')
  await page.click('[data-testid="gatekeeper-lang-zh"]')
  await page.waitForTimeout(300)
  const zhHeading = await page.locator('[data-testid="gatekeeper-modal"]').textContent()
  if (!zhHeading.includes('尊榮客戶專屬預覽')) {
    throw new Error('Expected Traditional Chinese text after switching language on gatekeeper')
  }
  console.log('✓ Language switch to 繁體中文 works on Gatekeeper')

  log('3. Test LINE 2FA Push Flow & Verify No 1-Click Bypass Exists')
  await page.click('[data-testid="gatekeeper-tab-line"]')
  await page.fill('[data-testid="gatekeeper-line-input"]', '0912-345-678')
  await page.click('[data-testid="gatekeeper-line-send-btn"]')

  await page.waitForSelector('[data-testid="gatekeeper-line-sent-notice"]', { timeout: 5000 })
  console.log('✓ Calm confirmation notice displayed without leaking OTP')

  // Verify that 1-click approve button is completely removed and banner does not leak OTP
  const line1ClickCount = await page.locator('[data-testid="gatekeeper-line-1click-approve-btn"]').count()
  const lineBannerApproveCount = await page.locator('[data-testid="line-banner-fill-and-unlock-btn"]').count()
  const lineBannerCount = await page.locator('[data-testid="line-push-notification-banner"]').count()
  if (line1ClickCount > 0 || lineBannerApproveCount > 0 || lineBannerCount > 0) {
    throw new Error('1-click bypass buttons or OTP banner should not exist in LINE 2FA tab')
  }
  console.log('✓ Confirmed 1-click LINE approval bypasses and OTP disclosure banner are completely removed')

  // Test entering invalid OTP
  await page.fill('[data-testid="gatekeeper-line-otp-input"]', '1234')
  await page.click('[data-testid="gatekeeper-line-verify-btn"]')
  await page.waitForSelector('[data-testid="gatekeeper-line-error"]')
  const lineErrMsg = await page.locator('[data-testid="gatekeeper-line-error"]').textContent()
  if (lineErrMsg.includes('8899')) {
    throw new Error('LINE OTP error message should not leak passcode "8899"')
  }
  await checkZeroLeakage()
  console.log('✓ Invalid OTP correctly caught with privacy-safe error message and app remains unmounted')

  // Test entering valid OTP 8899
  await page.fill('[data-testid="gatekeeper-line-otp-input"]', '8899')
  await page.click('[data-testid="gatekeeper-line-verify-btn"]')

  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 6000 })
  await page.waitForSelector('[data-testid="demo-switcher-toggle"]', { timeout: 6000 })
  console.log('✓ Valid LINE OTP 8899 successfully unlocked Fleet OS prototype')

  log('4. Re-lock system via DemoModeSwitcher Lock button')
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.waitForSelector('[data-testid="gatekeeper-lock-system-btn"]')
  await page.click('[data-testid="gatekeeper-lock-system-btn"]')

  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 5000 })
  await checkZeroLeakage()
  console.log('✓ "Lock System" button successfully re-locked and unmounted all app DOM')

  log('5. Test Passcode Authentication Flow & Verify No Hints or 1-Click Bypass')
  await page.click('[data-testid="gatekeeper-tab-passcode"]')

  // Verify 1-click demo unlock button is removed
  const demo1ClickCount = await page.locator('[data-testid="gatekeeper-1click-demo-btn"]').count()
  if (demo1ClickCount > 0) {
    throw new Error('1-click demo button should not exist on Passcode tab')
  }
  console.log('✓ Confirmed 1-click Demo Unlock button is completely removed')

  // Verify modal text does not contain hints like 8888 or FLEET2026
  const modalText = await page.locator('[data-testid="gatekeeper-passcode-section"]').textContent()
  if (modalText.includes('8888') || modalText.includes('FLEET2026')) {
    throw new Error('Passcode tab should not contain visible hints with 8888 or FLEET2026')
  }
  console.log('✓ Confirmed no visible passcode hints or master codes on Passcode UI')

  // Test wrong passcode
  await page.fill('[data-testid="gatekeeper-passcode-input"]', 'WRONG_CODE')
  await page.click('[data-testid="gatekeeper-passcode-unlock-btn"]')
  await page.waitForSelector('[data-testid="gatekeeper-passcode-error"]')
  const passcodeErrMsg = await page.locator('[data-testid="gatekeeper-passcode-error"]').textContent()
  if (passcodeErrMsg.includes('8888') || passcodeErrMsg.includes('FLEET2026')) {
    throw new Error('Passcode error message should not leak valid passwords')
  }
  await checkZeroLeakage()
  console.log('✓ Invalid passcode correctly rejected with privacy-safe error message and app remains unmounted')

  // Test valid master passcode (8888)
  await page.fill('[data-testid="gatekeeper-passcode-input"]', '8888')
  await page.click('[data-testid="gatekeeper-passcode-unlock-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 6000 })
  await page.waitForSelector('[data-testid="demo-switcher-toggle"]', { timeout: 6000 })
  console.log('✓ Master Passcode 8888 successfully unlocked the portal')

  // Test locking again and unlocking with FLEET2026
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.waitForSelector('[data-testid="gatekeeper-lock-system-btn"]')
  await page.click('[data-testid="gatekeeper-lock-system-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 5000 })
  await checkZeroLeakage()

  await page.click('[data-testid="gatekeeper-tab-passcode"]')
  await page.fill('[data-testid="gatekeeper-passcode-input"]', 'FLEET2026')
  await page.click('[data-testid="gatekeeper-passcode-unlock-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 6000 })
  await page.waitForSelector('[data-testid="demo-switcher-toggle"]', { timeout: 6000 })
  console.log('✓ Master Passcode FLEET2026 successfully unlocked the portal')

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
