import { Badge, InfoTip, Input, Switch, ToggleGroup } from '../../components/ui'
import LookupTable from './LookupTable'

const toNum = (v) => (v === '' ? '' : Number(v))
const toPct = (f) => +(f * 100).toFixed(4)
const MODELS = { usd_import: 'USD import', inr_domestic: 'INR domestic' }
// Info icon leads the label on phones so its popover stays on screen.
export const tipRow = 'flex items-center gap-1.5 max-sm:flex-row-reverse max-sm:justify-end'

export default function SettingRow({ id, label, help, hint, children }) {
  return (
    <div className="flex flex-col gap-2 py-3.5 border-b border-slate-100 last:border-0 sm:grid sm:grid-cols-[2fr_3fr] sm:items-center sm:gap-6">
      <div className="min-w-0">
        <div className={tipRow}>
          <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium text-slate-800">{label}</label>
          <InfoTip title={label} text={help} />
        </div>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function Lookup({ f, cfg }) {
  const { key, kind } = f
  const l = cfg.draft.lookups[key] ?? (kind === 'lookup' ? {} : [])
  const remove = (i, o) => cfg.removeLookupOption(key, kind === 'lookup' ? o : i)
  const props = {
    lookup: () => ({ rows: Object.entries(l), valueType: f.valueType ?? 'number', onChange: (_i, o, v) => cfg.setLookup(key, o, v), onAdd: (o, v) => cfg.addLookupOption(key, o, v) }),
    list: () => ({ rows: l.map((s) => [s]), valueType: null, onAdd: (o) => cfg.addLookupOption(key, o) }),
    ladder: () => ({
      rows: l.map(([q, v]) => [q, toPct(v)]), optionType: 'number', unit: '%',
      onChange: (i, q, p) => cfg.setAutoMarkupRow(i, q, p === '' ? '' : p / 100),
      onAdd: (q, p) => cfg.addLookupOption(key, q, p / 100),
    }),
  }[kind]()
  return (
    <div className="py-3.5 border-b border-slate-100 last:border-0">
      {f.label && (
        <div className={`${tipRow} mb-2`}>
          <h3 className="text-sm font-medium text-slate-800">{f.label}</h3>
          <InfoTip title={f.label} text={f.help} />
        </div>
      )}
      <LookupTable unit={f.unit} headers={f.headers} onRemove={remove} {...props} />
    </div>
  )
}

function Competitors({ cfg }) {
  return (cfg.draft.lookups.competitors ?? []).map((c, i) => (
    <div key={c.name} className="py-3.5 border-b border-slate-100 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{c.name}</h3>
        <Badge>{MODELS[c.model] ?? c.model}</Badge>
      </div>
      {c.note && <p className="mt-0.5 text-xs text-slate-500">{c.note}</p>}
      <SettingRow id={`bare-source-${i}`} label="Used as bare board source" help="Outsourced bare boards are bought from the cheapest competitor marked as a source.">
        <Switch id={`bare-source-${i}`} checked={!!c.isBareSource} onChange={(v) => cfg.setCompetitor(c.name, 'isBareSource', v)} />
      </SettingRow>
      <LookupTable rows={Object.entries(c.params)} headers={['Parameter', 'Value']} readOnlyOptions onChange={(_i, p, v) => cfg.setCompetitorParam(c.name, p, v)} />
    </div>
  ))
}

export function Setting({ f, cfg }) {
  if (f.kind === 'competitors') return <Competitors cfg={cfg} />
  if (!['rate', 'constant'].includes(f.kind)) return <Lookup f={f} cfg={cfg} />
  const [bag, set] = f.kind === 'rate' ? ['rates', cfg.setRate] : ['constants', cfg.setConstant]
  const value = cfg.draft[bag][f.key]
  const id = `${f.key}${f.control ?? ''}`
  const control = f.control === 'auto' ? <Switch id={id} checked={value == null} onChange={(v) => set(f.key, v ? null : 10)} />
    : f.control === 'switch' ? <Switch id={id} checked={!!value} onChange={(v) => set(f.key, v)} />
    : f.options ? <div role="group" aria-labelledby={`${id}-label`}><ToggleGroup options={f.options} value={value} onChange={(v) => set(f.key, v)} /></div>
    : <Input id={id} className="sm:max-w-80" type="number" inputMode="decimal" step="any" suffix={f.unit} value={value ?? ''} onChange={(e) => set(f.key, toNum(e.target.value))} />
  return <SettingRow id={id} label={f.label} help={f.help} hint={f.hint}>{control}</SettingRow>
}
