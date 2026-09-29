import { request } from './client'

export const getPricing = (token) => request('/api/admin/pricing', { token })
export const putPricing = (token, body) => request('/api/admin/pricing', { method: 'PUT', body, token })
export const resetPricing = (token) => request('/api/admin/pricing/reset', { method: 'POST', token })
export const adminQuote = (token, body) => request('/api/admin/quote', { method: 'POST', body, token })
