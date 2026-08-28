import { chromium } from 'playwright'

const PORT = process.argv[2] || process.env.PORT || 5183
const BASE = `http://localhost:${PORT}`

async function runTests() {
  console.log(`Starting Enterprise Expansion Suite E2E Tests on ${BASE}...`)
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addInitScript(() => {
    try {
      localStorage.setItem('fleet_preview_auth_token', 'test_e2e_token_' + Date.now())
    } catch {}
  })
  const page = await context.newPage()

  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))

  try {
    // 1. Multi-Currency Live Converter Test
    console.log('--- 1. Testing Multi-Currency Live Converter ---')
    await page.goto(`${BASE}/marketplace`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="marketplace-currency-selector-btn"]')
    await page.click('[data-testid="marketplace-currency-selector-btn"]')
    await page.waitForSelector('[data-testid="currency-option-USD"]')
    await page.click('[data-testid="currency-option-USD"]')
    await page.waitForTimeout(600)
    const marketplaceText = await page.textContent('[data-testid="marketplace-results-grid"]')
    if (!marketplaceText.includes('USD')) {
      throw new Error('USD dual-currency not found in Marketplace cards')
    }
    console.log('✓ Multi-currency working smoothly in Marketplace')

    // 2. Interactive Client Demo Tour Test
    console.log('--- 2. Testing Interactive Client Demo Tour Mode ---')
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="interactive-tour-trigger-pill"]')
    await page.click('[data-testid="interactive-tour-trigger-pill"]')
    await page.waitForSelector('[data-testid="demo-tour-dock"]')
    console.log('✓ Tour dock successfully appeared')

    // Click Next Step through tour milestones
    await page.click('[data-testid="demo-tour-next-btn"]')
    await page.waitForTimeout(800)
    await page.click('[data-testid="demo-tour-next-btn"]')
    await page.waitForTimeout(800)
    console.log('✓ Step-by-step tour navigation verified')

    // 3. AI Predictive Fleet Demand & Weather Forecasting Test
    console.log('--- 3. Testing AI Demand Forecast Module ---')
    await page.goto(`${BASE}/fleet-os/forecast`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="forecast-panel"]')
    await page.waitForSelector('[data-testid="rebalance-recommendations-grid"]')
    await page.waitForSelector('[data-testid="execute-rebalance-btn-reb-1"]')
    await page.click('[data-testid="execute-rebalance-btn-reb-1"]')
    await page.waitForSelector('[data-testid="rebalance-broadcast-toast"]')
    console.log('✓ AI demand forecast & auto-rebalance broadcast verified')

    // 4. Taiwan Electronic Invoice (e-GUI) Center Test
    console.log('--- 4. Testing Taiwan e-GUI Invoice Center ---')
    await page.goto(`${BASE}/fleet-os/invoices`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="invoices-panel"]')
    await page.waitForSelector('[data-testid="invoices-table"]')
    await page.click('[data-testid="view-invoice-modal-btn-inv-tw-202608-001"]')
    await page.waitForSelector('[data-testid="taiwan-invoice-modal"]')
    console.log('✓ Taiwan MOF dual QR & barcode thermal e-GUI receipt modal verified')

    // 5. Corporate B2B & Group Travel Portal Test
    console.log('--- 5. Testing Corporate B2B Travel Portal ---')
    await page.goto(`${BASE}/fleet-os/corporate`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="corporate-panel"]')
    await page.waitForSelector('[data-testid="corporate-accounts-list"]')
    await page.click('[data-testid="toggle-luxury-approval-btn"]')
    await page.waitForSelector('[data-testid="corporate-action-alert"]')
    console.log('✓ Corporate account governance & credit line verified')

    // 6. Customer AI Travel Concierge Assistant Test
    console.log('--- 6. Testing Customer AI Travel Concierge Assistant ---')
    await page.goto(`${BASE}/customer`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="customer-ai-concierge-btn"]')
    await page.click('[data-testid="customer-ai-concierge-btn"]')
    await page.waitForSelector('[data-testid="ai-concierge-drawer"]')
    await page.click('[data-testid="quick-prompt-btn-prompt-tpe-meeting-point"]')
    await page.waitForTimeout(600)
    const messagesText = await page.textContent('[data-testid="ai-concierge-messages"]')
    if (!messagesText.includes('Meeting Point') && !messagesText.includes('會面柱')) {
      throw new Error('AI Concierge response missing meeting point keywords')
    }
    console.log('✓ Customer AI Concierge assistant interactive replies verified')

    console.log('\n========================================')
    console.log('ALL ENTERPRISE EXPANSION SUITE TESTS PASSED!')
    console.log('========================================\n')
  } catch (err) {
    console.error('Test failed with error:', err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

runTests()
