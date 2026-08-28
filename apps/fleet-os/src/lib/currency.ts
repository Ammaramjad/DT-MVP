import { create } from 'zustand'
import type { CurrencyCode, CurrencyConfig } from '../types'

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  TWD: {
    code: 'TWD',
    symbol: 'NT$',
    rate: 1,
    name: 'New Taiwan Dollar',
    nameZh: '新台幣 (TWD)',
    decimals: 0,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    rate: 0.03125, // 1 USD = 32.0 TWD
    name: 'US Dollar',
    nameZh: '美元 (USD)',
    decimals: 2,
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    rate: 4.85, // 1 TWD = 4.85 JPY
    name: 'Japanese Yen',
    nameZh: '日圓 (JPY)',
    decimals: 0,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    rate: 0.0288, // 1 EUR = ~34.7 TWD
    name: 'Euro',
    nameZh: '歐元 (EUR)',
    decimals: 2,
  },
  HKD: {
    code: 'HKD',
    symbol: 'HK$',
    rate: 0.244, // 1 HKD = ~4.1 TWD
    name: 'Hong Kong Dollar',
    nameZh: '港幣 (HKD)',
    decimals: 2,
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    rate: 0.0422, // 1 SGD = ~23.7 TWD
    name: 'Singapore Dollar',
    nameZh: '新加坡幣 (SGD)',
    decimals: 2,
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    rate: 0.227, // 1 CNY = ~4.4 TWD
    name: 'Chinese Yuan',
    nameZh: '人民幣 (CNY)',
    decimals: 2,
  },
}

export const ALL_CURRENCIES: CurrencyCode[] = ['TWD', 'USD', 'JPY', 'EUR', 'HKD', 'SGD', 'CNY']

interface CurrencyState {
  currency: CurrencyCode
  setCurrency: (code: CurrencyCode) => void
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: 'TWD',
  setCurrency: (currency) => set({ currency }),
}))

export function convertTWD(amountTWD: number, toCurrency: CurrencyCode): number {
  const config = CURRENCIES[toCurrency] || CURRENCIES.TWD
  return amountTWD * config.rate
}

export function formatConvertedAmount(amountTWD: number, currency: CurrencyCode): string {
  const config = CURRENCIES[currency] || CURRENCIES.TWD
  const converted = convertTWD(amountTWD, currency)
  const formatted =
    config.decimals === 0
      ? Math.round(converted).toLocaleString('en-US')
      : converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${config.symbol}${formatted}`
}

/**
 * Returns formatted dual-currency display string:
 * If TWD: "NT$1,870"
 * If foreign (e.g. USD): "NT$1,870 (~$58.50 USD)"
 */
export function formatDualCurrency(amountTWD: number, currency: CurrencyCode): string {
  const twdFormatted = `NT$${Math.round(amountTWD).toLocaleString('en-US')}`
  if (currency === 'TWD') {
    return twdFormatted
  }
  const foreignFormatted = formatConvertedAmount(amountTWD, currency)
  return `${twdFormatted} (~${foreignFormatted} ${currency})`
}

/**
 * Returns primary foreign currency display with TWD in parentheses, e.g. "$58.50 USD (NT$1,870)"
 */
export function formatPrimaryForeignCurrency(amountTWD: number, currency: CurrencyCode): string {
  const twdFormatted = `NT$${Math.round(amountTWD).toLocaleString('en-US')}`
  if (currency === 'TWD') {
    return twdFormatted
  }
  const foreignFormatted = formatConvertedAmount(amountTWD, currency)
  return `${foreignFormatted} ${currency} (${twdFormatted})`
}
