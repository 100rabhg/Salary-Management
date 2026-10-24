import {
  Anchor,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconBriefcase,
  IconTrendingUp,
  IconCalendarClock,
  IconCalendarEvent,
  IconMail,
  IconMapPin,
  IconPencil,
  IconPlus,
  IconTrash,
  IconWallet,
} from '@tabler/icons-react'
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError, errorMessage } from '../../api/client'
import {
  useCancelSalaryRecord,
  useDeleteEmployee,
  useEmployee,
  useMeta,
  useSalaryHistory,
} from '../../api/queries'
import type { Employee, SalaryRecord } from '../../api/types'
import { NotFound } from '../../components/NotFound'
import { QueryError } from '../../components/QueryError'
import { EMPLOYMENT_TYPE_LABELS, formatDate, formatMoney, fullName, initials } from '../../lib/format'
import { EmployeeFormModal } from '../employees/EmployeeFormModal'
import { SalaryFormModal } from '../salaries/SalaryFormModal'
import { ChangeText, SalaryHistory } from './SalaryHistory'

export function EmployeeProfilePage() {
  const id = Number(useParams().id)
  if (!Number.isInteger(id) || id <= 0) {
    return <NotFound title="Employee not found" description="This link doesn't point to an employee." />
  }
  return <EmployeeProfile key={id} id={id} />
}

type SalaryModal = { record?: SalaryRecord } | null

