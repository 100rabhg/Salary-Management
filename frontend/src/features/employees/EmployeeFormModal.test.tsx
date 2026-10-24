import { screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildEmployee, meta, mockApi, renderApp, TODAY } from '../../test/utils'
import { EmployeeFormModal } from './EmployeeFormModal'

async function choose(user: UserEvent, label: RegExp, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

async function fillRequiredDetails(user: UserEvent) {
  await user.type(screen.getByLabelText(/First name/), 'Ada')
  await user.type(screen.getByLabelText(/Last name/), 'Okafor')
  await user.type(screen.getByLabelText(/Work email/), 'ada@acme.example')
  await user.type(screen.getByRole('combobox', { name: /Job title/ }), 'Recruiter')
  await user.type(screen.getByRole('combobox', { name: /Department/ }), 'People')
}

describe('EmployeeFormModal (add)', () => {
  it('creates the employee with a starting salary in the country currency, effective on the joining date', async () => {
    const created = buildEmployee({ id: 7 })
    const { calls } = mockApi({ 'GET /meta': { body: meta }, 'POST /employees': { status: 201, body: created } })
    const onSaved = vi.fn()
    const { user } = renderApp(<EmployeeFormModal opened onClose={() => {}} onSaved={onSaved} />)
    await screen.findByLabelText(/First name/)

    await fillRequiredDetails(user)
    await choose(user, /Country/, 'United Kingdom')
    expect(screen.getByRole('combobox', { name: /Currency/ })).toHaveValue('GBP')
    expect(screen.getByLabelText(/Joining date/)).toHaveValue('24 Oct 2026')
    await user.type(screen.getByLabelText(/Annual base salary/), '72000')
    await user.click(screen.getByRole('button', { name: 'Add employee' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(created))
    expect(calls.find((call) => call.method === 'POST')!.body).toEqual({
      employee: {
        first_name: 'Ada',
        last_name: 'Okafor',
        email: 'ada@acme.example',
        job_title: 'Recruiter',
        department: 'People',
        country_code: 'GB',
        employment_type: 'full_time',
        hire_date: TODAY,
        first_salary: { salary: '72000', currency: 'GBP' },
      },
    })
  })

  it('keeps a currency HR picked when the country changes', async () => {
    mockApi({ 'GET /meta': { body: meta } })
    const { user } = renderApp(<EmployeeFormModal opened onClose={() => {}} />)
    await screen.findByLabelText(/First name/)
    expect(screen.getByRole('combobox', { name: /Currency/ })).toHaveValue('INR')

    await choose(user, /Currency/, 'USD')
    await choose(user, /Country/, 'Japan')

    expect(screen.getByRole('combobox', { name: /Currency/ })).toHaveValue('USD')
  })

  it('explains what is missing without calling the API', async () => {
    const { calls } = mockApi({ 'GET /meta': { body: meta } })
    const { user } = renderApp(<EmployeeFormModal opened onClose={() => {}} />)
    await screen.findByLabelText(/First name/)

    await user.click(screen.getByRole('button', { name: 'Add employee' }))

    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Choose a country')).toBeInTheDocument()
    expect(screen.getByText('Enter an annual salary greater than 0')).toBeInTheDocument()
    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(0)
  })

  it('shows server validation errors next to their fields', async () => {
    mockApi({
      'GET /meta': { body: meta },
      'POST /employees': {
        status: 422,
        body: {
          error: {
            code: 'validation_failed',
            message: 'Email has already been taken',
            details: { email: ['has already been taken'], 'first_salary.salary': ['must be a whole number for JPY'] },
          },
        },
      },
    })
    const { user } = renderApp(<EmployeeFormModal opened onClose={() => {}} />)
    await screen.findByLabelText(/First name/)

    await fillRequiredDetails(user)
    await choose(user, /Country/, 'India')
    await user.type(screen.getByLabelText(/Annual base salary/), '100')
    await user.click(screen.getByRole('button', { name: 'Add employee' }))

    expect(await screen.findByText('Has already been taken')).toBeInTheDocument()
    expect(screen.getByText('Must be a whole number for JPY')).toBeInTheDocument()
  })
})

describe('EmployeeFormModal (edit)', () => {
  it('sends the loaded lock_version and explains a conflicting edit', async () => {
    const employee = buildEmployee({ lock_version: 3 })
    const { calls } = mockApi({
      'GET /meta': { body: meta },
      'PATCH /employees/1': {
        status: 409,
        body: { error: { code: 'stale_record', message: 'Someone else changed this record', details: {} } },
      },
    })
    const { user } = renderApp(<EmployeeFormModal opened onClose={() => {}} employee={employee} />)
    const jobTitle = await screen.findByRole('combobox', { name: /Job title/ })

    expect(screen.queryByLabelText(/Annual base salary/)).not.toBeInTheDocument()
    await user.clear(jobTitle)
    await user.type(jobTitle, 'Engineering Manager')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('This employee was changed by someone else')).toBeInTheDocument()
    expect(calls.find((call) => call.method === 'PATCH')!.body).toMatchObject({
      employee: { job_title: 'Engineering Manager', lock_version: 3 },
    })
  })

  it('notes that a country change keeps salary records as they are', async () => {
    mockApi({ 'GET /meta': { body: meta } })
    const { user } = renderApp(<EmployeeFormModal opened onClose={() => {}} employee={buildEmployee()} />)
    await screen.findByRole('combobox', { name: /Country/ })

    await choose(user, /Country/, 'Japan')

    expect(screen.getByText(/keeps every salary record, including any scheduled change/)).toBeInTheDocument()
  })
})
