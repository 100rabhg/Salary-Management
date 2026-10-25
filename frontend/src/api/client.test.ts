import { describe, expect, it, vi } from 'vitest'
import { config } from '../config'
import { ApiError, apiUrl, request } from './client'

function stubFetch(response: Response | (() => never)) {
  const fetchMock = vi.fn(async () => (typeof response === 'function' ? response() : response))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

async function caught(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the request to fail')
}

describe('apiUrl', () => {
  it('prefixes /api/v1 and leaves out empty query values', () => {
    expect(apiUrl('/employees', { q: '', page: 2, country_code: undefined })).toBe(
      `${config.apiBaseUrl}/api/v1/employees?page=2`,
    )
  })
})

describe('request', () => {
  it('sends a JSON body and returns the parsed response', async () => {
    const fetchMock = stubFetch(json(201, { id: 7 }))

    await expect(request('/employees', { method: 'POST', body: { first_name: 'Ada' } })).resolves.toEqual({ id: 7 })
    expect(fetchMock).toHaveBeenCalledWith(`${config.apiBaseUrl}/api/v1/employees`, expect.objectContaining({
      method: 'POST',
      body: '{"first_name":"Ada"}',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    }))
  })

  it('returns nothing for 204 No Content', async () => {
    stubFetch(new Response(null, { status: 204 }))

    await expect(request('/employees/7', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it("turns the API's error payload into an ApiError", async () => {
    stubFetch(json(409, { error: { code: 'stale_record', message: 'Someone else changed this.', details: {} } }))

    const error = await caught(request('/employees/7'))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, code: 'stale_record', message: 'Someone else changed this.', isStale: true })
  })

  it('keeps per-field validation details', async () => {
    stubFetch(json(422, { error: { code: 'validation_failed', message: 'Invalid', details: { email: ['is invalid'] } } }))

    expect(await caught(request('/employees'))).toMatchObject({ code: 'validation_failed', details: { email: ['is invalid'] } })
  })

  it('reports a server error when the error response is not JSON', async () => {
    stubFetch(new Response('<h1>Bad gateway</h1>', { status: 502 }))

    expect(await caught(request('/employees'))).toMatchObject({
      status: 502,
      code: 'server_error',
      message: 'The server returned an error (502). Try again in a moment.',
      isStale: false,
    })
  })

  it('reports a network error when the server cannot be reached', async () => {
    stubFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    expect(await caught(request('/employees'))).toMatchObject({ status: 0, code: 'network_error' })
  })

  it('rethrows an aborted request unchanged', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    stubFetch(() => {
      throw abort
    })

    expect(await caught(request('/employees'))).toBe(abort)
  })
})
