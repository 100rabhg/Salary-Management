import { ApiError } from '../api/client'

// Puts each server validation message under its form field, so the user
// sees it where they need to fix it. fieldMap renames API fields to form
// fields (e.g. "first_salary.salary" -> "salary"). Returns the message to
// show at the top of the form for anything that has no field.
export function applyServerErrors(
  error: unknown,
  setErrors: (errors: Record<string, string>) => void,
  formFields: string[],
  fieldMap: Record<string, string> = {},
): string | null {
  if (!(error instanceof ApiError) || error.code !== 'validation_failed') {
    return error instanceof Error ? error.message : 'Something went wrong. Try again.'
  }

  const fieldErrors: Record<string, string> = {}
  const unplaced: string[] = []
  for (const [apiField, messages] of Object.entries(error.details)) {
    const field = fieldMap[apiField] ?? apiField
    if (formFields.includes(field)) fieldErrors[field] = sentence(messages[0]!)
    else unplaced.push(...messages)
  }
  setErrors(fieldErrors)
  if (unplaced.length > 0) return unplaced.map(sentence).join(' ')
  return Object.keys(fieldErrors).length > 0 ? null : error.message
}

function sentence(message: string) {
  return message.charAt(0).toUpperCase() + message.slice(1)
}
