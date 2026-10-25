import { Box, Button, Card, Group, SegmentedControl, Select, Skeleton, Stack, Text, Title } from '@mantine/core'
import { IconFilterOff } from '@tabler/icons-react'
import { useState, type ReactNode } from 'react'
import { useMeta } from '../../api/queries'
import type { Conversion, InsightFilterKey } from '../../api/types'
import { EMPLOYMENT_TYPE_LABELS, formatDate } from '../../lib/format'

export type ReportView = 'chart' | 'table'

interface ReportCardProps {
  title: string
  description: ReactNode
  filters: ReactNode
  conversion?: Conversion
  children: (view: ReportView) => ReactNode
}

export function ReportCard({ title, description, filters, conversion, children }: ReportCardProps) {
  const [view, setView] = useState<ReportView>('chart')
  return (
    <Card component="section" aria-label={title}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <div>
            <Title order={2} fz="lg" c="navy.9">
              {title}
            </Title>
            <Text size="sm" c="dimmed" maw={640}>
              {description}
            </Text>
          </div>
          <SegmentedControl
            size="xs"
            value={view}
            onChange={(value) => setView(value as ReportView)}
            data={[
              { value: 'chart', label: 'Chart' },
              { value: 'table', label: 'Table' },
            ]}
            aria-label={`${title}: view as`}
          />
        </Group>
        {filters}
        <Box>{children(view)}</Box>
        {conversion && <ConversionCaption conversion={conversion} />}
      </Stack>
    </Card>
  )
}

function ConversionCaption({ conversion }: { conversion: Conversion }) {
  const { status, display_currency: currency, rate_date: rateDate } = conversion
  if (status === 'unavailable') return null
  return (
    <Text size="xs" c="dimmed">
      {status === 'not_needed'
        ? `Every salary here is already in ${currency}, so nothing was converted.`
        : `Estimated in ${currency} with ECB reference rates from ${formatDate(rateDate!)}.`}
    </Text>
  )
}

const FILTER_LABELS: Record<InsightFilterKey, { label: string; placeholder: string }> = {
  country_code: { label: 'Country', placeholder: 'All countries' },
  department: { label: 'Department', placeholder: 'All departments' },
  job_title: { label: 'Job title', placeholder: 'All job titles' },
  employment_type: { label: 'Employment type', placeholder: 'All employment types' },
}

interface ReportFiltersProps {
  keys: readonly InsightFilterKey[]
  filters: Partial<Record<InsightFilterKey, string>>
  active: boolean
  onChange: (changes: Partial<Record<InsightFilterKey, string | undefined>>) => void
  onClear: () => void
}

export function ReportFilters({ keys, filters, active, onChange, onClear }: ReportFiltersProps) {
  const meta = useMeta().data
  const options: Record<InsightFilterKey, { value: string; label: string }[]> = {
    country_code: meta?.countries.map((country) => ({ value: country.code, label: country.name })) ?? [],
    department: meta?.departments.map((value) => ({ value, label: value })) ?? [],
    job_title: meta?.job_titles.map((value) => ({ value, label: value })) ?? [],
    employment_type: meta?.employment_types.map((value) => ({ value, label: EMPLOYMENT_TYPE_LABELS[value] })) ?? [],
  }
  return (
    <Group gap="sm" align="flex-end" wrap="wrap">
      {keys.map((key) => (
        <Select
          key={key}
          aria-label={FILTER_LABELS[key].label}
          placeholder={FILTER_LABELS[key].placeholder}
          data={options[key]}
          value={filters[key] ?? null}
          onChange={(value) => onChange({ [key]: value ?? undefined })}
          searchable
          clearable
          size="xs"
          w={{ base: '100%', xs: 190 }}
          comboboxProps={{ shadow: 'md' }}
        />
      ))}
      {active && (
        <Button size="xs" variant="subtle" color="navy" leftSection={<IconFilterOff size={14} />} onClick={onClear}>
          Clear filters
        </Button>
      )}
    </Group>
  )
}

export function ReportSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Stack gap={10} aria-busy aria-label="Loading report">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={20} width={`${90 - index * 8}%`} />
      ))}
    </Stack>
  )
}
