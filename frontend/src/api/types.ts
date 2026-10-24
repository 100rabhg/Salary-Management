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

export type DirectorySort = 'name' | 'hire_date' | 'created_at'

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
