import { keepPreviousData, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ApiError, request } from './client'
import type {
  CountrySalaryDistribution,
  CurrentRates,
  DepartmentCosts,
  InsightsSummary,
  ReportParams,
  RoleSalaryRanges,
} from './types'

export const insightKeys = {
  rates: ['exchange_rates', 'current'] as const,
  reports: ['insights'] as const,
  report: (name: string, params: ReportParams) => ['insights', name, params] as const,
}

// The rate set every report on a page converts with. It is fetched once and
// kept (staleTime: Infinity), so reports can't drift onto different rates;
// "Check for newer rates" refetches it on purpose.
export function useCurrentRates() {
  return useQuery({
    queryKey: insightKeys.rates,
    queryFn: ({ signal }) => request<CurrentRates>('/exchange_rates/current', { signal }),
    staleTime: Infinity,
  })
}

/** The rates_token to send: the pinned token, "none" when there are no rates, or undefined if unknown. */
export function pinnedRatesToken(rates: CurrentRates | undefined) {
  if (!rates) return undefined
  return rates.rate_set ? rates.rate_set.token : 'none'
}

// The server's in-memory rate cache no longer holds the pinned set (it
// restarted). Fetch the current rates once, which re-pins every report on
// the page. Identical rates get the same token, so reports already keyed by
// it are rerun too. One re-pin runs at a time, and each token is re-pinned
// automatically at most once a minute, so a server that keeps losing the set
// leaves the error and its Retry button on screen instead of looping.
let repinning: Promise<unknown> | null = null
const lastRepin = new Map<string, number>()
const REPIN_INTERVAL_MS = 60_000

function repin(queryClient: QueryClient, failedToken: string) {
  const now = Date.now()
  if (repinning || now - (lastRepin.get(failedToken) ?? -Infinity) < REPIN_INTERVAL_MS) return
  lastRepin.set(failedToken, now)
  repinning = queryClient
    .refetchQueries({ queryKey: insightKeys.rates })
    .then(() => {
      const token = pinnedRatesToken(queryClient.getQueryData<CurrentRates>(insightKeys.rates))
      return queryClient.invalidateQueries({
        queryKey: insightKeys.reports,
        predicate: (query) => (query.queryKey[2] as ReportParams | undefined)?.rates_token === token,
      })
    })
    .finally(() => {
      repinning = null
    })
}

function useReport<T>(name: string, params: ReportParams, enabled: boolean) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: insightKeys.report(name, params),
    queryFn: async ({ signal }) => {
      try {
        return await request<T>(`/insights/${name}`, { signal, query: params })
      } catch (error) {
        if (error instanceof ApiError && error.code === 'unknown_rates_token' && params.rates_token) {
          repin(queryClient, params.rates_token)
        }
        throw error
      }
    },
    enabled,
    // Keep the previous figures on screen while a new currency or filter loads.
    placeholderData: keepPreviousData,
  })
}

export const useInsightsSummary = (params: ReportParams, enabled: boolean) =>
  useReport<InsightsSummary>('summary', params, enabled)

export const useDepartmentCosts = (params: ReportParams, enabled: boolean) =>
  useReport<DepartmentCosts>('department_costs', params, enabled)

export const useRoleSalaryRanges = (params: ReportParams, enabled: boolean) =>
  useReport<RoleSalaryRanges>('role_salary_ranges', params, enabled)

export const useCountrySalaryDistribution = (params: ReportParams, enabled: boolean) =>
  useReport<CountrySalaryDistribution>('country_salary_distribution', params, enabled)
