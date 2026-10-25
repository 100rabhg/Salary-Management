import { describe, expect, it } from 'vitest'
import { amountInWords } from './amountInWords'

describe('amountInWords', () => {
  it('uses lakh and crore for INR', () => {
    expect(amountInWords('1200000', 'INR')).toBe('Twelve lakh rupees')
    expect(amountInWords('65000000', 'INR')).toBe('Six crore fifty lakh rupees')
  })

  it('uses thousand and million for other currencies', () => {
    expect(amountInWords('2500000', 'USD')).toBe('Two million five hundred thousand dollars')
    expect(amountInWords(85000, 'EUR')).toBe('Eighty-five thousand euros')
  })

  it('reads the minor unit and pads a single decimal', () => {
    expect(amountInWords('1234.5', 'USD')).toBe('One thousand two hundred thirty-four dollars and fifty cents')
    expect(amountInWords('1.01', 'INR')).toBe('One rupee and one paisa')
  })

  it('uses the singular for one unit', () => {
    expect(amountInWords('1', 'GBP')).toBe('One pound')
  })

  it('ignores digit-grouping commas, Indian or international', () => {
    expect(amountInWords('1,00,000', 'INR')).toBe('One lakh rupees')
    expect(amountInWords(' 1,000,000 ', 'SGD')).toBe('One million Singapore dollars')
  })

  it('accepts whole JPY amounts and rejects fractional ones', () => {
    expect(amountInWords('7200000', 'JPY')).toBe('Seven million two hundred thousand yen')
    expect(amountInWords('100.00', 'JPY')).toBe('One hundred yen')
    expect(amountInWords('100.50', 'JPY')).toBeNull()
  })

  it('returns null while the amount is empty, zero or not a valid amount', () => {
    for (const value of ['', '0', '0.00', 'abc', '-5', '10.123', '1e5']) {
      expect(amountInWords(value, 'USD'), value).toBeNull()
    }
  })

  it('returns null without a supported currency', () => {
    expect(amountInWords('100', null)).toBeNull()
    expect(amountInWords('100', 'XYZ')).toBeNull()
  })
})
