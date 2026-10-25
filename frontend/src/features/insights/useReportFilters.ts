import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { InsightFilterKey } from '../../api/types'

// Each report keeps its own filters in the URL under a prefix
// (e.g. "dept.country_code"), so filtering one report never changes another.
export function useReportFilters(prefix: string, keys: readonly InsightFilterKey[]) {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(
    () =>
      Object.fromEntries(
        keys.flatMap((key) => {
          const value = searchParams.get(`${prefix}.${key}`)
          return value ? [[key, value]] : []
        }),
      ) as Partial<Record<InsightFilterKey, string>>,
    [searchParams, prefix, keys],
  )

  const update = useCallback(
    (changes: Partial<Record<InsightFilterKey, string | undefined>>) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          for (const [key, value] of Object.entries(changes)) {
            if (value) params.set(`${prefix}.${key}`, value)
            else params.delete(`${prefix}.${key}`)
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams, prefix],
  )

  const clear = useCallback(
    () => update(Object.fromEntries(keys.map((key) => [key, undefined]))),
    [update, keys],
  )

  return { filters, update, clear, active: Object.keys(filters).length > 0 }
}
