import { Anchor, Group, Skeleton, Table, Text, Tooltip, UnstyledButton, VisuallyHidden } from '@mantine/core'
import { IconArrowDown, IconArrowUp, IconArrowsSort, IconClockHour4 } from '@tabler/icons-react'
import type { MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import type { DirectoryParams, DirectorySort, Employee } from '../../api/types'
import { EMPLOYMENT_TYPE_LABELS, formatDate, formatMoney, fullName } from '../../lib/format'
import classes from './EmployeeTable.module.css'

interface EmployeeTableProps {
  employees: Employee[] | undefined
  loading: boolean
  params: DirectoryParams
  listSearch: string
  onSort: (sort: DirectorySort) => void
}

const COLUMNS: { label: string; sort: DirectorySort; align?: 'right'; hint?: string }[] = [
  { label: 'Employee', sort: 'name' },
  { label: 'Role', sort: 'job_title' },
  { label: 'Country', sort: 'country' },
  { label: 'Joined', sort: 'hire_date' },
  // Amounts in different currencies can't be compared, so the API sorts by
  // currency first.
  { label: 'Salary', sort: 'salary', align: 'right', hint: 'Sorted by currency, then amount' },
]

export function EmployeeTable({ employees, loading, params, listSearch, onSort }: EmployeeTableProps) {
  const navigate = useNavigate()

  // The name is a real link (keyboard, middle-click); the rest of the row is
  // a larger click target for mouse users.
  const openRow = (employee: Employee) => (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a, button')) return
    navigate(`/employees/${employee.id}`, { state: { listSearch } })
  }

  return (
    <Table.ScrollContainer minWidth={760}>
      <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover className={classes.table}>
        <Table.Thead>
          <Table.Tr>
            {COLUMNS.map(({ label, sort, align, hint }) => {
              const active = params.sort === sort
              const Icon = !active ? IconArrowsSort : params.direction === 'asc' ? IconArrowUp : IconArrowDown
              const button = (
                <UnstyledButton className={classes.sortButton} onClick={() => onSort(sort)}>
                  {label}
                  <Icon size={14} aria-hidden opacity={active ? 1 : 0.45} />
                </UnstyledButton>
              )
              return (
                <Table.Th
                  key={sort}
                  ta={align}
                  aria-sort={active ? (params.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {hint ? (
                    <Tooltip label={hint} withArrow>
                      {button}
                    </Tooltip>
                  ) : (
                    button
                  )}
                </Table.Th>
              )
            })}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading && !employees
            ? Array.from({ length: 8 }, (_, row) => (
                <Table.Tr key={row} aria-hidden>
                  {COLUMNS.map((column, cell) => (
                    <Table.Td key={column.sort}>
                      <Skeleton height={14} radius="sm" width={cell === 0 ? '80%' : '60%'} ml={column.align ? 'auto' : 0} />
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            : employees?.map((employee) => (
                <Table.Tr key={employee.id} className={classes.row} onClick={openRow(employee)}>
                  <Table.Td>
                    <Anchor
                      component={Link}
                      to={`/employees/${employee.id}`}
                      state={{ listSearch }}
                      fw={600}
                      c="navy.9"
                      size="sm"
                    >
                      {fullName(employee)}
                    </Anchor>
                    <Text size="xs" c="dimmed" truncate maw={260}>
                      {employee.email}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{employee.job_title}</Text>
                    <Text size="xs" c="dimmed">
                      {employee.department} · {EMPLOYMENT_TYPE_LABELS[employee.employment_type]}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{employee.country_name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" className="tabular-nums">
                      {formatDate(employee.hire_date)}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <SalaryCell employee={employee} />
                  </Table.Td>
                </Table.Tr>
              ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}

// The current salary, with any scheduled change as a quiet second line, so
// rows without one don't show an empty placeholder.
function SalaryCell({ employee }: { employee: Employee }) {
  const { current_salary: current, pending_salary: pending } = employee
  return (
    <>
      {current ? (
        <Text size="sm" fw={500} className="tabular-nums">
          {formatMoney(current.salary, current.currency)}
        </Text>
      ) : (
        <Text size="sm" c="dimmed">
          Not yet effective
        </Text>
      )}
      {pending && (
        <Group gap={4} justify="flex-end" wrap="nowrap" c="orange.8">
          <IconClockHour4 size={12} aria-hidden />
          <Text size="xs" className="tabular-nums" c="orange.8">
            <VisuallyHidden>Scheduled change: </VisuallyHidden>
            {formatMoney(pending.salary, pending.currency)} from {formatDate(pending.effective_on)}
          </Text>
        </Group>
      )}
    </>
  )
}
