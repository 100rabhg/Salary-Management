import dayjs from 'dayjs'
import type { EmploymentType } from '../api/types'

// INR uses Indian digit grouping (12,00,000); other currencies use
// international grouping (1,200,000). Whole amounts drop the ".00"; Intl
// knows which currencies have no minor unit (JPY).
export function formatMoney(amount: string | number, currency: string) {
  const value = Number(amount)
  const whole = Number.isInteger(value) ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}
  return new Intl.NumberFormat(moneyLocale(currency), {
    style: 'currency',
    currency,
    ...whole,
  }).format(value)
}

function moneyLocale(currency: string) {
  return currency === 'INR' ? 'en-IN' : 'en-US'
}

// Short form for headline figures and axis ticks: ₹536.3Cr, ₹12L, $22.2K, ¥34.1M.
export function formatCompactMoney(amount: string | number, currency: string) {
  const value = Number(amount)
  // Intl compacts 6,435 crore as "₹6.4KCr"; HR reads large INR amounts in crores.
  if (currency === 'INR' && Math.abs(value) >= 1e7) {
    const crores = value / 1e7
    const digits = Math.abs(crores) >= 1000 ? 0 : 1
    return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(crores)}Cr`
  }
  return new Intl.NumberFormat(moneyLocale(currency), {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

// An exchange rate for reading, e.g. "₹94.945" or "¥1.6515".
export function formatRate(rate: number, currency: string) {
  return new Intl.NumberFormat(moneyLocale(currency), {
    style: 'currency',
    currency,
    maximumSignificantDigits: 5,
  }).format(rate)
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
