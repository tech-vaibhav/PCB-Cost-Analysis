import { request } from './client'

export const signup = (body) => request('/api/auth/signup', { method: 'POST', body })
export const signin = (body) => request('/api/auth/signin', { method: 'POST', body })
export const me = (token) => request('/api/auth/me', { token })
