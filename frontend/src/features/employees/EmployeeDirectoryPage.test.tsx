import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildEmployee, meta, mockApi, renderApp } from '../../test/utils'
import { EmployeeDirectoryPage } from './EmployeeDirectoryPage'

const page = (data: ReturnType<typeof buildEmployee>[], total = data.length, pageNumber = 1) => ({
  body: { data, meta: { page: pageNumber, per_page: 25, total, total_pages: Math.max(1, Math.ceil(total / 25)) } },
})

describe('EmployeeDirectoryPage', () => {
  it('lists employees with their current salary and scheduled change', async () => {
    mockApi({
      'GET /meta': { body: meta },
      'GET /employees': page(
        [
          buildEmployee({
            pending_salary: { id: 12, salary: '1300000.00', currency: 'INR', effective_on: '2026-12-01' },
          }),
          buildEmployee({ id: 2, first_name: 'Wei', last_name: 'Chen', email: 'wei@acme.example', current_salary: null }),
        ],
        60,
      ),
    })

    renderApp(<EmployeeDirectoryPage />, { route: '/employees', path: '/employees' })

    const row = (await screen.findByRole('link', { name: 'Ada Okafor' })).closest('tr')!
    expect(within(row).getByText('₹12,00,000')).toBeInTheDocument()
    expect(within(row).getByText(/₹13,00,000 from 1 Dec 2026/)).toBeInTheDocument()
    expect(screen.getByText('Not yet effective')).toBeInTheDocument()
    expect(screen.getByText('Showing 1–25 of 60')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ada Okafor' })).toHaveAttribute('href', '/employees/1')
  })

  it('sends the search, filters and page from the URL to the API', async () => {
    const { calls } = mockApi({ 'GET /meta': { body: meta }, 'GET /employees': page([buildEmployee()], 60, 2) })

    renderApp(<EmployeeDirectoryPage />, {
      route: '/employees?q=ada&country_code=IN&page=2&sort=hire_date&direction=desc',
      path: '/employees',
    })

    await screen.findByRole('link', { name: 'Ada Okafor' })
    const search = calls.find((call) => call.path === '/employees')!.search
    expect(Object.fromEntries(search)).toEqual({
      q: 'ada',
      country_code: 'IN',
      page: '2',
      per_page: '25',
      sort: 'hire_date',
      direction: 'desc',
    })
  })

  it('debounces typing into the search box and starts again from page 1', async () => {
    const { calls } = mockApi({ 'GET /meta': { body: meta }, 'GET /employees': page([buildEmployee()], 60) })
    const { user } = renderApp(<EmployeeDirectoryPage />, { route: '/employees?page=2', path: '/employees' })
    await screen.findByRole('link', { name: 'Ada Okafor' })

    await user.type(screen.getByLabelText('Search employees'), 'okafor')

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/employees?q=okafor'))
    await waitFor(() =>
      expect(calls.filter((call) => call.path === '/employees').map((call) => call.search.get('q'))).toEqual([
        null,
        'okafor',
      ]),
    )
  })

  it('sorts by any column header, toggling the direction', async () => {
    mockApi({ 'GET /meta': { body: meta }, 'GET /employees': page([buildEmployee()]) })
    const { user } = renderApp(<EmployeeDirectoryPage />, { route: '/employees', path: '/employees' })
    await screen.findByRole('link', { name: 'Ada Okafor' })

    for (const [label, sort] of [['Role', 'job_title'], ['Country', 'country'], ['Salary', 'salary']]) {
      await user.click(screen.getByRole('button', { name: label }))
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(`sort=${sort}&direction=asc`))
    }
    await user.click(screen.getByRole('button', { name: 'Salary' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('sort=salary&direction=desc'))
    expect(screen.getByRole('button', { name: 'Salary' }).closest('th')).toHaveAttribute('aria-sort', 'descending')
  })

  it('offers to clear filters when nothing matches', async () => {
    mockApi({ 'GET /meta': { body: meta }, 'GET /employees': page([]) })
    const { user } = renderApp(<EmployeeDirectoryPage />, { route: '/employees?department=Legal', path: '/employees' })

    expect(await screen.findByText('No employees match')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' }).at(-1)!)

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/employees$/))
  })

  it('invites HR to add the first employee when there are none', async () => {
    mockApi({ 'GET /meta': { body: meta }, 'GET /employees': page([]) })
    renderApp(<EmployeeDirectoryPage />, { route: '/employees', path: '/employees' })

    expect(await screen.findByText('No employees yet')).toBeInTheDocument()
  })

  it('shows the error and retries', async () => {
    let attempts = 0
    mockApi({
      'GET /meta': { body: meta },
      'GET /employees': () => {
        attempts += 1
        return attempts === 1
          ? { status: 500, body: { error: { code: 'server_error', message: 'Database unavailable', details: {} } } }
          : page([buildEmployee()])
      },
    })
    const { user } = renderApp(<EmployeeDirectoryPage />, { route: '/employees', path: '/employees' })

    expect(await screen.findByText('Database unavailable')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('link', { name: 'Ada Okafor' })).toBeInTheDocument()
  })
})
