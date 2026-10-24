import { ActionIcon, Badge, Group, Table, Text, Tooltip, VisuallyHidden } from '@mantine/core'
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCircleCheck,
  IconClockHour4,
  IconHistory,
  IconPencil,
  IconX,
} from '@tabler/icons-react'
import type { SalaryRecord, SalaryStatus } from '../../api/types'
import { formatDate, formatMoney, formatPercent } from '../../lib/format'

const STATUS: Record<SalaryStatus, { label: string; color: string; icon: typeof IconHistory }> = {
  pending: { label: 'Scheduled', color: 'orange', icon: IconClockHour4 },
  current: { label: 'Current', color: 'brand', icon: IconCircleCheck },
  past: { label: 'Past', color: 'gray', icon: IconHistory },
}

export function StatusBadge({ status }: { status: SalaryStatus }) {
  const { label, color, icon: Icon } = STATUS[status]
  return (
    <Badge color={color} variant="light" leftSection={<Icon size={12} aria-hidden />}>
      {label}
    </Badge>
  )
}

// Direction is shown by an arrow and a sign, not by colour alone.
export function ChangeText({ change }: { change: SalaryRecord['change'] }) {
  if (!change) return <Text size="sm" c="dimmed">—</Text>
  const up = change.percent > 0
  const down = change.percent < 0
  const Icon = up ? IconArrowUpRight : IconArrowDownRight
  return (
    <Group gap={4} wrap="nowrap">
      {(up || down) && <Icon size={14} aria-hidden color={up ? 'var(--mantine-color-brand-7)' : 'var(--mantine-color-red-7)'} />}
      <Text size="sm" className="tabular-nums" c={up ? 'brand.8' : down ? 'red.8' : 'dimmed'}>
        {formatPercent(change.percent)}
      </Text>
    </Group>
  )
}

interface SalaryHistoryProps {
  records: SalaryRecord[]
  onEdit: (record: SalaryRecord) => void
  onCancel: (record: SalaryRecord) => void
}

export function SalaryHistory({ records, onEdit, onCancel }: SalaryHistoryProps) {
  return (
    <Table.ScrollContainer minWidth={620}>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Effective from</Table.Th>
            <Table.Th ta="right">Annual salary</Table.Th>
            <Table.Th>Change</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th ta="right">
              <VisuallyHidden>Actions</VisuallyHidden>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {records.map((record) => {
            const label = `${formatMoney(record.salary, record.currency)} from ${formatDate(record.effective_on)}`
            return (
              <Table.Tr key={record.id} bg={record.status === 'pending' ? 'orange.0' : record.status === 'current' ? 'brand.0' : undefined}>
                <Table.Td>
                  <Text size="sm" fw={record.status === 'past' ? 400 : 600} className="tabular-nums">
                    {formatDate(record.effective_on)}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text size="sm" fw={record.status === 'past' ? 400 : 600} className="tabular-nums">
                    {formatMoney(record.salary, record.currency)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <ChangeText change={record.change} />
                </Table.Td>
                <Table.Td>
                  <StatusBadge status={record.status} />
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    <Tooltip label={record.status === 'pending' ? 'Edit scheduled change' : 'Correct this record'}>
                      <ActionIcon
                        variant="subtle"
                        color="navy"
                        size="lg"
                        aria-label={`Edit salary record: ${label}`}
                        onClick={() => onEdit(record)}
                      >
                        <IconPencil size={18} />
                      </ActionIcon>
                    </Tooltip>
                    {record.cancellable && (
                      <Tooltip label="Cancel scheduled change">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="lg"
                          aria-label={`Cancel scheduled change: ${label}`}
                          onClick={() => onCancel(record)}
                        >
                          <IconX size={18} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
