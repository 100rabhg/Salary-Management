import { Alert, Anchor, Button, Group, Popover, Skeleton, Stack, Table, Text } from '@mantine/core'
import { IconAlertTriangle, IconInfoCircle, IconRefresh } from '@tabler/icons-react'
import type { UseQueryResult } from '@tanstack/react-query'
import { errorMessage } from '../../api/client'
import type { CurrentRates } from '../../api/types'
import { formatDate, formatRate } from '../../lib/format'

interface RatesNoteProps {
  rates: UseQueryResult<CurrentRates>
  currency: string
}

// States the rates every figure on the page was converted with, and warns
// when they are old or missing.
export function RatesNote({ rates, currency }: RatesNoteProps) {
  if (rates.isPending) return <Skeleton height={44} radius="md" />

  if (rates.isError) {
    return (
      <Alert color="orange" variant="light" icon={<IconAlertTriangle size={18} />} title="Couldn't check exchange rates">
        <Group justify="space-between" gap="sm">
          <Text size="sm">{errorMessage(rates.error)} Reports use the last stored rates, if any.</Text>
          <RetryButton onClick={() => rates.refetch()} loading={rates.isFetching} />
        </Group>
      </Alert>
    )
  }

  const { rate_set: rateSet, status } = rates.data
  if (!rateSet) {
    return (
      <Alert color="orange" variant="light" icon={<IconAlertTriangle size={18} />} title="Exchange rates are unavailable">
        <Group justify="space-between" gap="sm">
          <Text size="sm">
            Salaries in different currencies can't be combined right now. Headcounts and figures in their original
            currencies are still shown.
          </Text>
          <RetryButton onClick={() => rates.refetch()} loading={rates.isFetching} />
        </Group>
      </Alert>
    )
  }

  const stale = status === 'stale'
  return (
    <Alert
      color={stale ? 'orange' : 'blue'}
      variant="light"
      icon={stale ? <IconAlertTriangle size={18} /> : <IconInfoCircle size={18} />}
      title={stale ? 'These exchange rates are out of date' : undefined}
    >
      <Group justify="space-between" gap="xs" wrap="wrap">
        <Text size="sm">
          Converted figures are estimates in {currency}, using ECB reference rates from{' '}
          <strong>{formatDate(rateSet.rate_date)}</strong> (via Frankfurter).
          {stale ? " The latest rates couldn't be fetched, so the last stored ones are used." : ''} Stored salaries
          keep their original currency.
        </Text>
        <Group gap="xs">
          <RatesPopover rates={rateSet.rates} currency={currency} />
          <Button
            size="compact-sm"
            variant="subtle"
            leftSection={<IconRefresh size={14} />}
            onClick={() => rates.refetch()}
            loading={rates.isFetching}
          >
            Check for newer rates
          </Button>
        </Group>
      </Group>
    </Alert>
  )
}

function RatesPopover({ rates, currency }: { rates: Record<string, string>; currency: string }) {
  const display = Number(rates[currency])
  const others = Object.keys(rates).filter((code) => code !== currency)
  return (
    <Popover width={240} position="bottom-end" shadow="md" withArrow>
      <Popover.Target>
        <Anchor component="button" type="button" size="sm">
          Rates used
        </Anchor>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap={6}>
          <Text size="xs" c="dimmed">
            Value of one unit in {currency}
          </Text>
          <Table withRowBorders={false} verticalSpacing={2} fz="sm">
            <Table.Tbody>
              {others.map((code) => (
                <Table.Tr key={code}>
                  <Table.Td>1 {code}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">
                    {formatRate(display / Number(rates[code]), currency)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}

function RetryButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <Button size="xs" variant="white" color="orange" leftSection={<IconRefresh size={14} />} onClick={onClick} loading={loading}>
      Try again
    </Button>
  )
}
