import { Box, Button, Card, Group, Skeleton, Stack, Text } from '@mantine/core'
import { IconCalendarClock, IconWallet } from '@tabler/icons-react'
import type { SalaryRecord } from '../../api/types'
import { formatDate, formatMoney } from '../../lib/format'
import { ChangeText } from './SalaryHistory'
import classes from './SalaryOverview.module.css'

interface SalaryOverviewProps {
  records: SalaryRecord[] | undefined
  onEditPending: (record: SalaryRecord) => void
  onCancelPending: (record: SalaryRecord) => void
}

// The current salary, how it changed from the previous one, and the
// scheduled change only when there is one. Nothing renders as an empty slot.
export function SalaryOverview({ records, onEditPending, onCancelPending }: SalaryOverviewProps) {
  if (!records) {
    return (
      <Card>
        <Skeleton height={14} width={120} mb="sm" />
        <Skeleton height={32} width={200} mb="xs" />
        <Skeleton height={12} width={240} />
      </Card>
    )
  }

  const pending = records.find((record) => record.status === 'pending')
  const current = records.find((record) => record.status === 'current')
  // History is newest first, so anything after the current record is older.
  const hasPrevious = current ? records.indexOf(current) < records.length - 1 : false

  return (
    <Card>
      <Group justify="space-between" align="stretch" gap="lg">
        <Stack gap={4} justify="center">
          <Group gap={6} c="brand.8">
            <IconWallet size={18} aria-hidden />
            <Text size="sm" fw={600}>
              Current salary
            </Text>
          </Group>
          {current ? (
            <>
              <Text fz={{ base: 26, sm: 30 }} fw={600} c="navy.9" lh={1.2} className="tabular-nums">
                {formatMoney(current.salary, current.currency)}
              </Text>
              <Group gap={6} wrap="wrap">
                <Text size="sm" c="dimmed">
                  Since {formatDate(current.effective_on)}
                </Text>
                <Text size="sm" c="dimmed" aria-hidden>
                  ·
                </Text>
                {current.change ? (
                  <Group gap={4} wrap="nowrap">
                    <ChangeText change={current.change} />
                    <Text size="sm" c="dimmed">
                      from the previous salary
                    </Text>
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed">
                    {hasPrevious ? 'Paid in a different currency from before' : 'Starting salary'}
                  </Text>
                )}
              </Group>
            </>
          ) : (
            <Text size="sm" c="dimmed">
              {pending ? `No salary has taken effect yet. The first one starts on ${formatDate(pending.effective_on)}.` : 'No salary recorded.'}
            </Text>
          )}
        </Stack>

        {pending && (
          <Box className={classes.pending}>
            <Group gap={6} c="orange.8" mb={4}>
              <IconCalendarClock size={18} aria-hidden />
              <Text size="sm" fw={600}>
                Scheduled change
              </Text>
            </Group>
            <Group gap="xs" align="baseline">
              <Text fz="lg" fw={600} c="navy.9" className="tabular-nums">
                {formatMoney(pending.salary, pending.currency)}
              </Text>
              <ChangeText change={pending.change} />
            </Group>
            <Text size="xs" c="dimmed">
              From {formatDate(pending.effective_on)} · can be edited or cancelled until then
            </Text>
            <Group gap="xs" mt="xs">
              <Button size="compact-sm" variant="white" color="orange" onClick={() => onEditPending(pending)}>
                Edit
              </Button>
              {pending.cancellable && (
                <Button size="compact-sm" variant="subtle" color="red" onClick={() => onCancelPending(pending)}>
                  Cancel change
                </Button>
              )}
            </Group>
          </Box>
        )}
      </Group>
    </Card>
  )
}
