import { Alert, Button, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Text } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useMediaQuery } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconAlertTriangle,
  IconCalendarClock,
  IconCalendarEvent,
  IconHistory,
  IconInfoCircle,
  IconRefresh,
} from '@tabler/icons-react'
import { useState } from 'react'
import { ApiError } from '../../api/client'
import { useSaveSalaryRecord } from '../../api/queries'
import type { Employee, Meta, SalaryRecord } from '../../api/types'
import { DateField } from '../../components/DateField'
import { amountInWords } from '../../lib/amountInWords'
import { formatDate, formatMoney, formatPercent } from '../../lib/format'
import { applyServerErrors } from '../../lib/formErrors'
import { describeTiming, otherPendingRecord, type Timing } from './salaryTiming'

interface SalaryFormModalProps {
  opened: boolean
  onClose: () => void
  employee: Employee
  history: SalaryRecord[]
  meta: Meta
  /** Edit this record; omit to add a salary change. */
  record?: SalaryRecord
  onEditRecord: (record: SalaryRecord) => void
}

export function SalaryFormModal(props: SalaryFormModalProps) {
  const fullScreen = useMediaQuery('(max-width: 36em)')
  const { opened, onClose, record } = props
  const title = !record ? 'Add salary change' : record.status === 'pending' ? 'Edit scheduled change' : 'Correct salary record'
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="lg" fullScreen={fullScreen}>
      {/* Keyed by record so switching records starts a fresh form. */}
      {opened && <SalaryForm key={record?.id ?? 'new'} {...props} />}
    </Modal>
  )
}

interface FormValues {
  effective_on: string | null
  currency: string | null
  salary: number | string
}

const TIMING_STYLE: Record<Timing, { color: string; icon: typeof IconCalendarEvent }> = {
  scheduled: { color: 'orange', icon: IconCalendarClock },
  today: { color: 'brand', icon: IconCalendarEvent },
  backdated: { color: 'blue', icon: IconHistory },
  historic: { color: 'gray', icon: IconHistory },
}

