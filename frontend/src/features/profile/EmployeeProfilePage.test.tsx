import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SalaryRecord } from '../../api/types'
import { buildEmployee, buildRecord, meta, mockApi, renderApp } from '../../test/utils'
import { EmployeeProfilePage } from './EmployeeProfilePage'

const current = buildRecord({ id: 11, salary: '1200000.00', effective_on: '2024-04-01', status: 'current',
  change: { amount: '200000.00', percent: 20 } })
const first = buildRecord({ id: 10, salary: '1000000.00', effective_on: '2022-01-03', status: 'past' })
const pending = buildRecord({ id: 12, salary: '1260000.00', effective_on: '2026-12-01', status: 'pending',
  cancellable: true, lock_version: 2, change: { amount: '60000.00', percent: 5 } })

function setup(history: SalaryRecord[], extra: Parameters<typeof mockApi>[0] = {}) {
  const api = mockApi({
    'GET /meta': { body: meta },
    'GET /employees/1': { body: buildEmployee() },
    'GET /employees/1/salaries': { body: { data: history } },
    ...extra,
  })
  return { ...api, ...renderApp(<EmployeeProfilePage />, { route: '/employees/1', path: '/employees/:id' }) }
}

describe('EmployeeProfilePage', () => {
  it('shows the current salary, the scheduled change and the full history', async () => {
    setup([pending, current, first])

    expect(await screen.findByRole('heading', { name: 'Ada Okafor' })).toBeInTheDocument()
    expect(await screen.findByText('Since 1 Apr 2024')).toBeInTheDocument()
    expect(screen.getByText('from the previous salary')).toBeInTheDocument()
    expect(screen.getByText(/From 1 Dec 2026 · can be edited or cancelled until then/)).toBeInTheDocument()

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[3]!.textContent)).toEqual(['Scheduled', 'Current', 'Past'])
    expect(within(rows[0]!).getByText('+5.0%')).toBeInTheDocument()
    expect(within(rows[0]!).getByRole('button', { name: /Cancel scheduled change/ })).toBeInTheDocument()
    expect(within(rows[1]!).queryByRole('button', { name: /Cancel/ })).not.toBeInTheDocument()
  })

  it('shows the starting salary without an empty scheduled-change slot', async () => {
    setup([buildRecord({ id: 10, effective_on: '2022-01-03' })])

    expect(await screen.findByText('Starting salary')).toBeInTheDocument()
    expect(screen.queryByText('Scheduled change')).not.toBeInTheDocument()
  })

  it('schedules a salary change for a future date', async () => {
    const { user, calls } = setup([current, first], {
      'POST /employees/1/salaries': { status: 201, body: { data: [pending, current, first] } },
    })
    await user.click(await screen.findByRole('button', { name: 'Add salary change' }))

    const date = screen.getByLabelText(/Effective from/)
    await user.type(date, '2026-12-01')
    await user.tab()
    expect(await screen.findByText(/Scheduled for 1 Dec 2026/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Currency/ })).toHaveValue('INR')

    await user.type(screen.getByLabelText(/Annual base salary/), '1260000')
    expect(screen.getByText('+5.0% compared with the current ₹12,00,000')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Schedule change' }))

    await waitFor(() =>
      expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
        salary_record: { salary: '1260000', currency: 'INR', effective_on: '2026-12-01' },
      }),
    )
  })

  it('allows only one scheduled change and points to the existing one', async () => {
    const { user } = setup([pending, current, first])
    await user.click(await screen.findByRole('button', { name: 'Add salary change' }))

    expect(screen.getByText('A change is already scheduled')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit the scheduled change instead' }))

    expect(await screen.findByText('Edit scheduled change', { selector: 'h2' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Annual base salary/)).toHaveValue('1,260,000')
  })

  it('edits the scheduled change with its lock version', async () => {
    const { user, calls } = setup([pending, current, first], {
      'PATCH /employees/1/salaries/12': { body: { data: [pending, current, first] } },
    })
    await user.click(await screen.findByRole('button', { name: /Edit salary record: ₹12,60,000/ }))

    const amount = screen.getByLabelText(/Annual base salary/)
    await user.clear(amount)
    await user.type(amount, '1300000')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(calls.find((call) => call.method === 'PATCH')?.body).toEqual({
        salary_record: { salary: '1300000', currency: 'INR', effective_on: '2026-12-01', lock_version: 2 },
      }),
    )
  })

  it('cancels the scheduled change after confirmation', async () => {
    const { user, calls } = setup([pending, current, first], {
      'DELETE /employees/1/salaries/12': { status: 204 },
    })
    await user.click(await screen.findByRole('button', { name: /Cancel scheduled change: ₹12,60,000/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Cancel scheduled change?' })
    expect(within(dialog).getByText(/The current salary stays as it is/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel change' }))

    await waitFor(() => expect(calls.some((call) => call.method === 'DELETE')).toBe(true))
  })

  it('warns before correcting a record that has taken effect', async () => {
    const { user } = setup([current, first])
    await user.click(await screen.findByRole('button', { name: /Edit salary record: ₹10,00,000/ }))

    expect(screen.getByText('This record has already taken effect. Edit it only to correct a mistake.')).toBeInTheDocument()
    expect(screen.getByText(/the record from 1 Apr 2024 stays the current salary/)).toBeInTheDocument()
  })

  it('shows a not-found state for an unknown employee', async () => {
    mockApi({
      'GET /meta': { body: meta },
      'GET /employees/9': { status: 404, body: { error: { code: 'not_found', message: 'Not found', details: {} } } },
      'GET /employees/9/salaries': { status: 404, body: { error: { code: 'not_found', message: 'Not found', details: {} } } },
    })
    renderApp(<EmployeeProfilePage />, { route: '/employees/9', path: '/employees/:id' })

    expect(await screen.findByText('Employee not found')).toBeInTheDocument()
  })
})
