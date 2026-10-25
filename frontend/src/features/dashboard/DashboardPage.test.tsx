import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { meta, mockApi, renderApp } from '../../test/utils'
import { conversion, currentRates, summary } from '../insights/testData'
import { DashboardPage } from './DashboardPage'

const render = (route = '/') => renderApp(<DashboardPage />, { route, path: '/' })

describe('DashboardPage', () => {
  it('shows headcount and estimated costs in INR using the pinned rates', async () => {
    const { calls } = mockApi({
      'GET /meta': { body: meta },
      'GET /exchange_rates/current': { body: currentRates },
      'GET /insights/summary': { body: summary },
    })
    render()

    expect(await screen.findByText('₹17.8L')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Includes 1 without a salary in effect yet')).toBeInTheDocument()
    expect(screen.getByText('₹17,75,000 a month')).toBeInTheDocument()
    expect(screen.getByText(/ECB reference rates from/)).toHaveTextContent('23 Oct 2026')
    const request = calls.find((call) => call.path === '/insights/summary')!
    expect(Object.fromEntries(request.search)).toEqual({ currency: 'INR', rates_token: 'r_test' })
  })

  it('switches display currency without moving off the pinned rates', async () => {
    const { calls } = mockApi({
      'GET /meta': { body: meta },
      'GET /exchange_rates/current': { body: currentRates },
      'GET /insights/summary': ({ url }) => ({
        body: { ...summary, monthly_cost: url.searchParams.get('currency') === 'USD' ? '22187.50' : '1775000.00' },
      }),
    })
    const { user } = render()
    await screen.findByText('₹17.8L')

    await user.click(screen.getByRole('combobox', { name: /Display currency/ }))
    await user.click(await screen.findByRole('option', { name: 'USD' }))

    expect(await screen.findByText('$22.2K')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/?currency=USD'))
    const requests = calls.filter((call) => call.path === '/insights/summary')
    expect(requests.map((call) => call.search.get('rates_token'))).toEqual(['r_test', 'r_test'])
    expect(calls.filter((call) => call.path === '/exchange_rates/current')).toHaveLength(1)
  })

  it('remembers the last display currency in this browser', async () => {
    window.localStorage.setItem('acme-salary.display-currency', 'JPY')
    const { calls } = mockApi({
      'GET /meta': { body: meta },
      'GET /exchange_rates/current': { body: currentRates },
      'GET /insights/summary': { body: summary },
    })
    render()

    await waitFor(() => expect(calls.find((call) => call.path === '/insights/summary')?.search.get('currency')).toBe('JPY'))
  })

  it('keeps headcount and opens the original-currency breakdown when rates are unavailable', async () => {
    const { calls } = mockApi({
      'GET /meta': { body: meta },
      'GET /exchange_rates/current': { body: { rate_set: null, status: 'unavailable' } },
      'GET /insights/summary': {
        body: {
          ...summary,
          monthly_cost: null,
          annual_cost: null,
          by_currency: summary.by_currency.map((row) => ({ ...row, rate: null, monthly_cost: null })),
          conversion: conversion({ status: 'unavailable', rates_token: null, rate_date: null, rates: {} }),
        },
      },
    })
    render()

    expect(await screen.findByText('Exchange rates are unavailable')).toBeInTheDocument()
    expect(await screen.findAllByText('Needs exchange rates to combine currencies. See the breakdown below.')).toHaveLength(2)
    expect(screen.getByText('5')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Monthly cost by original currency' })
    expect(within(table).getByText('$10,000')).toBeInTheDocument()
    expect(calls.find((call) => call.path === '/insights/summary')!.search.get('rates_token')).toBe('none')
  })

  it('warns when the rates are stale', async () => {
    mockApi({
      'GET /meta': { body: meta },
      'GET /exchange_rates/current': { body: { ...currentRates, status: 'stale' } },
      'GET /insights/summary': { body: { ...summary, conversion: conversion({ status: 'stale' }) } },
    })
    render()

    expect(await screen.findByText('These exchange rates are out of date')).toBeInTheDocument()
    expect(screen.getByText(/the last stored ones are used/)).toBeInTheDocument()
  })

  it('shows an error with retry when the summary fails', async () => {
    let attempts = 0
    mockApi({
      'GET /meta': { body: meta },
      'GET /exchange_rates/current': { body: currentRates },
      'GET /insights/summary': () => {
        attempts += 1
        return attempts === 1
          ? { status: 500, body: { error: { code: 'server_error', message: 'Database unavailable', details: {} } } }
          : { body: summary }
      },
    })
    const { user } = render()

    expect(await screen.findByText('Database unavailable')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('₹17.8L')).toBeInTheDocument()
  })
})
