import {
  Alert,
  Autocomplete,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useMediaQuery } from '@mantine/hooks'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle, IconInfoCircle, IconRefresh } from '@tabler/icons-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { ApiError } from '../../api/client'
import { useCreateEmployee, useMeta, useUpdateEmployee } from '../../api/queries'
import type { Employee, EmploymentType, Meta } from '../../api/types'
import { DateField } from '../../components/DateField'
import { EMPLOYMENT_TYPE_LABELS, formatDate, fullName } from '../../lib/format'
import { applyServerErrors } from '../../lib/formErrors'

interface EmployeeFormModalProps {
  opened: boolean
  onClose: () => void
  onSaved?: (employee: Employee) => void
  /** Edit this employee; omit to add a new one. */
  employee?: Employee
}

interface FormValues {
  first_name: string
  last_name: string
  email: string
  job_title: string
  department: string
  country_code: string | null
  employment_type: EmploymentType
  hire_date: string | null
  salary: number | string
  currency: string | null
}

const FORM_FIELDS: (keyof FormValues)[] = [
  'first_name',
  'last_name',
  'email',
  'job_title',
  'department',
  'country_code',
  'employment_type',
  'hire_date',
  'salary',
  'currency',
]

// The modal mounts its form only while open, so every opening starts from
// fresh values.
export function EmployeeFormModal({ opened, onClose, onSaved, employee }: EmployeeFormModalProps) {
  const fullScreen = useMediaQuery('(max-width: 36em)')
  const meta = useMeta()
  const isDirty = useRef<() => boolean>(() => false)

  const requestClose = () => {
    if (!isDirty.current()) return onClose()
    modals.openConfirmModal({
      title: 'Discard changes?',
      children: <Text size="sm">You have unsaved changes. If you close this window they will be lost.</Text>,
      labels: { confirm: 'Discard', cancel: 'Keep editing' },
      confirmProps: { color: 'red' },
      onConfirm: onClose,
    })
  }

  return (
    <Modal
      opened={opened}
      onClose={requestClose}
      title={employee ? `Edit ${fullName(employee)}` : 'Add employee'}
      size="lg"
      fullScreen={fullScreen}
    >
      {opened && meta.data ? (
        <EmployeeForm
          meta={meta.data}
          employee={employee}
          onCancel={requestClose}
          isDirtyRef={isDirty}
          onSaved={(saved) => {
            onClose()
            onSaved?.(saved)
          }}
        />
      ) : meta.isError ? (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          The form options couldn't be loaded. Close this window and try again.
        </Alert>
      ) : (
        <Text c="dimmed" size="sm">
          Loading form…
        </Text>
      )}
    </Modal>
  )
}

interface EmployeeFormProps {
  meta: Meta
  employee?: Employee
  onCancel: () => void
  onSaved: (employee: Employee) => void
  isDirtyRef: RefObject<() => boolean>
}

function initialValues(meta: Meta, employee?: Employee): FormValues {
  return {
    first_name: employee?.first_name ?? '',
    last_name: employee?.last_name ?? '',
    email: employee?.email ?? '',
    job_title: employee?.job_title ?? '',
    department: employee?.department ?? '',
    country_code: employee?.country_code ?? null,
    employment_type: employee?.employment_type ?? 'full_time',
    hire_date: employee?.hire_date ?? meta.today,
    salary: '',
    currency: meta.default_currency,
  }
}

