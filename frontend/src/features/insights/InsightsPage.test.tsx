import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { meta, mockApi, renderApp } from '../../test/utils'
import { InsightsPage } from './InsightsPage'
import { conversion, countryDistribution, currentRates, departmentCosts, roleRanges } from './testData'

const REPORTS = ['/insights/department_costs', '/insights/role_salary_ranges', '/insights/country_salary_distribution']

function api(overrides: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /meta': { body: meta },
    'GET /exchange_rates/current': { body: currentRates },
    'GET /insights/department_costs': { body: departmentCosts },
    'GET /insights/role_salary_ranges': { body: roleRanges },
    'GET /insights/country_salary_distribution': { body: countryDistribution },
    ...overrides,
  })
}

const render = (route = '/insights') => renderApp(<InsightsPage />, { route, path: '/insights' })
const report = (name: string) => screen.getByRole('region', { name })

describe('InsightsPage', () => {
  it('converts all three reports with the same pinned rates and display currency', async () => {
    const { calls } = api()
    render('/insights?currency=INR')

    expect(await screen.findByRole('list', { name: 'Monthly cost by department' })).toBeInTheDocument()
    await screen.findByRole('list', { name: 'Annual salary range by role' })
    for (const path of REPORTS) {
      const request = calls.find((call) => call.path === path)!
      expect(request.search.get('rates_token')).toBe('r_test')
      expect(request.search.get('currency')).toBe('INR')
    }
  })

  it('pins the current rates again when the server no longer has the pinned set', async () => {
    let ratesCalls = 0
    const stale = { error: { code: 'unknown_rates_token', message: 'These exchange rates are no longer available', details: {} } }
    const byToken = (body: unknown) => ({ url }: { url: URL }) =>
      url.searchParams.get('rates_token') === 'r_old' ? { status: 409, body: stale } : { body }
    const { calls } = api({
      'GET /exchange_rates/current': () => {
        ratesCalls += 1
        return { body: { ...currentRates, rate_set: { ...currentRates.rate_set!, token: ratesCalls === 1 ? 'r_old' : 'r_test' } } }
      },
      'GET /insights/department_costs': byToken(departmentCosts),
      'GET /insights/role_salary_ranges': byToken(roleRanges),
      'GET /insights/country_salary_distribution': byToken(countryDistribution),
    })
    render()

    expect(await screen.findByRole('list', { name: 'Monthly cost by department' })).toBeInTheDocument()
    await screen.findByRole('list', { name: 'Annual salary distribution by country' })
    expect(ratesCalls).toBe(2)
    for (const path of REPORTS) {
      expect(calls.filter((call) => call.path === path).at(-1)!.search.get('rates_token')).toBe('r_test')
    }
  })

  it('reruns the reports when re-pinning returns the same token', async () => {
    // After a restart the server fetches the same ECB rates again, so the
    // token is unchanged; the first report requests still got a 409.
    const stale = { error: { code: 'unknown_rates_token', message: 'These exchange rates are no longer available', details: {} } }
    const seen = new Set<string>()
    const firstFails = (path: string, body: unknown) => () => {
      if (!seen.has(path)) {
        seen.add(path)
        return { status: 409, body: stale }
      }
      return { body }
    }
    let ratesCalls = 0
    api({
      'GET /exchange_rates/current': () => {
        ratesCalls += 1
        return { body: { ...currentRates, rate_set: { ...currentRates.rate_set!, token: 'r_same' } } }
      },
      'GET /insights/department_costs': firstFails('dept', departmentCosts),
      'GET /insights/role_salary_ranges': firstFails('role', roleRanges),
      'GET /insights/country_salary_distribution': firstFails('dist', countryDistribution),
    })
    render()

    expect(await screen.findByRole('list', { name: 'Monthly cost by department' })).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Annual salary range by role' })).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Annual salary distribution by country' })).toBeInTheDocument()
    expect(ratesCalls).toBe(2)
  })

  it('describes each bar and range for screen readers and tooltips', async () => {
    api()
    render()

    expect(
      await screen.findByLabelText('Engineering: ₹9,00,000, 2 employees, 50.7% of the total'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^Software Engineer: Median ₹54,00,000, Middle half ₹33,00,000 – ₹75,00,000/)).toBeInTheDocument()
    expect(screen.getByLabelText('United Kingdom: no employees')).toBeInTheDocument()
  })

  it('shows exact figures in the table view', async () => {
    const { user } = api() && render()
    await screen.findByRole('list', { name: 'Annual salary range by role' })

    await user.click(within(report('Annual salary range by role')).getByText('Table'))

    const table = within(report('Annual salary range by role')).getByRole('table')
    expect(within(table).getByRole('row', { name: /Software Engineer/ })).toHaveTextContent(
      'Software Engineer2₹12,00,000₹33,00,000₹54,00,000₹75,00,000₹96,00,000₹54,00,000',
    )
  })

  it('keeps each report\'s filters separate, and gives the country report no country filter', async () => {
    const { calls } = api()
    const { user } = render()
    await screen.findByRole('list', { name: 'Monthly cost by department' })

    const roles = report('Annual salary range by role')
    await user.click(within(roles).getByRole('combobox', { name: 'Country' }))
    await user.click(await screen.findByRole('option', { name: 'India' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('role.country_code=IN'))
    await waitFor(() =>
      expect(calls.some((call) => call.path === '/insights/role_salary_ranges' && call.search.get('country_code') === 'IN')).toBe(true),
    )
    expect(calls.filter((call) => call.path === '/insights/department_costs').every((call) => !call.search.has('country_code'))).toBe(true)
    expect(within(report('Annual salary distribution by country')).queryByRole('combobox', { name: 'Country' })).not.toBeInTheDocument()
    expect(within(report('Annual salary distribution by country')).getByRole('combobox', { name: 'Job title' })).toBeInTheDocument()
  })

  it('falls back to original currencies and headcounts when rates are unavailable', async () => {
    const unavailable = conversion({ status: 'unavailable', rates_token: null, rate_date: null, rates: {} })
    api({
      'GET /exchange_rates/current': { body: { rate_set: null, status: 'unavailable' } },
      'GET /insights/department_costs': {
        body: { ...departmentCosts, data: departmentCosts.data.map((row) => ({ ...row, monthly_cost: null, share_percent: null })), conversion: unavailable },
      },
      'GET /insights/role_salary_ranges': {
        body: { data: [{ job_title: 'Software Engineer', headcount: 2, min: null, p25: null, median: null, p75: null, max: null, mean: null }], conversion: unavailable },
      },
    })
    render()

    expect(await screen.findByText(/Department costs need exchange rates/)).toBeInTheDocument()
    expect(within(report('Monthly cost by department')).getByText('$10,000')).toBeInTheDocument()
    expect(await screen.findByText(/Salary ranges need exchange rates/)).toBeInTheDocument()
    expect(within(report('Annual salary range by role')).getByRole('table')).toHaveTextContent('Software Engineer2')
  })

  it('says when nothing was converted', async () => {
    api({
      'GET /insights/department_costs': { body: { ...departmentCosts, conversion: conversion({ status: 'not_needed' }) } },
    })
    render()

    expect(await screen.findByText('Every salary here is already in INR, so nothing was converted.')).toBeInTheDocument()
  })

  it('offers to clear filters when a report matches nobody', async () => {
    api({ 'GET /insights/role_salary_ranges': { body: { data: [], conversion: conversion() } } })
    const { user } = render('/insights?role.department=Legal')

    expect(await screen.findByText('No employees match these filters')).toBeInTheDocument()
    await user.click(within(report('Annual salary range by role')).getAllByRole('button', { name: 'Clear filters' }).at(-1)!)
    await waitFor(() => expect(screen.getByTestId('location')).not.toHaveTextContent('role.department'))
  })

  it('shows an error for one report without hiding the others', async () => {
    api({
      'GET /insights/country_salary_distribution': {
        status: 500,
        body: { error: { code: 'server_error', message: 'Query timed out', details: {} } },
      },
    })
    render()

    expect(await screen.findByText('Query timed out')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Monthly cost by department' })).toBeInTheDocument()
  })
})
