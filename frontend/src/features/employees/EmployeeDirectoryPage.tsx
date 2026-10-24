import { Box, Button, Card, EmptyState, Group, Pagination, Progress, Select, Stack, Text, Title } from '@mantine/core'
import { IconFilterOff, IconPlus, IconUserPlus, IconUsers } from '@tabler/icons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useDirectory, useMeta } from '../../api/queries'
import type { DirectorySort } from '../../api/types'
import { QueryError } from '../../components/QueryError'
import { EmployeeFilters } from './EmployeeFilters'
import { EmployeeFormModal } from './EmployeeFormModal'
import { EmployeeTable } from './EmployeeTable'
import { PAGE_SIZES, useDirectoryParams } from './useDirectoryParams'

export function EmployeeDirectoryPage() {
  const { params, update, clearFilters, hasFilters, search } = useDirectoryParams()
  const directory = useDirectory(params)
  const meta = useMeta()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)

  const page = directory.data?.meta
  const employees = directory.data?.data
  const first = page && page.total > 0 ? (page.page - 1) * page.per_page + 1 : 0
  const last = page ? Math.min(page.page * page.per_page, page.total) : 0

  const sortBy = (sort: DirectorySort) =>
    update({ sort, direction: params.sort === sort && params.direction === 'asc' ? 'desc' : 'asc' })

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <div>
          <Title order={1} fz={{ base: 24, sm: 28 }} c="navy.9">
            Employees
          </Title>
          <Text c="dimmed" size="sm">
            {page ? `${page.total.toLocaleString('en-US')} ${hasFilters ? 'matching' : 'in total'}` : 'Loading…'}
            {' · '}Open an employee to review or change their salary.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={18} />} onClick={() => setAdding(true)}>
          Add employee
        </Button>
      </Group>

      <Card padding={0}>
        <Box p="md">
          <EmployeeFilters
            params={params}
            meta={meta.data}
            hasFilters={hasFilters}
            onChange={update}
            onClear={clearFilters}
          />
        </Box>

        {/* A thin bar while a new page or filter loads over the current rows. */}
        <Progress
          value={100}
          animated
          size={2}
          radius={0}
          style={{ visibility: directory.isFetching && !directory.isPending ? 'visible' : 'hidden' }}
          aria-hidden
        />

        {directory.isError && !employees ? (
          <Box p="md">
            <QueryError title="Couldn't load employees" error={directory.error} onRetry={() => directory.refetch()} />
          </Box>
        ) : employees && employees.length === 0 ? (
          hasFilters ? (
            <EmptyState
              py={48}
              color="navy"
              icon={<IconFilterOff size={28} />}
              title="No employees match"
              description="Try a different search, or clear the filters to see everyone."
            >
              <EmptyState.Actions>
                <Button variant="light" onClick={clearFilters}>
                  Clear filters
                </Button>
              </EmptyState.Actions>
            </EmptyState>
          ) : page && page.total > 0 ? (
            <EmptyState
              py={48}
              color="navy"
              icon={<IconUsers size={28} />}
              title="This page is empty"
              description={`There are only ${page.total_pages} pages.`}
            >
              <EmptyState.Actions>
                <Button variant="light" onClick={() => update({ page: page.total_pages })}>
                  Go to the last page
                </Button>
              </EmptyState.Actions>
            </EmptyState>
          ) : (
            <EmptyState
              py={48}
              color="brand"
              icon={<IconUserPlus size={28} />}
              title="No employees yet"
              description="Add your first employee with their joining date and starting salary."
            >
              <EmptyState.Actions>
                <Button onClick={() => setAdding(true)} leftSection={<IconPlus size={18} />}>
                  Add employee
                </Button>
              </EmptyState.Actions>
            </EmptyState>
          )
        ) : (
          <EmployeeTable
            employees={employees}
            loading={directory.isPending}
            params={params}
            listSearch={search}
            onSort={sortBy}
          />
        )}

        {page && page.total > 0 && (
          <Group justify="space-between" p="md" gap="sm" wrap="wrap" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
            <Group gap="sm" wrap="nowrap">
              <Text size="sm" c="dimmed" aria-live="polite" className="tabular-nums">
                Showing {first.toLocaleString('en-US')}–{last.toLocaleString('en-US')} of{' '}
                {page.total.toLocaleString('en-US')}
              </Text>
              <Select
                aria-label="Rows per page"
                size="xs"
                w={110}
                data={PAGE_SIZES.map((size) => ({ value: String(size), label: `${size} / page` }))}
                value={String(params.per_page)}
                onChange={(value) => value && update({ per_page: value })}
                allowDeselect={false}
              />
            </Group>
            <Pagination
              total={page.total_pages}
              value={params.page}
              onChange={(value) => {
                update({ page: value })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              size="sm"
              siblings={1}
              getControlProps={(control) => ({ 'aria-label': `${control} page` })}
              getItemProps={(item) => ({ 'aria-label': `Page ${item}` })}
            />
          </Group>
        )}
      </Card>

      <EmployeeFormModal
        opened={adding}
        onClose={() => setAdding(false)}
        onSaved={(employee) => navigate(`/employees/${employee.id}`, { state: { listSearch: search } })}
      />
    </Stack>
  )
}
