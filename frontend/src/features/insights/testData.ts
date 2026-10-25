import type {
  Conversion,
  CountrySalaryDistribution,
  CurrentRates,
  DepartmentCosts,
  InsightsSummary,
  RoleSalaryRanges,
} from '../../api/types'

export const rateSet = {
  token: 'r_test',
  provider: 'ECB',
  base: 'EUR',
  rate_date: '2026-10-23',
  fetched_at: '2026-10-25T06:00:00Z',
  rates: { EUR: '1.0', GBP: '0.8', INR: '100.0', JPY: '160.0', SGD: '1.5', USD: '1.25' },
}

export const currentRates: CurrentRates = { rate_set: rateSet, status: 'current' }

export function conversion(overrides: Partial<Conversion> = {}): Conversion {
  return {
    display_currency: 'INR',
    status: 'current',
    rates_token: 'r_test',
    provider: 'ECB',
    rate_date: '2026-10-23',
    fetched_at: '2026-10-25T06:00:00Z',
    rates: { INR: '1.0', USD: '80.0' },
    ...overrides,
  }
}

export const summary: InsightsSummary = {
  headcount: 5,
  without_current_salary: 1,
  annual_cost: '21300000.00',
  monthly_cost: '1775000.00',
  by_currency: [
    { currency: 'USD', headcount: 1, annual_cost_original: '120000.00', monthly_cost_original: '10000.00', rate: '80.0', monthly_cost: '800000.00' },
    { currency: 'INR', headcount: 1, annual_cost_original: '1200000.00', monthly_cost_original: '100000.00', rate: '1.0', monthly_cost: '100000.00' },
  ],
  conversion: conversion(),
}

export const departmentCosts: DepartmentCosts = {
  data: [
    { department: 'Engineering', headcount: 2, without_current_salary: 0, monthly_cost: '900000.00', share_percent: 50.7 },
    { department: 'Sales', headcount: 3, without_current_salary: 1, monthly_cost: '875000.00', share_percent: 49.3 },
  ],
  by_currency: [
    { department: 'Engineering', currency: 'INR', monthly_cost_original: '100000.00' },
    { department: 'Engineering', currency: 'USD', monthly_cost_original: '10000.00' },
  ],
  conversion: conversion(),
}

const range = { min: '1200000.00', p25: '3300000.00', median: '5400000.00', p75: '7500000.00', max: '9600000.00', mean: '5400000.00' }

export const roleRanges: RoleSalaryRanges = {
  data: [{ job_title: 'Software Engineer', headcount: 2, ...range }],
  conversion: conversion(),
}

const empty = { headcount: 0, min: null, p25: null, median: null, p75: null, max: null, mean: null }

export const countryDistribution: CountrySalaryDistribution = {
  data: [
    { country_code: 'US', country_name: 'United States', headcount: 1, ...range },
    { country_code: 'GB', country_name: 'United Kingdom', ...empty },
  ],
  conversion: conversion(),
}
