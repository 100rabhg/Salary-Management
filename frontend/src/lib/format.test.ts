import { describe, expect, it } from 'vitest'
import { formatCompactMoney, formatDate, formatMoney, formatPercent, formatRate, initials } from './format'

describe('formatMoney', () => {
  it('uses Indian digit grouping for INR and drops .00 on whole amounts', () => {
    expect(formatMoney('1200000.00', 'INR')).toBe('₹12,00,000')
  })

  it('keeps decimals when there are any', () => {
    expect(formatMoney('72000.50', 'GBP')).toBe('£72,000.50')
  })

  it('formats currencies without a minor unit', () => {
    expect(formatMoney('7200000.00', 'JPY')).toBe('¥7,200,000')
  })
})

describe('formatPercent', () => {
  it('signs increases and decreases', () => {
    expect(formatPercent(8)).toBe('+8.0%')
    expect(formatPercent(-3.25)).toBe('−3.3%')
    expect(formatPercent(0)).toBe('0.0%')
  })
})

describe('formatDate and initials', () => {
  it('formats API dates for reading', () => {
    expect(formatDate('2026-11-03')).toBe('3 Nov 2026')
  })

  it('takes the first two initials', () => {
    expect(initials('Jordan  Rivera Lee')).toBe('JR')
  })
})

describe('formatCompactMoney and formatRate', () => {
  it('shortens headline figures in each currency\'s style', () => {
    expect(formatCompactMoney('5362817187.87', 'INR')).toBe('₹536.3Cr')
    expect(formatCompactMoney('64353806254.48', 'INR')).toBe('₹6,435Cr')
    expect(formatCompactMoney('1200000.00', 'INR')).toBe('₹12L')
    expect(formatCompactMoney('22187.50', 'USD')).toBe('$22.2K')
    expect(formatCompactMoney('34080000.00', 'JPY')).toBe('¥34.1M')
  })

  it('shows exchange rates to five significant digits', () => {
    expect(formatRate(94.94505, 'INR')).toBe('₹94.945')
    expect(formatRate(0.625, 'INR')).toBe('₹0.625')
  })
})
