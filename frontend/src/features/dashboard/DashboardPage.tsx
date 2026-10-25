import { Anchor, Badge, Button, Card, Collapse, Group, SimpleGrid, Skeleton, Stack, Table, Text } from '@mantine/core'
import { IconArrowRight, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { pinnedRatesToken, useCurrentRates, useInsightsSummary } from '../../api/insights'
import type { InsightsSummary } from '../../api/types'
import { QueryError } from '../../components/QueryError'
import { formatCompactMoney, formatMoney, formatRate } from '../../lib/format'
import { PageHeader } from '../insights/PageHeader'
import { RatesNote } from '../insights/RatesNote'
import { useDisplayCurrency } from '../insights/useDisplayCurrency'

export function DashboardPage() {
  const { currency, ready } = useDisplayCurrency()
  const rates = useCurrentRates()
  const summary = useInsightsSummary(
    { currency, rates_token: pinnedRatesToken(rates.data) },
    ready && !rates.isPending,
  )
  const data = summary.data
  const unavailable = data?.conversion.status === 'unavailable'

  return (
    <Stack gap="lg">
      <PageHeader
        title="Dashboard"
        subtitle="Headcount and estimated salary cost from everyone's current salary."
        actions={
          <Button component={Link} to="/insights" variant="light" rightSection={<IconArrowRight size={16} />}>
            Open insights
          </Button>
        }
      />
      <RatesNote rates={rates} currency={currency} />

      {summary.isError && !data ? (
        <QueryError title="Couldn't load the dashboard" error={summary.error} onRetry={() => summary.refetch()} />
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <StatTile label="Headcount" loading={!data}>
              {data && (
                <>
                  <StatValue>{data.headcount.toLocaleString('en-US')}</StatValue>
                  <Text size="xs" c="dimmed">
                    {data.without_current_salary > 0
                      ? `Includes ${data.without_current_salary} without a salary in effect yet`
                      : 'Every employee has a salary in effect'}
                  </Text>
                </>
              )}
            </StatTile>
            <CostTile label="Estimated monthly cost" data={data} amount={data?.monthly_cost} currency={currency} unit="month" />
            <CostTile label="Estimated annual cost" data={data} amount={data?.annual_cost} currency={currency} unit="year" />
          </SimpleGrid>
          {data && <CurrencyBreakdown summary={data} currency={currency} defaultOpen={unavailable} />}
        </>
      )}
    </Stack>
  )
}

function StatTile({ label, loading, badge, children }: { label: string; loading: boolean; badge?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <Group justify="space-between" gap="xs" mb={6}>
        <Text size="sm" fw={600} c="navy.7">
          {label}
        </Text>
        {badge}
      </Group>
      {loading ? (
        <Stack gap={8}>
          <Skeleton height={32} width="60%" />
          <Skeleton height={12} width="80%" />
        </Stack>
      ) : (
        <Stack gap={2}>{children}</Stack>
      )}
    </Card>
  )
}

function StatValue({ children }: { children: ReactNode }) {
  return (
    <Text fz={32} fw={600} c="navy.9" lh={1.2}>
      {children}
    </Text>
  )
}

interface CostTileProps {
  label: string
  data: InsightsSummary | undefined
  amount: string | null | undefined
  currency: string
  unit: 'month' | 'year'
}

function CostTile({ label, data, amount, currency, unit }: CostTileProps) {
  const notConverted = data?.conversion.status === 'not_needed'
  return (
    <StatTile
      label={label}
      loading={!data}
      badge={data && amount != null && !notConverted ? <Badge variant="light" color="blue">Estimate</Badge> : undefined}
    >
      {amount == null ? (
        <>
          <StatValue>—</StatValue>
          <Text size="xs" c="dimmed">
            Needs exchange rates to combine currencies. See the breakdown below.
          </Text>
        </>
      ) : (
        <>
          <StatValue>{formatCompactMoney(amount, currency)}</StatValue>
          <Text size="xs" c="dimmed" className="tabular-nums">
            {formatMoney(amount, currency)} a {unit}
          </Text>
        </>
      )}
    </StatTile>
  )
}

function CurrencyBreakdown({ summary, currency, defaultOpen }: { summary: InsightsSummary; currency: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  // Opens itself when rates become unavailable, because it is then the only cost figure.
  const [lastDefault, setLastDefault] = useState(defaultOpen)
  if (lastDefault !== defaultOpen) {
    setLastDefault(defaultOpen)
    if (defaultOpen) setOpen(true)
  }
  const converted = summary.conversion.status !== 'unavailable'

  return (
    <Card padding={0}>
      <Group justify="space-between" p="md" gap="sm">
        <div>
          <Text fw={600} c="navy.9">
            By original currency
          </Text>
          <Text size="xs" c="dimmed">
            Salaries as stored, before conversion.
          </Text>
        </div>
        <Anchor
          component="button"
          type="button"
          size="sm"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="currency-breakdown"
        >
          <Group gap={4}>
            {open ? 'Hide breakdown' : 'Show breakdown'}
            {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          </Group>
        </Anchor>
      </Group>
      <Collapse expanded={open} id="currency-breakdown">
        <Table.ScrollContainer minWidth={560}>
          <Table striped horizontalSpacing="md" aria-label="Monthly cost by original currency">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Currency</Table.Th>
                <Table.Th ta="right">Employees</Table.Th>
                <Table.Th ta="right">Monthly cost</Table.Th>
                {converted && <Table.Th ta="right">Rate</Table.Th>}
                {converted && <Table.Th ta="right">In {currency}</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody className="tabular-nums">
              {summary.by_currency.map((row) => (
                <Table.Tr key={row.currency}>
                  <Table.Td>{row.currency}</Table.Td>
                  <Table.Td ta="right">{row.headcount.toLocaleString('en-US')}</Table.Td>
                  <Table.Td ta="right">{formatMoney(row.monthly_cost_original, row.currency)}</Table.Td>
                  {converted && (
                    <Table.Td ta="right">{row.rate ? `1 ${row.currency} = ${formatRate(Number(row.rate), currency)}` : '—'}</Table.Td>
                  )}
                  {converted && <Table.Td ta="right">{row.monthly_cost ? formatMoney(row.monthly_cost, currency) : '—'}</Table.Td>}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Collapse>
    </Card>
  )
}
