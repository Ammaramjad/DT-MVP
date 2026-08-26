import { chromium } from 'playwright'
import fs from 'node:fs'

const PORT = process.argv[2] || 5183
const BASE = `http://localhost:${PORT}`
const OUT = '/tmp/demo-zh-check'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } })
const wait = (ms) => page.waitForTimeout(ms)
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('📸', name)
}

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(err.message))

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.click('[data-testid="demo-switcher-toggle"]')
await page.click('[data-testid="lang-option-zh"]')
await wait(500)
await shot('zh_landing')

await page.goto(BASE + '/marketplace', { waitUntil: 'networkidle' })
await wait(800)
await shot('zh_marketplace')

await page.goto(BASE + '/fleet-os', { waitUntil: 'networkidle' })
await wait(1000)
await shot('zh_fleetos_dashboard')

await page.goto(BASE + '/fleet-os/suppliers', { waitUntil: 'networkidle' })
await wait(800)
await shot('zh_fleetos_suppliers')

await page.goto(BASE + '/customer', { waitUntil: 'networkidle' })
await wait(800)
await page.click('[data-testid="customer-tab-trips"]')
await wait(500)
await shot('zh_customer_trips')
await page.click('[data-testid="customer-tab-account"]')
await wait(500)
await shot('zh_customer_account')

await page.goto(BASE + '/driver', { waitUntil: 'networkidle' })
await wait(800)
await shot('zh_driver_home')
await page.click('[data-testid="driver-tab-earnings"]')
await wait(500)
await shot('zh_driver_earnings')

console.log('\nConsole errors captured:', consoleErrors.length)
consoleErrors.forEach((e) => console.log(' -', e))

await browser.close()
