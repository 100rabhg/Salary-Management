import { Button, Card, EmptyState } from '@mantine/core'
import { IconArrowLeft, IconUserQuestion } from '@tabler/icons-react'
import { Link } from 'react-router'

export function NotFound({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <EmptyState
        py="xl"
        icon={<IconUserQuestion size={28} />}
        color="navy"
        title={title}
        description={description}
      >
        <EmptyState.Actions>
          <Button component={Link} to="/employees" variant="light" leftSection={<IconArrowLeft size={16} />}>
            Back to employees
          </Button>
        </EmptyState.Actions>
      </EmptyState>
    </Card>
  )
}
