import { Anchor, Badge, Skeleton, Table, Text, Tooltip, UnstyledButton } from '@mantine/core'
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

const COLUMNS = 6

export function EmployeeTable({ employees, loading, params, listSearch, onSort }: EmployeeTableProps) {
  const navigate = useNavigate()

  const header = (label: string, sort?: DirectorySort, align?: 'right') => {
    if (!sort) return <Table.Th ta={align}>{label}</Table.Th>
    const active = params.sort === sort
    const Icon = !active ? IconArrowsSort : params.direction === 'asc' ? IconArrowUp : IconArrowDown
    return (
      <Table.Th aria-sort={active ? (params.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <UnstyledButton className={classes.sortButton} onClick={() => onSort(sort)}>
          {label}
          <Icon size={14} aria-hidden opacity={active ? 1 : 0.45} />
        </UnstyledButton>
      </Table.Th>
    )
  }

  // The name is a real link (keyboard, middle-click); the rest of the row is
  // a larger click target for mouse users.
  const openRow = (employee: Employee) => (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a, button')) return
    navigate(`/employees/${employee.id}`, { state: { listSearch } })
  }

  return (
    <Table.ScrollContainer minWidth={860}>
      <Table verticalSpacing="sm" highlightOnHover className={classes.table}>
        <Table.Thead>
          <Table.Tr>
            {header('Employee', 'name')}
            {header('Role')}
            {header('Country')}
            {header('Joined', 'hire_date')}
            {header('Current salary', undefined, 'right')}
            {header('Scheduled change')}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading && !employees
            ? Array.from({ length: 8 }, (_, row) => (
                <Table.Tr key={row} aria-hidden>
                  {Array.from({ length: COLUMNS }, (_, cell) => (
                    <Table.Td key={cell}>
                      <Skeleton height={14} radius="sm" width={cell === 0 ? '80%' : '60%'} />
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
                    {employee.current_salary ? (
                      <Text size="sm" fw={500} className="tabular-nums">
                        {formatMoney(employee.current_salary.salary, employee.current_salary.currency)}
                      </Text>
                    ) : (
                      <Text size="sm" c="dimmed">
                        Not yet effective
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {employee.pending_salary ? (
                      <Tooltip
                        label={`${formatMoney(employee.pending_salary.salary, employee.pending_salary.currency)} from ${formatDate(employee.pending_salary.effective_on)}`}
                      >
                        <Badge color="orange" variant="light" leftSection={<IconClockHour4 size={12} aria-hidden />}>
                          {formatDate(employee.pending_salary.effective_on)}
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Text size="sm" c="dimmed" aria-label="None">
                        —
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}

