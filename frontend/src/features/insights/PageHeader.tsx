import { Group, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'
import { DisplayCurrencyPicker } from './DisplayCurrencyPicker'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
      <div>
        <Title order={1} fz={{ base: 24, sm: 28 }} c="navy.9">
          {title}
        </Title>
        <Text c="dimmed" size="sm">
          {subtitle}
        </Text>
      </div>
      <Group align="flex-end" gap="md">
        {actions}
        <DisplayCurrencyPicker />
      </Group>
    </Group>
  )
}
