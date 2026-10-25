import { Alert, Button, EmptyState } from '@mantine/core'
import { IconAlertTriangle, IconFilterOff } from '@tabler/icons-react'
import type { ReactNode } from 'react'

export function NoMatches({ onClear, filtered }: { onClear: () => void; filtered: boolean }) {
  return (
    <EmptyState
      py="lg"
      size="sm"
      color="navy"
      icon={<IconFilterOff size={24} />}
      title={filtered ? 'No employees match these filters' : 'No employees with a current salary yet'}
      description={filtered ? 'Try a different combination, or clear the filters.' : 'Add employees to see this report.'}
    >
      {filtered && (
        <EmptyState.Actions>
          <Button size="xs" variant="light" onClick={onClear}>
            Clear filters
          </Button>
        </EmptyState.Actions>
      )}
    </EmptyState>
  )
}

export function RatesUnavailable({ children, what }: { children?: ReactNode; what: string }) {
  return (
    <>
      <Alert color="orange" variant="light" icon={<IconAlertTriangle size={18} />} mb="sm">
        {what} need exchange rates to combine salaries in different currencies, and none are available right now.
      </Alert>
      {children}
    </>
  )
}
