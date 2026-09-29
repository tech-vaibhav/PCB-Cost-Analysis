import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { AlertCircle, Target, TrendingUp } from 'lucide-react'
import { Badge, Card, Field, Input, Spinner, Stat, ToggleGroup } from '../../components/ui'
import { adminQuote } from '../../api/admin'
import { getOptions } from '../../api/quote'
import { DEFAULT_OPTIONS, DEFAULT_QUOTE, toQuoteBody } from '../quote/defaults'
import QuoteForm from '../quote/QuoteForm'
import { inr, inrRound, pct } from '../../lib/format'

const LAB_DEFAULT = { ...DEFAULT_QUOTE, boardW: '130', boardL: '80', quantity: '275' }
const FAB = [{ value: '', label: 'Saved' }, { value: 'outsource', label: 'Outsource' }, { value: 'inhouse', label: 'In-house' }]
const count = (n) => new Intl.NumberFormat('en-IN').format(Math.round(n))
const th = 'py-2 pr-3 text-left text-[11px] font-medium uppercase tracking-wide text-slate-400 whitespace-nowrap'
const td = 'py-2 pr-3 tabular-nums whitespace-nowrap'

export default function QuoteLabPage() {
  const { token, signOut } = useOutletContext()
  const [values, setValues] = useState(LAB_DEFAULT)
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [fab, setFab] = useState('')
  const [markup, setMarkup] = useState('')
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { getOptions().then((o) => setOptions({ ...DEFAULT_OPTIONS, ...o })).catch(() => {}) }, [])

  useEffect(() => {
    const body = toQuoteBody(values)
    if (!(body.boardW > 0 && body.boardL > 0 && body.quantity > 0)) return
    const rates = { ...(fab && { fabSource: fab }), ...(markup !== '' && { markupOverridePct: Number(markup) }) }
    if (Object.keys(rates).length) body.overrides = { rates }
    let live = true
    const t = setTimeout(() => {
      setLoading(true)
      adminQuote(token, body)
        .then((q) => { if (live) { setQuote(q); setError(null) } })
        .catch((e) => { if (live) { if (e.status === 401) signOut(); setError(e.status ? e.message : 'Pricing service is unreachable.') } })
        .finally(() => { if (live) setLoading(false) })
    }, 400)
    return () => { live = false; clearTimeout(t) }
  }, [values, fab, markup, token, signOut])

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
      <div className="flex flex-col gap-4">
        <Card title="What-if overrides" description="Applied to this quote only, never saved">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bare board source"><ToggleGroup size="sm" options={FAB} value={fab} onChange={setFab} /></Field>
            <Field label="Markup" htmlFor="lab-markup" hint="Empty uses the saved policy">
              <Input id="lab-markup" type="number" step="any" inputMode="decimal" suffix="%" placeholder="Saved" value={markup} onChange={(e) => setMarkup(e.target.value)} />
            </Field>
          </div>
        </Card>
        <QuoteForm values={values} options={options} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} />
      </div>

      <div className="flex flex-col gap-4 xl:sticky xl:top-20">
        {error && <Card><p role="alert" className="flex items-start gap-2 text-sm text-red-600"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p></Card>}
        {!quote ? (!error &&
          <Card><div className="grid place-items-center py-16 text-sm text-slate-500">{loading ? <Spinner /> : 'Enter board size and quantity to price.'}</div></Card>
        ) : (
          <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <Result q={quote} />
          </div>
        )}
      </div>
    </div>
  )
}

function Result({ q }) {
  const mode = q.pricingMode === 'auto-beat'
    ? <Badge tone="success" icon={Target}>Auto-beat: {+q.savings.pct.toFixed(1)}% below {q.cheapest.name}</Badge>
    : <Badge tone="info" icon={TrendingUp}>Markup {+q.markupPct.toFixed(2)}%</Badge>
  const monthly = [['Labour', inrRound(q.monthly.labour)], ['Energy', inrRound(q.monthly.energy)], ['Overheads', inrRound(q.monthly.overheads)], ['Power use', `${count(q.monthly.kwh)} kWh`]]

  return (
    <>
      <Card title="Price" action={mode}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat hero label="Your price" value={inr(q.pricePerBoard)} detail={`List ${inr(q.listPerBoard)}`} />
          <Stat label="Cost" value={inr(q.costPerBoard)} detail="per board" />
          <Stat label="Profit" value={inr(q.profit.perBoard)} detail={`${pct(q.profit.marginPct)} margin`} tone={q.profit.perBoard >= 0 ? 'good' : 'bad'} />
          <Stat label="Total incl GST" value={inrRound(q.total)} detail={`${q.quantity} boards`} />
        </div>
      </Card>

      <Card title="Competitors" description="Per board, landed in India">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100"><tr>{['Supplier', 'Bare', 'Landed', 'Total incl GST', 'vs us'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {q.competitors.map((c) => {
                const diff = c.landed - q.pricePerBoard
                return (
                  <tr key={c.name} className={c.name === q.cheapest.name ? 'bg-slate-50' : ''}>
                    <td className={`${td} font-medium text-slate-800`} title={c.note}>{c.name}</td>
                    <td className={td}>{inr(c.bare)}</td>
                    <td className={td}>{inr(c.landed)}</td>
                    <td className={td}>{inrRound(c.total)}</td>
                    <td className={`${td} ${diff >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{diff >= 0 ? '+' : ''}{inr(diff)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Cost heads" description={`Per board, ${inr(q.costPerBoard)} total`}>
        <ul className="flex flex-col gap-2.5">
          {q.costHeads.filter((h) => h.amount).map((h) => (
            <li key={h.item} className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] items-center gap-x-3 gap-y-1 text-sm">
              <span className="truncate text-slate-700">{h.item}</span>
              <span className="tabular-nums text-slate-900">{inr(h.amount)}</span>
              <span className="tabular-nums text-right text-xs text-slate-500">{pct(h.sharePct)}</span>
              <span className="col-span-3 h-1 rounded-full bg-emerald-500/70" style={{ width: `${Math.min(Math.max(h.sharePct, 0), 100)}%` }} />
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Monthly">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {monthly.map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="text-sm font-medium tabular-nums">{v}</dd></div>)}
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          {q.breakEvenBoards != null
            ? `About ${count(q.breakEvenBoards)} boards a month at the auto-beat price cover fixed monthly costs.`
            : 'No break-even: the auto-beat price does not cover material and packaging.'}
        </p>
      </Card>
    </>
  )
}
