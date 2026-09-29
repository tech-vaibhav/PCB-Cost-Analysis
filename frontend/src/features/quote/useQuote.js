import { useCallback, useEffect, useState } from 'react'
import { getOptions, getQuote } from '../../api/quote'
import { initialQuote, snapToOption, toQuoteBody } from './defaults'

const UNREACHABLE = 'Pricing service is unreachable. Please try again shortly.'

export function useOptions(onLoad) {
  const [options, setOptions] = useState(null)
  const [error, setError] = useState(null)
  const load = useCallback(() => {
    setError(null)
    getOptions()
      .then((o) => { setOptions(o); onLoad(initialQuote(o)) })
      .catch((e) => setError(e.status ? e.message : UNREACHABLE))
  }, [onLoad])
  useEffect(load, [load])
  return { options, error, retry: load }
}

export default function useQuote() {
  const [values, setValues] = useState(null)
  const { options, error: optionsError, retry } = useOptions(setValues)
  const [autoFields, setAutoFields] = useState({})
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const body = values && toQuoteBody(values)
    if (!(body?.boardW > 0 && body.boardL > 0 && body.quantity > 0)) {
      setQuote(null)
      setError(null)
      setLoading(false)
      return
    }
    let live = true
    const t = setTimeout(() => {
      setLoading(true)
      getQuote(body)
        .then((q) => { if (live) { setQuote(q); setError(null) } })
        .catch((e) => { if (live) { setQuote(null); setError(e.status ? e.message : UNREACHABLE) } })
        .finally(() => { if (live) setLoading(false) })
    }, 400)
    return () => { live = false; clearTimeout(t) }
  }, [values])

  const setValue = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }))
    setAutoFields((a) => ({ ...a, [key]: false }))
  }

  const applyGerber = (parsed) => {
    if (!options) return
    const next = {}
    const { width_mm, height_mm } = parsed.dimensions ?? {}
    if (width_mm > 0 && height_mm > 0) Object.assign(next, { boardW: width_mm.toFixed(2), boardL: height_mm.toFixed(2) })
    if (parsed.copper_layer_count > 0) next.layers = snapToOption(parsed.copper_layer_count, options.layers)
    if (parsed.drill?.min_drill_mm > 0) next.minHole = snapToOption(parsed.drill.min_drill_mm, options.minHole)
    setValues((v) => ({ ...v, ...next }))
    setAutoFields(Object.fromEntries(Object.keys(next).map((k) => [k, true])))
  }

  const reset = () => { if (options) setValues(initialQuote(options)); setAutoFields({}) }

  return { values, setValue, options, optionsError, retry, quote, loading, error, autoFields, applyGerber, reset }
}
