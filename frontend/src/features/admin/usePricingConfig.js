import { useCallback, useEffect, useRef, useState } from 'react'
import { getPricing, putPricing } from '../../api/admin'

const SECTIONS = ['rates', 'lookups', 'constants']
const pick = (d) => structuredClone({ rates: d.rates, lookups: d.lookups, constants: d.constants })
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const countChanges = (a, b) =>
  SECTIONS.reduce((n, s) => n + Object.keys({ ...a[s], ...b[s] }).filter((k) => !same(a[s][k], b[s][k])).length, 0)

export default function usePricingConfig(token, onUnauthorized) {
  const [server, setServer] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const tokenRef = useRef(token)
  useEffect(() => { tokenRef.current = token }, [token])

  const run = useCallback(async (call) => {
    setBusy(true)
    setError(null)
    try {
      const data = await call(tokenRef.current)
      setServer(data)
      setDraft(pick(data))
      return true
    } catch (e) {
      if (e.status === 401) onUnauthorized()
      setError(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }, [onUnauthorized])

  useEffect(() => { run(getPricing) }, [run])

  const changes = server && draft ? countChanges(pick(server), draft) : 0
  const dirty = changes > 0

  useEffect(() => {
    if (!dirty) return
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (!justSaved) return
    const t = setTimeout(() => setJustSaved(false), 2000)
    return () => clearTimeout(t)
  }, [justSaved])

  const edit = (fn) => setDraft((d) => { const n = structuredClone(d); fn(n); return n })

  return {
    draft, error, busy, dirty, changes, justSaved,
    updatedAt: server?.updatedAt,
    reload: () => run(getPricing),
    setRate: (k, v) => edit((d) => { d.rates[k] = v }),
    setConstant: (k, v) => edit((d) => { d.constants[k] = v }),
    setLookup: (name, opt, v) => edit((d) => { d.lookups[name][opt] = v }),
    // Arrays: string lists push `option`, autoMarkup pushes [option, value] and stays sorted by ceiling.
    addLookupOption: (name, opt, v) => edit((d) => {
      const l = d.lookups[name]
      if (!Array.isArray(l)) l[opt] = v
      else if (v === undefined) l.push(opt)
      else { l.push([opt, v]); l.sort((a, b) => a[0] - b[0]) }
    }),
    // Maps remove by key, arrays by index.
    removeLookupOption: (name, opt) => edit((d) => {
      const l = d.lookups[name]
      if (Array.isArray(l)) l.splice(opt, 1)
      else delete l[opt]
    }),
    setCompetitor: (name, field, v) => edit((d) => { d.lookups.competitors.find((c) => c.name === name)[field] = v }),
    setCompetitorParam: (name, param, v) => edit((d) => { d.lookups.competitors.find((c) => c.name === name).params[param] = v }),
    setAutoMarkupRow: (i, ceiling, fraction) => edit((d) => { d.lookups.autoMarkup[i] = [ceiling, fraction] }),
    discard: () => setDraft(pick(server)),
    save: async () => { if (await run((t) => putPricing(t, draft))) setJustSaved(true) },
  }
}
