import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { applyServerErrors } from './formErrors'

describe('applyServerErrors', () => {
  it('puts each validation message under its field, renaming API fields', () => {
    const setErrors = vi.fn()
    const error = new ApiError(422, 'validation_failed', 'Check the highlighted fields.', {
      email: ['has already been taken', 'is invalid'],
      'first_salary.salary': ['must be greater than 0'],
    })

    const message = applyServerErrors(error, setErrors, ['email', 'salary'], { 'first_salary.salary': 'salary' })

    expect(setErrors).toHaveBeenCalledWith({ email: 'Has already been taken', salary: 'Must be greater than 0' })
    expect(message).toBeNull()
  })

  it('returns messages for fields the form does not have', () => {
    const setErrors = vi.fn()
    const error = new ApiError(422, 'validation_failed', 'Check the highlighted fields.', {
      email: ['is invalid'],
      base: ['only one scheduled change is allowed', 'try again later'],
    })

    expect(applyServerErrors(error, setErrors, ['email'])).toBe('Only one scheduled change is allowed Try again later')
    expect(setErrors).toHaveBeenCalledWith({ email: 'Is invalid' })
  })

  it('falls back to the error message when a validation error has no details', () => {
    const error = new ApiError(422, 'validation_failed', 'Check the highlighted fields.')

    expect(applyServerErrors(error, vi.fn(), ['email'])).toBe('Check the highlighted fields.')
  })

  it('returns the message of any other error without touching field errors', () => {
    const setErrors = vi.fn()

    expect(applyServerErrors(new ApiError(409, 'stale_record', 'Someone else changed this.'), setErrors, [])).toBe(
      'Someone else changed this.',
    )
    expect(applyServerErrors(new Error('Network down'), setErrors, [])).toBe('Network down')
    expect(applyServerErrors('boom', setErrors, [])).toBe('Something went wrong. Try again.')
    expect(setErrors).not.toHaveBeenCalled()
  })
})
