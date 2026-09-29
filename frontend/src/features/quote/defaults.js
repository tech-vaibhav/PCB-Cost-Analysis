export const initialQuote = ({ specials, ...lists }) => ({
  ...Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, v[0]])),
  boardW: '', boardL: '', quantity: '',
  specials: Object.fromEntries(specials.map((k) => [k, false])),
})

export const snapToOption = (value, options) =>
  options.reduce((best, o) => (Math.abs(o - value) < Math.abs(best - value) ? o : best))

export const toQuoteBody = (v) => ({ ...v, boardW: Number(v.boardW), boardL: Number(v.boardL), quantity: Number(v.quantity) })
