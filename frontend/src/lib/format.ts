import dayjs from 'dayjs'
import type { EmploymentType } from '../api/types'

// INR uses Indian digit grouping (12,00,000); other currencies use
// international grouping (1,200,000). Whole amounts drop the ".00"; Intl
// knows which currencies have no minor unit (JPY).
export function formatMoney(amount: string | number, currency: string) {
  const value = Number(amount)
  const whole = Number.isInteger(value) ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    ...whole,
  }).format(value)
}

export function formatPercent(percent: number) {
  const sign = percent > 0 ? '+' : percent < 0 ? '−' : ''
  return `${sign}${Math.abs(percent).toFixed(1)}%`
}

// Dates travel as "YYYY-MM-DD"; they compare correctly as strings.
export function formatDate(date: string) {
  return dayjs(date).format('D MMM YYYY')
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full time',
  part_time: 'Part time',
  contract: 'Contract',
}

export function fullName(person: { first_name: string; last_name: string }) {
  return `${person.first_name} ${person.last_name}`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}
