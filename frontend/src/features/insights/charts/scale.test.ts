import { describe, expect, it } from 'vitest'
import { niceTicks, percentOf } from './scale'

describe('niceTicks', () => {
  it('steps by 1, 2, 2.5 or 5 times a power of ten from zero past the maximum', () => {
    expect(niceTicks(900000)).toEqual([0, 250000, 500000, 750000, 1000000])
    expect(niceTicks(9600000)).toEqual([0, 2500000, 5000000, 7500000, 10000000])
    expect(niceTicks(18)).toEqual([0, 5, 10, 15, 20])
  })

  it('handles an exact multiple and an empty chart', () => {
    expect(niceTicks(1000)).toEqual([0, 250, 500, 750, 1000])
    expect(niceTicks(0)).toEqual([0])
  })

  it('positions values as a clamped percentage', () => {
    expect(percentOf(250, 1000)).toBe(25)
    expect(percentOf(2000, 1000)).toBe(100)
    expect(percentOf(5, 0)).toBe(0)
  })
})
