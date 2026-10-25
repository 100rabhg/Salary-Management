// Mirrors the JSON the Rails API returns (see docs/architecture.md, "API").
// Amounts are decimal strings ("72000.00"); dates are "YYYY-MM-DD" strings.

export type EmploymentType = 'full_time' | 'part_time' | 'contract'

export interface SalarySummary {
  id: number
  salary: string
  currency: string
  effective_on: string
}

export interface Employee {
  id: number
  first_name: string
  last_name: string
  email: string
  job_title: string
  department: string
  country_code: string
  country_name: string
  employment_type: EmploymentType
  hire_date: string
  lock_version: number
  current_salary: SalarySummary | null
  pending_salary: SalarySummary | null
}

export type SalaryStatus = 'pending' | 'current' | 'past'

export interface SalaryRecord {
  id: number
  salary: string
  currency: string
  effective_on: string
  status: SalaryStatus
  cancellable: boolean
  lock_version: number
  change: { amount: string; percent: number } | null
}

export interface PageMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface Page<T> {
  data: T[]
  meta: PageMeta
}

export interface Meta {
  today: string
  time_zone: string
  default_currency: string
  countries: { code: string; name: string; currency: string }[]
  currencies: { code: string; zero_decimal: boolean }[]
  employment_types: EmploymentType[]
  departments: string[]
  job_titles: string[]
}

export type DirectorySort = 'name' | 'job_title' | 'country' | 'hire_date' | 'salary' | 'created_at'

export interface DirectoryParams {
  q?: string
  page: number
  per_page: number
  country_code?: string
  department?: string
  job_title?: string
  employment_type?: string
  sort: DirectorySort
  direction: 'asc' | 'desc'
}

export interface EmployeeInput {
  first_name: string
  last_name: string
  email: string
  job_title: string
  department: string
  country_code: string
  employment_type: EmploymentType
  hire_date: string
}

export interface NewEmployeeInput extends EmployeeInput {
  first_salary: { salary: string; currency: string }
}

export interface SalaryRecordInput {
  salary: string
  currency: string
  effective_on: string
  lock_version?: number
}

// Exchange rates and insight reports (see docs/architecture.md, "Exchange rates").

export interface RateSet {
  /** Opaque version of this rate set; reports are pinned to it. */
  token: string
  provider: string
  base: string
  rate_date: string
  fetched_at: string
  /** Units of each currency per 1 EUR, as decimal strings. */
  rates: Record<string, string>
}

export type RatesStatus = 'current' | 'stale' | 'unavailable'

export interface CurrentRates {
  rate_set: RateSet | null
  status: RatesStatus
}

export type ConversionStatus = RatesStatus | 'not_needed'

export interface Conversion {
  display_currency: string
  status: ConversionStatus
  rates_token: string | null
  provider: string | null
  rate_date: string | null
  fetched_at: string | null
  /** Display-currency units per one unit of each currency in the report. */
  rates: Record<string, string>
}

export interface InsightsSummary {
  headcount: number
  without_current_salary: number
  annual_cost: string | null
  monthly_cost: string | null
  by_currency: {
    currency: string
    headcount: number
    annual_cost_original: string
    monthly_cost_original: string
    rate: string | null
    monthly_cost: string | null
  }[]
  conversion: Conversion
}

export interface DepartmentCosts {
  data: {
    department: string
    headcount: number
    without_current_salary: number
    monthly_cost: string | null
    share_percent: number | null
  }[]
  by_currency: { department: string; currency: string; monthly_cost_original: string }[]
  conversion: Conversion
}

/** Annual salary statistics in the display currency; null without rates or employees. */
export interface SalaryRange {
  headcount: number
  min: string | null
  p25: string | null
  median: string | null
  p75: string | null
  max: string | null
  mean: string | null
}

export interface RoleSalaryRanges {
  data: (SalaryRange & { job_title: string })[]
  conversion: Conversion
}

export interface CountrySalaryDistribution {
  data: (SalaryRange & { country_code: string; country_name: string })[]
  conversion: Conversion
}

export type InsightFilterKey = 'country_code' | 'department' | 'job_title' | 'employment_type'

export type ReportParams = { currency: string; rates_token?: string } & Partial<Record<InsightFilterKey, string>>
