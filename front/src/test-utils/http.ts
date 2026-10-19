import { AxiosError, AxiosHeaders } from 'axios'

export function httpError(status: number, error?: string) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: error === undefined ? '' : { error },
  })
}
