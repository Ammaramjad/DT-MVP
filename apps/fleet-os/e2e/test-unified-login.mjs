import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'

const ARG = process.argv[2]
const isUrl = ARG && ARG.startsWith('http')
const PORT = isUrl ? '5194' : (ARG || process.env.PORT || '5194')
const BASE = isUrl ? ARG : `http://localhost:${PORT}`
const ARTIFACTS_DIR = '/opt/cursor/artifacts'

const LEAKED_CREDENTIALS = [
  'FleetAdmin2026!',
  'TaiwanDispatch2026!',
  'ONE-TIME-2026',
  'guest_demo',
  'admin /',
  'dispatcher /',
  'PASS-8842',
  'PASS-1002',
  '8888',
  'FLEET2026',
]

if (!existsSync(ARTIFACTS_DIR)) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true })
}

let preview = null
if (!isUrl) {
  console.log(`Starting Vite Preview server on port ${PORT}...`)
  preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host'], {
    cwd: '/workspace/apps/fleet-os',
    stdio: 'ignore',
  })
  await new Promise((r) => setTimeout(r, 1500))
} else {
  console.log(`Running against remote endpoint: ${BASE}`)
}

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
})
const page = await context.newPage()

const log = (msg) => console.log(`\n=== ${msg} ===`)

const fillLogin = async (username, password) => {
  await page.fill('[data-testid="gatekeeper-username-input"]', username)
  await page.fill('[data-testid="gatekeeper-password-input"]', password)
  await page.click('[data-testid="gatekeeper-submit-btn"]')
}

const assertNoCredentialLeakage = async () => {
  const bodyText = await page.locator('[data-testid="gatekeeper-modal"]').textContent()
  for (const cred of LEAKED_CREDENTIALS) {
    if (bodyText.includes(cred)) {
      throw new Error(`Credential leak detected on login page: "${cred}"`)
    }
  }

  const tabCount = await page.locator('[data-testid^="gatekeeper-tab-"]').count()
  if (tabCount !== 0) {
    throw new Error('Login page must not have separate Staff/Guest tabs')
  }

  const lineTabCount = await page.locator('[data-testid="gatekeeper-tab-line"]').count()
  if (lineTabCount !== 0) {
    throw new Error('LINE 2FA tab must be removed from the login screen')
  }
}

try {
  log('1. Verify unified single login form with zero credential leakage')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })

  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 8000 })
  await page.waitForSelector('[data-testid="gatekeeper-login-form"]', { timeout: 5000 })
  await page.waitForSelector('[data-testid="gatekeeper-username-input"]', { timeout: 5000 })
  await page.waitForSelector('[data-testid="gatekeeper-password-input"]', { timeout: 5000 })
  await page.waitForSelector('[data-testid="gatekeeper-submit-btn"]', { timeout: 5000 })

  await assertNoCredentialLeakage()
  console.log('✓ Single unified login form with no exposed credentials')

  await page.screenshot({
    path: `${ARTIFACTS_DIR}/unified_login_clean.png`,
    fullPage: false,
  })
  console.log(`✓ Saved screenshot: ${ARTIFACTS_DIR}/unified_login_clean.png`)

  log('2. Admin login and pass generator access')
  await fillLogin('admin', 'FleetAdmin2026!')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 8000 })
  console.log('✓ Admin login successful')

  await page.goto(BASE + '/fleet-os/admin', { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="admin-tab-VAULT"]', { timeout: 8000 })
  await page.click('[data-testid="admin-tab-VAULT"]')
  await page.waitForSelector('[data-testid="guest-pass-vault-container"]', { timeout: 8000 })
  await page.waitForSelector('[data-testid="generate-guest-pass-btn"]', { timeout: 8000 })
  console.log('✓ Admin can access pass generator')

  await page.screenshot({
    path: `${ARTIFACTS_DIR}/admin_pass_generator_only.png`,
    fullPage: false,
  })
  console.log(`✓ Saved screenshot: ${ARTIFACTS_DIR}/admin_pass_generator_only.png`)

  log('3. Guest login — cannot generate passes')
  await page.click('[data-testid="header-logout-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 8000 })

  await fillLogin('guest_demo', 'ONE-TIME-2026')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { state: 'detached', timeout: 8000 })
  console.log('✓ Guest login successful')

  await page.goto(BASE + '/fleet-os/admin', { waitUntil: 'networkidle' })
  const vaultCount = await page.locator('[data-testid="guest-pass-vault-container"]').count()
  const generateBtnCount = await page.locator('[data-testid="generate-guest-pass-btn"]').count()
  if (vaultCount !== 0 || generateBtnCount !== 0) {
    throw new Error('Guest user must not see pass generator or vault')
  }
  console.log('✓ Guest cannot access pass generator in admin panel')

  await page.goto(BASE + '/fleet-os/access-logs', { waitUntil: 'networkidle' })
  const accessVaultCount = await page.locator('[data-testid="guest-pass-vault-container"]').count()
  if (accessVaultCount !== 0) {
    throw new Error('Guest user must not see pass vault in access logs')
  }
  console.log('✓ Guest cannot access pass vault in access logs')

  log('4. Guest logout burns token — second login fails')
  await page.click('[data-testid="header-logout-btn"]')
  await page.waitForSelector('[data-testid="client-gatekeeper-overlay"]', { timeout: 8000 })

  await fillLogin('guest_demo', 'ONE-TIME-2026')
  await page.waitForSelector('[data-testid="gatekeeper-burned-error"]', { timeout: 8000 })
  const burnedErrorText = await page.locator('[data-testid="gatekeeper-burned-error"]').textContent()
  if (
    !burnedErrorText.includes('already been used and expired') &&
    !burnedErrorText.includes('已使用並已作廢')
  ) {
    throw new Error(`Expected burned pass error, got: "${burnedErrorText}"`)
  }
  console.log(`✓ Burned token error displayed: "${burnedErrorText.trim()}"`)

  await page.screenshot({
    path: `${ARTIFACTS_DIR}/guest_burned_reentry_error.png`,
    fullPage: false,
  })
  console.log(`✓ Saved screenshot: ${ARTIFACTS_DIR}/guest_burned_reentry_error.png`)

  log('ALL UNIFIED LOGIN TESTS PASSED SUCCESSFULLY!')
} catch (err) {
  console.error('\n❌ Test execution failed:', err)
  process.exitCode = 1
} finally {
  await browser.close()
  if (preview) preview.kill()
}
