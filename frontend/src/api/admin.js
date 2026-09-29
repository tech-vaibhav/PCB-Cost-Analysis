import { request } from './client'

const user = (id) => `/api/admin/users/${encodeURIComponent(id)}`

export const getPricing = (token) => request('/api/admin/pricing', { token })
export const putPricing = (token, body) => request('/api/admin/pricing', { method: 'PUT', body, token })
export const adminQuote = (token, body) => request('/api/admin/quote', { method: 'POST', body, token })
export const getUsers = (token) => request('/api/admin/users', { token })
export const approveUser = (token, id) => request(`${user(id)}/approve`, { method: 'POST', token })
export const deleteUser = (token, id) => request(user(id), { method: 'DELETE', token })
