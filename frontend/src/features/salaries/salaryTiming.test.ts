import { describe, expect, it } from 'vitest'
import { buildRecord, TODAY } from '../../test/utils'
import { describeTiming, otherPendingRecord } from './salaryTiming'

describe('describeTiming', () => {
  const history = [buildRecord({ id: 1, effective_on: '2024-04-01' })]

  it('marks a future date as a scheduled change', () => {
    expect(describeTiming('2026-12-01', TODAY, history)).toMatchObject({ timing: 'scheduled' })
  })

  it('treats today as taking effect now', () => {
    expect(describeTiming(TODAY, TODAY, history).message).toBe('Takes effect today and becomes the current salary.')
  })

  it('explains a back-dated record that becomes the current salary', () => {
    expect(describeTiming('2025-01-01', TODAY, history)).toMatchObject({ timing: 'backdated' })
  })

  it('explains a back-dated record that a later record overrides', () => {
    expect(describeTiming('2023-01-01', TODAY, history).message).toContain('the record from 1 Apr 2024 stays the current salary')
  })
})

describe('otherPendingRecord', () => {
  it('ignores the record being edited', () => {
    const pending = buildRecord({ id: 2, status: 'pending', effective_on: '2026-12-01' })
    expect(otherPendingRecord([pending])).toBe(pending)
    expect(otherPendingRecord([pending], 2)).toBeUndefined()
  })
})
