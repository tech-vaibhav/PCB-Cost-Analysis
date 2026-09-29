import { request } from './client'

export const getOptions = () => request('/api/pricing/options')
export const getQuote = (body) => request('/api/quote', { method: 'POST', body })