function EmployeeProfile({ id }: { id: number }) {
  const employee = useEmployee(id)
  const history = useSalaryHistory(id)
  const meta = useMeta()
  const navigate = useNavigate()
  const location = useLocation()
  const listSearch = (location.state as { listSearch?: string } | null)?.listSearch ?? ''
  const directoryLink = `/employees${listSearch ? `?${listSearch}` : ''}`

  const [editingEmployee, setEditingEmployee] = useState(false)
  const [salaryModal, setSalaryModal] = useState<SalaryModal>(null)
  const cancelSalary = useCancelSalaryRecord(id)
  const deleteEmployee = useDeleteEmployee()

  if (employee.error instanceof ApiError && employee.error.status === 404) {
    return <NotFound title="Employee not found" description="They may have been deleted. Check the directory." />
  }

  const confirmCancel = (record: SalaryRecord) =>
    modals.openConfirmModal({
      title: 'Cancel scheduled change?',
      children: (
        <Text size="sm">
          The change to {formatMoney(record.salary, record.currency)} scheduled for {formatDate(record.effective_on)} will
          be removed. The current salary stays as it is.
        </Text>
      ),
      labels: { confirm: 'Cancel change', cancel: 'Keep it' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        cancelSalary.mutate(record.id, {
          onSuccess: () =>
            notifications.show({ color: 'brand', title: 'Scheduled change cancelled', message: 'The salary history is up to date.' }),
          onError: (error) =>
            notifications.show({ color: 'red', title: "Couldn't cancel the change", message: errorMessage(error) }),
        }),
    })

  const confirmDelete = (person: Employee) =>
    modals.openConfirmModal({
      title: `Delete ${fullName(person)}?`,
      children: (
        <Text size="sm">
          This permanently deletes the employee and all {history.data?.length ?? 'their'} salary records. It can't be
          undone.
        </Text>
      ),
      labels: { confirm: 'Delete employee', cancel: 'Keep employee' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        deleteEmployee.mutate(person.id, {
          onSuccess: () => {
            notifications.show({ color: 'brand', title: 'Employee deleted', message: `${fullName(person)} was removed.` })
            navigate(directoryLink)
          },
          onError: (error) =>
            notifications.show({ color: 'red', title: "Couldn't delete the employee", message: errorMessage(error) }),
        }),
    })

  const person = employee.data
  const records = history.data ?? []
  const pending = records.find((record) => record.status === 'pending')
  const current = records.find((record) => record.status === 'current')
  const latestChange = records.find((record) => record.status !== 'pending' && record.change)

  return (
    <Stack gap="lg">
      <Breadcrumbs separatorMargin={6}>
        <Anchor component={Link} to={directoryLink} size="sm">
          Employees
        </Anchor>
        <Text size="sm" c="dimmed">
          {person ? fullName(person) : 'Employee'}
        </Text>
      </Breadcrumbs>

      {employee.isError ? (
        <QueryError title="Couldn't load this employee" error={employee.error} onRetry={() => employee.refetch()} />
      ) : !person ? (
        <ProfileSkeleton />
      ) : (
        <>
          <Card>
            <Group justify="space-between" align="flex-start" gap="md">
              <Group gap="md" wrap="nowrap" align="flex-start">
                <Avatar size={56} radius="xl" color="navy" variant="filled">
                  {initials(fullName(person))}
                </Avatar>
                <div>
                  <Title order={1} fz={{ base: 22, sm: 26 }} c="navy.9">
                    {fullName(person)}
                  </Title>
                  <Text c="dimmed" size="sm">
                    {person.job_title} · {person.department}
                  </Text>
                </div>
              </Group>
              <Group gap="xs">
                <Button variant="default" leftSection={<IconPencil size={16} />} onClick={() => setEditingEmployee(true)}>
                  Edit details
                </Button>
                <Button variant="subtle" color="red" leftSection={<IconTrash size={16} />} onClick={() => confirmDelete(person)}>
                  Delete
                </Button>
              </Group>
            </Group>
            <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} mt="lg" spacing="md">
              <Detail icon={<IconMail size={16} />} label="Email">
                <Anchor href={`mailto:${person.email}`} size="sm" style={{ wordBreak: 'break-all' }}>
                  {person.email}
                </Anchor>
              </Detail>
              <Detail icon={<IconMapPin size={16} />} label="Country">
                {person.country_name}
              </Detail>
              <Detail icon={<IconBriefcase size={16} />} label="Employment type">
                {EMPLOYMENT_TYPE_LABELS[person.employment_type]}
              </Detail>
              <Detail icon={<IconCalendarEvent size={16} />} label="Joined">
                {formatDate(person.hire_date)}
              </Detail>
            </SimpleGrid>
          </Card>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <SummaryCard icon={<IconWallet size={18} />} label="Current salary" accent="brand">
              {current ? (
                <>
                  <Amount>{formatMoney(current.salary, current.currency)}</Amount>
                  <Text size="xs" c="dimmed">Since {formatDate(current.effective_on)}</Text>
                </>
              ) : history.isPending ? (
                <Skeleton height={28} width="70%" />
              ) : (
                <Text size="sm" c="dimmed">No salary has taken effect yet.</Text>
              )}
            </SummaryCard>
            <SummaryCard icon={<IconCalendarClock size={18} />} label="Scheduled change" accent="orange">
              {pending ? (
                <>
                  <Group gap="xs" align="baseline">
                    <Amount>{formatMoney(pending.salary, pending.currency)}</Amount>
                    <ChangeText change={pending.change} />
                  </Group>
                  <Text size="xs" c="dimmed">
                    From {formatDate(pending.effective_on)} · can be edited or cancelled until then
                  </Text>
                  <Group gap="xs" mt={6}>
                    <Button size="compact-sm" variant="light" color="orange" onClick={() => setSalaryModal({ record: pending })}>
                      Edit
                    </Button>
                    {pending.cancellable && (
                      <Button size="compact-sm" variant="subtle" color="red" onClick={() => confirmCancel(pending)}>
                        Cancel change
                      </Button>
                    )}
                  </Group>
                </>
              ) : history.isPending ? (
                <Skeleton height={28} width="60%" />
              ) : (
                <Text size="sm" c="dimmed">None. Use “Add salary change” with a future date to schedule one.</Text>
              )}
            </SummaryCard>
            <SummaryCard icon={<IconTrendingUp size={18} />} label="Last change" accent="navy">
              {latestChange ? (
                <>
                  <Group gap="xs" align="baseline">
                    <ChangeText change={latestChange.change} />
                  </Group>
                  <Text size="xs" c="dimmed">
                    On {formatDate(latestChange.effective_on)} to {formatMoney(latestChange.salary, latestChange.currency)}
                  </Text>
                </>
              ) : history.isPending ? (
                <Skeleton height={28} width="50%" />
              ) : (
                <Text size="sm" c="dimmed">No change since the starting salary.</Text>
              )}
            </SummaryCard>
          </SimpleGrid>

          <Card padding={0}>
            <Group justify="space-between" p="md" gap="sm">
              <div>
                <Title order={2} fz="lg" c="navy.9">
                  Salary history
                </Title>
                <Text size="xs" c="dimmed" maw={560}>
                  Records that have taken effect can be edited to correct mistakes. A scheduled change can be cancelled
                  until it takes effect; there can be one at a time.
                </Text>
              </div>
              <Button leftSection={<IconPlus size={16} />} onClick={() => setSalaryModal({})} disabled={!meta.data}>
                Add salary change
              </Button>
            </Group>
            {history.isError ? (
              <Box p="md" pt={0}>
                <QueryError title="Couldn't load the salary history" error={history.error} onRetry={() => history.refetch()} />
              </Box>
            ) : history.isPending ? (
              <Stack p="md" pt={0} gap="xs">
                {[0, 1, 2].map((row) => (
                  <Skeleton key={row} height={36} />
                ))}
              </Stack>
            ) : (
              <SalaryHistory
                records={records}
                onEdit={(record) => setSalaryModal({ record })}
                onCancel={confirmCancel}
              />
            )}
          </Card>

          <EmployeeFormModal opened={editingEmployee} onClose={() => setEditingEmployee(false)} employee={person} />
          {meta.data && (
            <SalaryFormModal
              opened={salaryModal !== null}
              onClose={() => setSalaryModal(null)}
              employee={person}
              history={records}
              meta={meta.data}
              record={salaryModal?.record}
              onEditRecord={(record) => setSalaryModal({ record })}
            />
          )}
        </>
      )}
    </Stack>
  )
}

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <Box c="navy.4" mt={2} aria-hidden>
        {icon}
      </Box>
      <div style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.4}>
          {label}
        </Text>
        <Text size="sm" component="div">
          {children}
        </Text>
      </div>
    </Group>
  )
}

function SummaryCard({ icon, label, accent, children }: { icon: ReactNode; label: string; accent: string; children: ReactNode }) {
  return (
    <Card style={{ borderTop: `3px solid var(--mantine-color-${accent}-6)` }}>
      <Group gap={6} mb={6} c={`${accent}.8`}>
        {icon}
        <Text size="sm" fw={600}>
          {label}
        </Text>
      </Group>
      <Stack gap={2}>{children}</Stack>
    </Card>
  )
}

function Amount({ children }: { children: ReactNode }) {
  return (
    <Text fz={24} fw={600} c="navy.9" className="tabular-nums" lh={1.25}>
      {children}
    </Text>
  )
}

function ProfileSkeleton() {
  return (
    <Stack gap="lg" aria-busy aria-label="Loading employee">
      <Skeleton height={150} radius="md" />
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Skeleton height={110} radius="md" />
        <Skeleton height={110} radius="md" />
        <Skeleton height={110} radius="md" />
      </SimpleGrid>
      <Skeleton height={240} radius="md" />
    </Stack>
  )
}
