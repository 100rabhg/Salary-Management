import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from './client'
import { insightKeys } from './insights'
import type {
  DirectoryParams,
  Employee,
  EmployeeInput,
  Meta,
  NewEmployeeInput,
  Page,
  SalaryRecord,
  SalaryRecordInput,
} from './types'

export const queryKeys = {
  meta: ['meta'] as const,
  employees: ['employees'] as const,
  directory: (params: DirectoryParams) => ['employees', 'directory', params] as const,
  employee: (id: number) => ['employees', 'detail', id] as const,
  salaries: (id: number) => ['employees', 'detail', id, 'salaries'] as const,
}

export function useMeta() {
  return useQuery({
    queryKey: queryKeys.meta,
    queryFn: ({ signal }) => request<Meta>('/meta', { signal }),
    staleTime: 5 * 60 * 1000,
  })
}

export function useDirectory(params: DirectoryParams) {
  return useQuery({
    queryKey: queryKeys.directory(params),
    queryFn: ({ signal }) =>
      request<Page<Employee>>('/employees', { signal, query: { ...params } }),
    // Keep showing the current page while the next one loads.
    placeholderData: keepPreviousData,
  })
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: queryKeys.employee(id),
    queryFn: ({ signal }) => request<Employee>(`/employees/${id}`, { signal }),
  })
}

export function useSalaryHistory(employeeId: number) {
  return useQuery({
    queryKey: queryKeys.salaries(employeeId),
    queryFn: ({ signal }) =>
      request<{ data: SalaryRecord[] }>(`/employees/${employeeId}/salaries`, { signal }).then(
        (response) => response.data,
      ),
  })
}

// Every write can change the directory, the profile, the salary history,
// the filter options and the insight reports, so it refreshes all of them.
// The pinned exchange-rate set is left alone.
function useInvalidateAll() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.employees }),
      queryClient.invalidateQueries({ queryKey: queryKeys.meta }),
      queryClient.invalidateQueries({ queryKey: insightKeys.reports }),
    ])
}

export function useCreateEmployee() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (employee: NewEmployeeInput) =>
      request<Employee>('/employees', { method: 'POST', body: { employee } }),
    onSuccess: invalidate,
  })
}

export function useUpdateEmployee(id: number) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (employee: EmployeeInput & { lock_version: number }) =>
      request<Employee>(`/employees/${id}`, { method: 'PATCH', body: { employee } }),
    onSettled: invalidate,
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => request<void>(`/employees/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.employee(id) })
      queryClient.invalidateQueries({ queryKey: insightKeys.reports })
      return queryClient.invalidateQueries({ queryKey: queryKeys.employees })
    },
  })
}

export function useSaveSalaryRecord(employeeId: number) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, ...salary_record }: SalaryRecordInput & { id?: number }) =>
      request<{ data: SalaryRecord[] }>(
        id ? `/employees/${employeeId}/salaries/${id}` : `/employees/${employeeId}/salaries`,
        { method: id ? 'PATCH' : 'POST', body: { salary_record } },
      ),
    onSettled: invalidate,
  })
}

export function useCancelSalaryRecord(employeeId: number) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (id: number) =>
      request<void>(`/employees/${employeeId}/salaries/${id}`, { method: 'DELETE' }),
    onSettled: invalidate,
  })
}