function EmployeeForm({ meta, employee, onCancel, onSaved, isDirtyRef }: EmployeeFormProps) {
  const editing = Boolean(employee)
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee(employee?.id ?? 0)
  const [formError, setFormError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  // The version this form was loaded from. It only moves forward when HR
  // loads the latest details, so a save can never overwrite an edit made by
  // someone else in the meantime.
  const [lockVersion, setLockVersion] = useState(employee?.lock_version ?? 0)
  // Until HR picks a currency, it follows the country's usual currency.
  const [currencyChosen, setCurrencyChosen] = useState(false)

  const zeroDecimal = (currency: string | null) =>
    meta.currencies.find((c) => c.code === currency)?.zero_decimal ?? false

  const form = useForm<FormValues>({
    initialValues: initialValues(meta, employee),
    validateInputOnBlur: true,
    validate: {
      first_name: (value) => required(value, 'First name') ?? maxLength(value, 100),
      last_name: (value) => required(value, 'Last name') ?? maxLength(value, 100),
      email: (value) =>
        required(value, 'Email') ?? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : 'Enter a valid email address, like name@acme.com'),
      job_title: (value) => required(value, 'Job title') ?? maxLength(value, 100),
      department: (value) => required(value, 'Department') ?? maxLength(value, 100),
      country_code: (value) => (value ? null : 'Choose a country'),
      hire_date: (value) =>
        !value ? 'Enter the joining date' : value > meta.today ? "The joining date can't be in the future" : null,
      salary: (value, values) => {
        if (editing) return null
        const amount = Number(value)
        if (value === '' || !(amount > 0)) return 'Enter an annual salary greater than 0'
        if (zeroDecimal(values.currency) && !Number.isInteger(amount))
          return `${values.currency} amounts must be whole numbers`
        return null
      },
      currency: (value) => (editing || value ? null : 'Choose a currency'),
    },
  })

  useEffect(() => {
    isDirtyRef.current = () => form.isDirty()
  })

  const countryCurrency = (code: string | null) =>
    meta.countries.find((c) => c.code === code)?.currency ?? meta.default_currency

  const saving = createEmployee.isPending || updateEmployee.isPending

  const submit = form.onSubmit(async (values) => {
    setFormError(null)
    setStale(false)
    const details = {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email: values.email.trim(),
      job_title: values.job_title.trim(),
      department: values.department.trim(),
      country_code: values.country_code!,
      employment_type: values.employment_type,
      hire_date: values.hire_date!,
    }
    try {
      const saved = employee
        ? await updateEmployee.mutateAsync({ ...details, lock_version: lockVersion })
        : await createEmployee.mutateAsync({
            ...details,
            first_salary: { salary: String(values.salary), currency: values.currency! },
          })
      notifications.show({
        color: 'brand',
        title: employee ? 'Employee updated' : 'Employee added',
        message: employee ? `${fullName(saved)}'s details were saved.` : `${fullName(saved)} was added with their starting salary.`,
      })
      onSaved(saved)
    } catch (error) {
      if (error instanceof ApiError && error.isStale) {
        setStale(true)
        return
      }
      setFormError(
        applyServerErrors(error, form.setErrors, FORM_FIELDS, {
          'first_salary.salary': 'salary',
          'first_salary.currency': 'currency',
          'first_salary.effective_on': 'hire_date',
        }),
      )
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        {stale && employee && (
          <Alert color="orange" icon={<IconRefresh size={18} />} title="This employee was changed by someone else">
            <Stack gap="xs" align="flex-start">
              <Text size="sm">Load the latest details, then make your change again.</Text>
              <Button
                size="xs"
                variant="white"
                color="orange"
                // Enabled once the refreshed employee has arrived.
                loading={employee.lock_version === lockVersion}
                onClick={() => {
                  form.setValues(initialValues(meta, employee))
                  form.resetDirty()
                  setLockVersion(employee.lock_version)
                  setStale(false)
                }}
              >
                Load latest details
              </Button>
            </Stack>
          </Alert>
        )}
        {formError && (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} role="alert">
            {formError}
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <TextInput label="First name" required autoComplete="off" data-autofocus {...form.getInputProps('first_name')} />
          <TextInput label="Last name" required autoComplete="off" {...form.getInputProps('last_name')} />
        </SimpleGrid>
        <TextInput
          label="Work email"
          required
          type="email"
          autoComplete="off"
          description="Must be unique. Stored in lowercase."
          {...form.getInputProps('email')}
        />

        <Divider label="Role" labelPosition="left" />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <Autocomplete
            label="Job title"
            required
            data={meta.job_titles}
            description="Pick an existing title or type a new one."
            {...form.getInputProps('job_title')}
          />
          <Autocomplete
            label="Department"
            required
            data={meta.departments}
            description="Pick an existing department or type a new one."
            {...form.getInputProps('department')}
          />
          <Select
            label="Country"
            required
            searchable
            placeholder="Choose a country"
            data={meta.countries.map((c) => ({ value: c.code, label: c.name }))}
            {...form.getInputProps('country_code')}
            onChange={(code) => {
              form.setFieldValue('country_code', code)
              if (!editing && !currencyChosen) form.setFieldValue('currency', countryCurrency(code))
            }}
          />
          <Select
            label="Employment type"
            required
            allowDeselect={false}
            data={meta.employment_types.map((t) => ({ value: t, label: EMPLOYMENT_TYPE_LABELS[t] }))}
            {...form.getInputProps('employment_type')}
          />
        </SimpleGrid>
        <DateField
          label="Joining date"
          required
          maxDate={meta.today}
          description={
            editing
              ? 'If the first salary record starts on the joining date, it moves with it.'
              : 'Defaults to today. It is also the date the starting salary takes effect.'
          }
          {...form.getInputProps('hire_date')}
        />

        {editing && form.values.country_code !== employee?.country_code && (
          <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />}>
            Changing the country keeps every salary record, including any scheduled change, in its current currency.
          </Alert>
        )}

        {!editing && (
          <>
            <Divider label="Starting salary" labelPosition="left" />
            <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
              <Select
                label="Currency"
                required
                allowDeselect={false}
                data={meta.currencies.map((c) => c.code)}
                description="Follows the country."
                {...form.getInputProps('currency')}
                onChange={(currency) => {
                  setCurrencyChosen(true)
                  form.setFieldValue('currency', currency)
                }}
              />
              <NumberInput
                style={{ gridColumn: 'span 2' }}
                label="Annual base salary"
                required
                min={0}
                allowNegative={false}
                decimalScale={zeroDecimal(form.values.currency) ? 0 : 2}
                thousandSeparator=","
                hideControls
                leftSection={<Text size="xs" fw={600} c="dimmed">{form.values.currency}</Text>}
                leftSectionWidth={48}
                description={
                  form.values.hire_date
                    ? `Effective from ${formatDate(form.values.hire_date)}, the joining date.`
                    : 'Effective from the joining date.'
                }
                {...form.getInputProps('salary')}
              />
            </SimpleGrid>
          </>
        )}

        <Group justify="flex-end" gap="sm" mt="xs">
          <Button variant="default" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? 'Save changes' : 'Add employee'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

function required(value: string, label: string) {
  return value.trim() ? null : `${label} is required`
}

function maxLength(value: string, max: number) {
  return value.trim().length > max ? `Use ${max} characters or fewer` : null
}
