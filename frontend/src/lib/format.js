const inrFmt = (digits) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const inr = (v, digits = 2) => (v == null || Number.isNaN(v) ? '-' : `₹${inrFmt(digits).format(v)}`)
export const inrRound = (v) => inr(v == null ? v : Math.round(v), 0)
export const pct = (v, digits = 1) => (v == null ? '-' : `${Number(v).toFixed(digits)}%`)
export const num = (v) => (v == null ? '' : String(v))
