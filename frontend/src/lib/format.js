const inrFmt = (digits) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const inr = (v, digits = 2) => (v == null || Number.isNaN(v) ? '-' : `₹${inrFmt(digits).format(v)}`)
export const inrRound = (v) => inr(v == null ? v : Math.round(v), 0)
export const pct = (v, digits = 1) => (v == null ? '-' : `${Number(v).toFixed(digits)}%`)
export const num = (v) => (v == null ? '' : String(v))

const UNITS = [['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]]
export const ago = (iso) => {
  const s = (new Date(iso) - Date.now()) / 1000
  const [unit, size] = UNITS.find(([, d]) => Math.abs(s) >= d) ?? UNITS[3]
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round(s / size), unit)
}
export const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never')
