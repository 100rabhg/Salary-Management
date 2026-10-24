import { DateInput, type DateInputProps } from '@mantine/dates'
import { IconCalendar } from '@tabler/icons-react'
import { DATE_INPUT_FORMAT, parseDateInput } from '../lib/dates'

// A date picker that also accepts typed dates. Its value is "YYYY-MM-DD".
export function DateField(props: DateInputProps) {
  return (
    <DateInput
      valueFormat={DATE_INPUT_FORMAT}
      dateParser={parseDateInput}
      placeholder="e.g. 3 Nov 2026"
      leftSection={<IconCalendar size={16} aria-hidden />}
      popoverProps={{ withinPortal: true }}
      firstDayOfWeek={1}
      {...props}
    />
  )
}
