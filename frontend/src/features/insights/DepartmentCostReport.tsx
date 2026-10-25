import { Table, Text } from '@mantine/core'
import { useDepartmentCosts } from '../../api/insights'
import type { DepartmentCosts, InsightFilterKey } from '../../api/types'
import { QueryError } from '../../components/QueryError'
import { formatMoney } from '../../lib/format'
import { CostBarChart } from './charts/CostBarChart'
import { ReportCard, ReportFilters, ReportSkeleton } from './ReportCard'
import { NoMatches, RatesUnavailable } from './ReportStates'
import { useReportFilters } from './useReportFilters'

const FILTERS: readonly InsightFilterKey[] = ['country_code', 'employment_type']
const TITLE = 'Monthly cost by department'

interface ReportProps {
  currency: string
  ratesToken: string | undefined
  enabled: boolean
}

export function DepartmentCostReport({ currency, ratesToken, enabled }: ReportProps) {
  const { filters, update, clear, active } = useReportFilters('dept', FILTERS)
  const report = useDepartmentCosts({ currency, rates_token: ratesToken, ...filters }, enabled)
  const data = report.data

  return (
    <ReportCard
      title={TITLE}
      description="Estimated monthly base salary cost of each department: current annual salaries ÷ 12."
      filters={<ReportFilters keys={FILTERS} filters={filters} active={active} onChange={update} onClear={clear} />}
      conversion={data?.conversion}
    >
      {(view) => {
        if (report.isError && !data)
          return <QueryError title="Couldn't load this report" error={report.error} onRetry={() => report.refetch()} />
        if (!data) return <ReportSkeleton rows={8} />
        if (data.data.every((row) => row.headcount === 0)) return <NoMatches filtered={active} onClear={clear} />
        if (data.conversion.status === 'unavailable')
          return (
            <RatesUnavailable what="Department costs">
              <OriginalCurrencyTable data={data} />
            </RatesUnavailable>
          )
        return view === 'chart' ? (
          <CostBarChart
            title={TITLE}
            currency={currency}
            bars={data.data.map((row) => ({
              label: row.department,
              value: Number(row.monthly_cost),
              details: [
                `${row.headcount} ${row.headcount === 1 ? 'employee' : 'employees'}`,
                `${row.share_percent ?? 0}% of the total`,
                ...(row.without_current_salary > 0 ? [`${row.without_current_salary} without a current salary`] : []),
              ],
            }))}
          />
        ) : (
          <Table.ScrollContainer minWidth={480}>
            <Table striped horizontalSpacing="md" aria-label={TITLE}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Department</Table.Th>
                  <Table.Th ta="right">Employees</Table.Th>
                  <Table.Th ta="right">Monthly cost</Table.Th>
                  <Table.Th ta="right">Share</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody className="tabular-nums">
                {data.data.map((row) => (
                  <Table.Tr key={row.department}>
                    <Table.Td>{row.department}</Table.Td>
                    <Table.Td ta="right">{row.headcount}</Table.Td>
                    <Table.Td ta="right">{formatMoney(row.monthly_cost!, currency)}</Table.Td>
                    <Table.Td ta="right">{row.share_percent ?? 0}%</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )
      }}
    </ReportCard>
  )
}

function OriginalCurrencyTable({ data }: { data: DepartmentCosts }) {
  const headcounts = new Map(data.data.map((row) => [row.department, row.headcount]))
  return (
    <>
      <Text size="sm" mb="xs">
        Monthly cost in each original currency:
      </Text>
      <Table.ScrollContainer minWidth={420}>
        <Table striped horizontalSpacing="md" aria-label={`${TITLE} in original currencies`}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Department</Table.Th>
              <Table.Th ta="right">Employees</Table.Th>
              <Table.Th ta="right">Monthly cost</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody className="tabular-nums">
            {data.by_currency.map((row, index) => (
              <Table.Tr key={`${row.department}-${row.currency}`}>
                <Table.Td>{data.by_currency[index - 1]?.department === row.department ? '' : row.department}</Table.Td>
                <Table.Td ta="right">
                  {data.by_currency[index - 1]?.department === row.department ? '' : headcounts.get(row.department)}
                </Table.Td>
                <Table.Td ta="right">{formatMoney(row.monthly_cost_original, row.currency)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  )
}
