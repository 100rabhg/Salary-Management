import type { SalaryRecord } from '../../api/types'
import { formatDate } from '../../lib/format'

export type Timing = 'scheduled' | 'today' | 'backdated' | 'historic'

// Explains, before saving, what a salary record with this effective date
// will do. `others` is the rest of the employee's history.
export function describeTiming(effectiveOn: string, today: string, others: SalaryRecord[]) {
  if (effectiveOn > today) {
    return {
      timing: 'scheduled' as Timing,
      message: `Scheduled for ${formatDate(effectiveOn)}. It can be edited or cancelled until then.`,
    }
  }
  if (effectiveOn === today) {
    return { timing: 'today' as Timing, message: 'Takes effect today and becomes the current salary.' }
  }
  const later = others
    .filter((record) => record.effective_on > effectiveOn && record.effective_on <= today)
    .sort((a, b) => b.effective_on.localeCompare(a.effective_on))[0]
  if (later) {
    return {
      timing: 'historic' as Timing,
      message: `Back-dated. It's added to the history; the record from ${formatDate(later.effective_on)} stays the current salary.`,
    }
  }
  return {
    timing: 'backdated' as Timing,
    message: `Back-dated. It becomes the current salary, effective from ${formatDate(effectiveOn)}.`,
  }
}

// The one pending record, ignoring the record being edited.
export function otherPendingRecord(history: SalaryRecord[], editingId?: number) {
  return history.find((record) => record.status === 'pending' && record.id !== editingId)
}
