import { Box, Button, CloseButton, Select, TextInput } from '@mantine/core'
import { useDebouncedCallback } from '@mantine/hooks'
import { IconFilterOff, IconSearch } from '@tabler/icons-react'
import { useState } from 'react'
import type { DirectoryParams, Meta } from '../../api/types'
import { EMPLOYMENT_TYPE_LABELS } from '../../lib/format'
import classes from './EmployeeFilters.module.css'
import type { FilterKey } from './useDirectoryParams'

interface EmployeeFiltersProps {
  params: DirectoryParams
  meta: Meta | undefined
  hasFilters: boolean
  onChange: (changes: Partial<Record<FilterKey | 'q', string | undefined>>) => void
  onClear: () => void
}

export function EmployeeFilters({ params, meta, hasFilters, onChange, onClear }: EmployeeFiltersProps) {
  const [search, setSearch] = useState(params.q ?? '')
  // Search as the user types, without a request per keystroke.
  const commitSearch = useDebouncedCallback((value: string) => onChange({ q: value.trim() || undefined }), 300)

  // Keep the box in step when the URL changes (Back button, "Clear filters").
  const [syncedQ, setSyncedQ] = useState(params.q)
  if (syncedQ !== params.q) {
    setSyncedQ(params.q)
    setSearch(params.q ?? '')
  }

  const select = (key: FilterKey, label: string, data: { value: string; label: string }[], placeholder = `All ${label.toLowerCase()}`) => (
    <Select
      aria-label={label}
      placeholder={placeholder}
      data={data}
      value={params[key] ?? null}
      onChange={(value) => onChange({ [key]: value ?? undefined })}
      searchable
      clearable
      nothingFoundMessage="No matches"
      comboboxProps={{ shadow: 'md' }}
    />
  )

  return (
    <Box className={classes.filters}>
      <TextInput
        className={classes.search}
        aria-label="Search employees"
        placeholder="Search by name or email"
        leftSection={<IconSearch size={16} aria-hidden />}
        value={search}
        onChange={(event) => {
          setSearch(event.currentTarget.value)
          commitSearch(event.currentTarget.value)
        }}
        rightSection={
          search ? (
            <CloseButton
              size="sm"
              aria-label="Clear search"
              onClick={() => {
                setSearch('')
                onChange({ q: undefined })
              }}
            />
          ) : null
        }
      />
      {select('country_code', 'Countries', meta?.countries.map((c) => ({ value: c.code, label: c.name })) ?? [])}
      {select('department', 'Departments', meta?.departments.map((d) => ({ value: d, label: d })) ?? [])}
      {select('job_title', 'Job titles', meta?.job_titles.map((t) => ({ value: t, label: t })) ?? [])}
      {select(
        'employment_type',
        'Employment types',
        meta?.employment_types.map((t) => ({ value: t, label: EMPLOYMENT_TYPE_LABELS[t] })) ?? [],
        'All types',
      )}
      <Button
        variant="subtle"
        color="navy"
        onClick={onClear}
        disabled={!hasFilters}
        leftSection={<IconFilterOff size={16} />}
      >
        Clear filters
      </Button>
    </Box>
  )
}
