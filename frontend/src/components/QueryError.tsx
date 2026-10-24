import { Alert, Button, Group, Text } from '@mantine/core'
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react'
import { errorMessage } from '../api/client'

interface QueryErrorProps {
  title: string
  error: unknown
  onRetry: () => void
}

export function QueryError({ title, error, onRetry }: QueryErrorProps) {
  return (
    <Alert color="red" variant="light" title={title} icon={<IconAlertTriangle size={20} />} role="alert">
      <Group justify="space-between" align="center" gap="sm">
        <Text size="sm">{errorMessage(error)}</Text>
        <Button size="xs" variant="white" color="red" leftSection={<IconRefresh size={14} />} onClick={onRetry}>
          Try again
        </Button>
      </Group>
    </Alert>
  )
}
