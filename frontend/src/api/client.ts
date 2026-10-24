import { config } from '../config'

export type FieldErrors = Record<string, string[]>

// Every non-2xx response, and a failed connection, becomes an ApiError with
// the API's error code, a readable message and per-field details.
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: FieldErrors

  constructor(status: number, code: string, message: string, details: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  get isStale() {
    return this.code === 'stale_record'
  }
}

type Query = Record<string, string | number | undefined>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

export function apiUrl(path: string, query: Query = {}) {
  const url = new URL(`${config.apiBaseUrl}/api/v1${path}`)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  return url.toString()
}

export async function request<T>(path: string, { method = 'GET', query, body, signal }: RequestOptions = {}) {
  let response: Response
  try {
    response = await fetch(apiUrl(path, query), {
      method,
      signal,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'network_error', "Can't reach the server. Check your connection and try again.")
  }

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const error = payload?.error
    throw new ApiError(
      response.status,
      error?.code ?? 'server_error',
      error?.message ?? `The server returned an error (${response.status}). Try again in a moment.`,
      error?.details ?? {},
    )
  }
  return payload as T
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}
