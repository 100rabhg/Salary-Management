import { Table } from '@mantine/core'
import type { UseQueryResult } from '@tanstack/react-query'
import { useCountrySalaryDistribution, useRoleSalaryRanges } from '../../api/insights'
import type { Conversion, InsightFilterKey, SalaryRange } from '../../api/types'
import { QueryError } from '../../components/QueryError'
import { formatMoney } from '../../lib/format'
import { SalaryRangeChart, type RangeRow } from './charts/SalaryRangeChart'
import { ReportCard, ReportFilters, ReportSkeleton } from './ReportCard'
import { NoMatches, RatesUnavailable } from './ReportStates'
import { useReportFilters } from './useReportFilters'

interface ReportProps {
  currency: string
  ratesToken: string | undefined
  enabled: boolean
}

const ROLE_FILTERS: readonly InsightFilterKey[] = ['country_code', 'department', 'employment_type']
// The country report groups by country, so it has no country filter.
const COUNTRY_FILTERS: readonly InsightFilterKey[] = ['department', 'job_title', 'employment_type']

export function RoleSalaryRangeReport({ currency, ratesToken, enabled }: ReportProps) {
  const filterState = useReportFilters('role', ROLE_FILTERS)
  const report = useRoleSalaryRanges({ currency, rates_token: ratesToken, ...filterState.filters }, enabled)
  return (
    <RangeReport
      title="Annual salary range by role"
      description={
        filterState.filters.country_code
          ? 'Current annual base salaries for each job title.'
          : 'Current annual base salaries for each job title, across all countries. Filter by country to compare like for like.'
      }
      groupLabel="Job title"
      filterKeys={ROLE_FILTERS}
      filterState={filterState}
      report={report}
      rows={report.data?.data.map((row) => ({ ...row, label: row.job_title }))}
      currency={currency}
    />
  )
}

export function CountrySalaryDistributionReport({ currency, ratesToken, enabled }: ReportProps) {
  const filterState = useReportFilters('dist', COUNTRY_FILTERS)
  const report = useCountrySalaryDistribution({ currency, rates_token: ratesToken, ...filterState.filters }, enabled)
  return (
    <RangeReport
      title="Annual salary distribution by country"
      description="How current annual base salaries spread within each country, every country side by side."
      groupLabel="Country"
      filterKeys={COUNTRY_FILTERS}
      filterState={filterState}
      report={report}
      rows={report.data?.data.map((row) => ({ ...row, label: row.country_name }))}
      currency={currency}
    />
  )
}

interface RangeReportProps {
  title: string
  description: string
  groupLabel: string
  filterKeys: readonly InsightFilterKey[]
  filterState: ReturnType<typeof useReportFilters>
  report: UseQueryResult<{ conversion: Conversion }>
  rows: RangeRow[] | undefined
  currency: string
}

function RangeReport({ title, description, groupLabel, filterKeys, filterState, report, rows, currency }: RangeReportProps) {
  const { filters, update, clear, active } = filterState
  return (
    <ReportCard
      title={title}
      description={description}
      filters={<ReportFilters keys={filterKeys} filters={filters} active={active} onChange={update} onClear={clear} />}
      conversion={report.data?.conversion}
    >
      {(view) => {
        if (report.isError && !report.data)
          return <QueryError title="Couldn't load this report" error={report.error} onRetry={() => report.refetch()} />
        if (!report.data || !rows) return <ReportSkeleton rows={8} />
        if (rows.every((row) => row.headcount === 0)) return <NoMatches filtered={active} onClear={clear} />
        if (report.data.conversion.status === 'unavailable')
          return (
            <RatesUnavailable what="Salary ranges">
              <HeadcountTable rows={rows} groupLabel={groupLabel} title={title} />
            </RatesUnavailable>
          )
        return view === 'chart' ? (
          <SalaryRangeChart rows={rows} currency={currency} title={title} />
        ) : (
          <RangeTable rows={rows} groupLabel={groupLabel} currency={currency} title={title} />
        )
      }}
    </ReportCard>
  )
}

const STATS: { key: keyof SalaryRange; label: string }[] = [
  { key: 'min', label: 'Lowest' },
  { key: 'p25', label: '25th percentile' },
  { key: 'median', label: 'Median' },
  { key: 'p75', label: '75th percentile' },
  { key: 'max', label: 'Highest' },
  { key: 'mean', label: 'Average' },
]

function RangeTable({ rows, groupLabel, currency, title }: { rows: RangeRow[]; groupLabel: string; currency: string; title: string }) {
  return (
    <Table.ScrollContainer minWidth={820}>
      <Table striped horizontalSpacing="md" aria-label={title}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{groupLabel}</Table.Th>
            <Table.Th ta="right">Employees</Table.Th>
            {STATS.map((stat) => (
              <Table.Th key={stat.key} ta="right">
                {stat.label}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody className="tabular-nums">
          {rows.map((row) => (
            <Table.Tr key={row.label}>
              <Table.Td>{row.label}</Table.Td>
              <Table.Td ta="right">{row.headcount}</Table.Td>
              {STATS.map((stat) => {
                const value = row[stat.key]
                return (
                  <Table.Td key={stat.key} ta="right">
                    {value === null ? '—' : formatMoney(value, currency)}
                  </Table.Td>
                )
              })}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}

function HeadcountTable({ rows, groupLabel, title }: { rows: RangeRow[]; groupLabel: string; title: string }) {
  return (
    <Table striped horizontalSpacing="md" maw={420} aria-label={`${title}: headcount`}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{groupLabel}</Table.Th>
          <Table.Th ta="right">Employees with a current salary</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody className="tabular-nums">
        {rows.map((row) => (
          <Table.Tr key={row.label}>
            <Table.Td>{row.label}</Table.Td>
            <Table.Td ta="right">{row.headcount}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  )
}
