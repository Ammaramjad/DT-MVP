// Scripted walkthrough of the new bilingual UI (EN <-> 繁體中文) and the
// realistic vehicle catalog (photo + brand/model + type + capacity) across
// the Landing, Booking, Control Center, and Driver panels. Opens a real
// (non-headless) browser window so it can be paired with the RecordScreen
// tool for a demo video.
// Requires the dev server to be running first: `npm run dev`.
// Usage: node e2e/demo-i18n-vehicles.mjs [port]
import { chromium } from 'playwright'

const PORT = process.argv[2] || 5183
const BASE = `http://localhost:${PORT}`

const browser = await chromium.launch({ headless: false, args: ['--window-position=0,0', '--window-size=1600,1000'] })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })

const wait = (ms) => page.waitForTimeout(ms)
// Cross-app links now live inside the collapsed DemoModeSwitcher menu, so
// open it first — it auto-closes again once a link is clicked.
const nav = async (label) => {
  await page.click('[data-testid="demo-switcher-toggle"]')
  await page.getByRole('link', { name: label, exact: false }).first().click()
  await wait(700)
}
const setLang = async (code) => {
  await page.locator(`[data-testid="lang-option-${code}"]`).click()
  await wait(500)
}

const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
})
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))

console.log('1. Landing page in English…')
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await wait(1500)

console.log('2. Switching to 繁體中文 (persists to localStorage)…')
await setLang('zh')
await wait(1000)
const zhStored = await page.evaluate(() => localStorage.getItem('fleet-dispatch-lang'))
console.log('   localStorage lang =', zhStored)

console.log('3. Booking panel in Chinese — vehicle catalog cards…')
await nav('預訂')
await wait(1200)
await page.locator('[data-testid="vehicle-card-SUV"]').click()
await wait(500)
await page.locator('[data-testid="vehicle-card-LUXURY"]').click()
await wait(800)

console.log('4. Control Center in Chinese — fleet roster vehicle cards…')
await nav('調度中心')
await wait(1200)
const rosterTabZh = page.locator('text=車隊名冊').first()
if (await rosterTabZh.count()) await rosterTabZh.click()
await wait(1200)

console.log('5. Driver App in Chinese — "我的車輛" vehicle card…')
await nav('司機端')
await wait(1200)

console.log('6. Switching language back to English mid-session…')
await setLang('en')
await wait(800)
const enStored = await page.evaluate(() => localStorage.getItem('fleet-dispatch-lang'))
console.log('   localStorage lang =', enStored)
await wait(1000)

console.log('7. Confirming persistence across a full page reload…')
await page.reload({ waitUntil: 'networkidle' })
await wait(1200)
const langAfterReload = await page.locator('[data-testid="lang-option-en"]').getAttribute('aria-pressed')
console.log('   EN still active after reload:', langAfterReload)

console.log('8. Back to Chinese for a final Control Center tour…')
await setLang('zh')
await wait(800)
await nav('調度中心')
await wait(1500)

console.log('--- console/page errors:', errors.length, '---')
console.log(errors.slice(0, 20).join('\n'))

await wait(800)
await browser.close()
