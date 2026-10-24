import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

export const DATE_INPUT_FORMAT = 'D MMM YYYY'

// Lets HR type a date as "3 Nov 2026", "03/11/2026" or "2026-11-03".
// Returns "YYYY-MM-DD", or null when the text isn't a date.
export function parseDateInput(text: string): string | null {
  const parsed = dayjs(text.trim(), [DATE_INPUT_FORMAT, 'D MMMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], true)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null
}
