import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { apiErrorMessage, apiStatus } from '../errors'

function axiosError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('fail', 'ERR', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  })
}

describe('apiErrorMessage', () => {
  it('returns the backend error message', () => {
    expect(apiErrorMessage(axiosError(400, { error: 'name must not be blank' }), 'x')).toBe('name must not be blank')
  })

  it('falls back when the body has no usable message', () => {
    expect(apiErrorMessage(axiosError(500, 'oops'), 'Failed')).toBe('Failed')
    expect(apiErrorMessage(axiosError(500, { error: '  ' }), 'Failed')).toBe('Failed')
    expect(apiErrorMessage(axiosError(500, { error: 42 }), 'Failed')).toBe('Failed')
  })

  it('falls back for non-axios errors', () => {
    expect(apiErrorMessage(new Error('boom'), 'Failed')).toBe('Failed')
    expect(apiErrorMessage(undefined, 'Failed')).toBe('Failed')
  })
})

describe('apiStatus', () => {
  it('reads the response status', () => {
    expect(apiStatus(axiosError(413, { error: 'Request body too large' }))).toBe(413)
  })

  it('is undefined without a response', () => {
    expect(apiStatus(new Error('network'))).toBeUndefined()
  })
})
