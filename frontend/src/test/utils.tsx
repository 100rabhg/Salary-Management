import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { vi } from 'vitest'
import type { Employee, Meta, SalaryRecord } from '../api/types'
import { Providers } from '../Providers'

export const TODAY = '2026-10-24'

export const meta: Meta = {
  today: TODAY,
  time_zone: 'Asia/Kolkata',
  default_currency: 'INR',
  countries: [
    { code: 'IN', name: 'India', currency: 'INR' },
    { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
    { code: 'JP', name: 'Japan', currency: 'JPY' },
  ],
  currencies: [
    { code: 'INR', zero_decimal: false },
    { code: 'GBP', zero_decimal: false },
    { code: 'USD', zero_decimal: false },
    { code: 'JPY', zero_decimal: true },
  ],
  employment_types: ['full_time', 'part_time', 'contract'],
  departments: ['Engineering', 'People'],
  job_titles: ['Recruiter', 'Software Engineer'],
}

export function buildEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    first_name: 'Ada',
    last_name: 'Okafor',
    email: 'ada.okafor@acme.example',
    job_title: 'Software Engineer',
    department: 'Engineering',
    country_code: 'IN',
    country_name: 'India',
    employment_type: 'full_time',
    hire_date: '2022-01-03',
    lock_version: 0,
    current_salary: { id: 11, salary: '1200000.00', currency: 'INR', effective_on: '2024-04-01' },
    pending_salary: null,
    ...overrides,
  }
}

export function buildRecord(overrides: Partial<SalaryRecord> = {}): SalaryRecord {
  return {
    id: 11,
    salary: '1200000.00',
    currency: 'INR',
    effective_on: '2024-04-01',
    status: 'current',
    cancellable: false,
    lock_version: 0,
    change: null,
    ...overrides,
  }
}

type Handler = (request: { method: string; url: URL; body: unknown }) => { status?: number; body?: unknown }

export interface FetchCall {
  method: string
  path: string
  search: URLSearchParams
  body: unknown
}

// Replaces fetch with a router over "METHOD /path" keys (path without
// /api/v1). Records every call so tests can assert what was sent.
export function mockApi(routes: Record<string, Handler | { status?: number; body?: unknown }>) {
  const calls: FetchCall[] = []
  const fetchMock = vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = new URL(input)
    const method = init.method ?? 'GET'
    const path = url.pathname.replace(/^\/api\/v1/, '')
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ method, path, search: url.searchParams, body })

    const route = routes[`${method} ${path}`]
    if (!route) throw new Error(`Unexpected request: ${method} ${path}`)
    const { status = 200, body: payload } = typeof route === 'function' ? route({ method, url, body }) : route
    return new Response(status === 204 ? null : JSON.stringify(payload ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls }
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

export function renderApp(ui: ReactElement, { route = '/', path = '*' }: { route?: string; path?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return {
    user: userEvent.setup(),
    ...render(
      <Providers queryClient={queryClient} env="test">
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="*" element={<div>Other page</div>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </Providers>,
    ),
  }
}