function SalaryForm({ onClose, employee, history, meta, record, onEditRecord }: SalaryFormModalProps) {
  const save = useSaveSalaryRecord(employee.id)
  const [formError, setFormError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const others = history.filter((item) => item.id !== record?.id)
  const pending = otherPendingRecord(history, record?.id)
  const current = history.find((item) => item.status === 'current')
  const countryCurrency =
    meta.countries.find((c) => c.code === employee.country_code)?.currency ?? meta.default_currency

  const zeroDecimal = (currency: string | null) =>
    meta.currencies.find((c) => c.code === currency)?.zero_decimal ?? false

  const form = useForm<FormValues>({
    initialValues: {
      effective_on: record?.effective_on ?? (pending ? meta.today : null),
      currency: record?.currency ?? countryCurrency,
      salary: record ? Number(record.salary) : '',
    },
    validateInputOnBlur: true,
    validate: {
      effective_on: (value) => {
        if (!value) return 'Choose the date this salary takes effect'
        if (value < employee.hire_date) return `Must be on or after the joining date (${formatDate(employee.hire_date)})`
        if (pending && value > meta.today)
          return `A change is already scheduled for ${formatDate(pending.effective_on)}. Edit or cancel it first`
        if (others.some((item) => item.effective_on === value)) return 'There is already a salary record on this date'
        return null
      },
      currency: (value) => (value ? null : 'Choose a currency'),
      salary: (value, values) => {
        const amount = Number(value)
        if (value === '' || !(amount > 0)) return 'Enter an annual salary greater than 0'
        if (zeroDecimal(values.currency) && !Number.isInteger(amount))
          return `${values.currency} amounts must be whole numbers`
        return null
      },
    },
  })

  const { effective_on: effectiveOn, currency, salary } = form.values
  const salaryWords = amountInWords(salary, currency)
  const timing = effectiveOn ? describeTiming(effectiveOn, meta.today, others) : null
  const compareTo = current && current.id !== record?.id ? current : null
  const amount = Number(salary)

  const submit = form.onSubmit(async (values) => {
    setFormError(null)
    setStale(false)
    try {
      await save.mutateAsync({
        id: record?.id,
        salary: String(values.salary),
        currency: values.currency!,
        effective_on: values.effective_on!,
        lock_version: record?.lock_version,
      })
      const scheduled = values.effective_on! > meta.today
      notifications.show({
        color: 'brand',
        title: record ? 'Salary record updated' : scheduled ? 'Salary change scheduled' : 'Salary record added',
        message: `${formatMoney(String(values.salary), values.currency!)} from ${formatDate(values.effective_on!)}.`,
      })
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.isStale) {
        setStale(true)
        return
      }
      setFormError(applyServerErrors(error, form.setErrors, ['effective_on', 'currency', 'salary']))
    }
  })

  const TimingIcon = timing ? TIMING_STYLE[timing.timing].icon : IconInfoCircle

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        {stale && (
          <Alert color="orange" icon={<IconRefresh size={18} />} title="This record was changed by someone else">
            The salary history has been refreshed. Close this window and open the record again to see the latest values.
          </Alert>
        )}
        {formError && (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} role="alert">
            {formError}
          </Alert>
        )}
        {record && record.status !== 'pending' && (
          <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />}>
            This record has already taken effect. Edit it only to correct a mistake.
          </Alert>
        )}
        {!record && pending && (
          <Alert color="orange" variant="light" icon={<IconCalendarClock size={18} />} title="A change is already scheduled">
            <Stack gap="xs" align="flex-start">
              <Text size="sm">
                {formatMoney(pending.salary, pending.currency)} from {formatDate(pending.effective_on)}. An employee can
                have only one scheduled change, so this form accepts today or an earlier date.
              </Text>
              <Button size="xs" variant="white" color="orange" onClick={() => onEditRecord(pending)}>
                Edit the scheduled change instead
              </Button>
            </Stack>
          </Alert>
        )}

        <DateField
          label="Effective from"
          required
          data-autofocus
          minDate={employee.hire_date}
          maxDate={pending ? meta.today : undefined}
          description={`On or after the joining date (${formatDate(employee.hire_date)}). Pick a future date to schedule a change.`}
          {...form.getInputProps('effective_on')}
        />
        <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
          <Select
            label="Currency"
            required
            allowDeselect={false}
            data={meta.currencies.map((c) => c.code)}
            description={`Usually ${countryCurrency} for ${employee.country_name}.`}
            {...form.getInputProps('currency')}
          />
          <Stack gap={4} style={{ gridColumn: 'span 2' }}>
            <NumberInput
              label="Annual base salary"
              required
              min={0}
              allowNegative={false}
              decimalScale={zeroDecimal(currency) ? 0 : 2}
              thousandSeparator=","
              hideControls
              leftSection={<Text size="xs" fw={600} c="dimmed">{currency}</Text>}
              leftSectionWidth={48}
              description={
                compareTo && amount > 0 && currency === compareTo.currency
                  ? `${formatPercent(((amount - Number(compareTo.salary)) / Number(compareTo.salary)) * 100)} compared with the current ${formatMoney(compareTo.salary, compareTo.currency)}`
                  : compareTo && currency !== compareTo.currency
                    ? `The current salary is in ${compareTo.currency}, so no change % is shown.`
                    : 'Increases and decreases are both allowed.'
              }
              {...form.getInputProps('salary')}
            />
            {salaryWords && <Text size="xs" c="dimmed" aria-live="polite">{salaryWords}</Text>}
          </Stack>
        </SimpleGrid>

        {timing && (
          <Alert
            color={TIMING_STYLE[timing.timing].color}
            variant="light"
            icon={<TimingIcon size={18} />}
            aria-live="polite"
          >
            {timing.message}
          </Alert>
        )}

        <Group justify="flex-end" gap="sm" mt="xs">
          <Button variant="default" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {record ? 'Save changes' : effectiveOn && effectiveOn > meta.today ? 'Schedule change' : 'Add salary record'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
