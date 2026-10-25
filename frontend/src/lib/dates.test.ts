import { describe, expect, it } from 'vitest'
import { parseDateInput } from './dates'

describe('parseDateInput', () => {
  it('accepts the display format, the long month name, day-first and ISO dates', () => {
    for (const text of ['3 Nov 2026', '3 November 2026', '03/11/2026', '2026-11-03', '  3 Nov 2026  ']) {
      expect(parseDateInput(text), text).toBe('2026-11-03')
    }
  })

  it('reads slashed dates day first', () => {
    expect(parseDateInput('11/03/2026')).toBe('2026-03-11')
  })

  it('returns null for text that is not a real date', () => {
    for (const text of ['', 'tomorrow', '31/02/2026', '2026-13-01', '3 Nov']) {
      expect(parseDateInput(text), text).toBeNull()
    }
  })
})
