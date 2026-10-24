import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { DirectoryParams, DirectorySort } from '../../api/types'

export const PAGE_SIZES = [10, 25, 50, 100]
const DEFAULT_PAGE_SIZE = 25
const SORTS: DirectorySort[] = ['name', 'job_title', 'country', 'hire_date', 'salary', 'created_at']
export const FILTER_KEYS = ['country_code', 'department', 'job_title', 'employment_type'] as const
export type FilterKey = (typeof FILTER_KEYS)[number]

// The directory's search, filters, sort and page live in the URL, so a view
// can be bookmarked or shared and the browser's Back button restores it.
export function useDirectoryParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo<DirectoryParams>(() => {
    const page = Number(searchParams.get('page'))
    const perPage = Number(searchParams.get('per_page'))
    const sort = searchParams.get('sort') as DirectorySort
    return {
      q: searchParams.get('q') ?? undefined,
      page: Number.isInteger(page) && page > 0 ? page : 1,
      per_page: PAGE_SIZES.includes(perPage) ? perPage : DEFAULT_PAGE_SIZE,
      sort: SORTS.includes(sort) ? sort : 'name',
      direction: searchParams.get('direction') === 'desc' ? 'desc' : 'asc',
      ...Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? undefined])),
    }
  }, [searchParams])

  // Any change other than the page itself starts again from page 1.
  const update = useCallback(
    (changes: Partial<Record<keyof DirectoryParams, string | number | undefined>>) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === '' || value === null) next.delete(key)
            else next.set(key, String(value))
          }
          if (!('page' in changes)) next.delete('page')
          return next
        },
        { replace: !('page' in changes) },
      )
    },
    [setSearchParams],
  )

  const clearFilters = useCallback(() => {
    update({ q: undefined, ...Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined])) })
  }, [update])

  const hasFilters = Boolean(params.q) || FILTER_KEYS.some((key) => params[key])

  return { params, update, clearFilters, hasFilters, search: searchParams.toString() }
}
