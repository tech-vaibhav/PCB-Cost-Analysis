import { request } from './client'

export function parseGerber(file) {
  const body = new FormData()
  body.append('file', file)
  return request('/api/gerber/parse', { method: 'POST', body })
}
