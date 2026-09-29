import { FileCheck2 } from 'lucide-react'
import { Badge, Button, Card, Field, Input, Select, Spinner, ToggleGroup } from '../../components/ui'

const SWATCH = { Green: '#1f7a45', Blue: '#1d4ed8', Red: '#b91c1c', Black: '#1e293b', White: '#f8fafc', Yellow: '#eab308', Purple: '#7e22ce' }
const SPECIALS = {
  impedance: 'Impedance control',
  blindVias: 'Blind / buried vias',
  goldFingers: 'Gold fingers',
  halfHole: 'Castellated holes',
  resinPlug: 'Resin plugged vias',
  metalEdge: 'Edge plating',
  halogenFree: 'Halogen free',
}

export default function QuoteForm({ values, onChange, options, error, onRetry, autoFields = {} }) {
  if (error) return <Card title="Could not load quote options" description={error}><Button variant="secondary" onClick={onRetry}>Retry</Button></Card>
  if (!options || !values) return <div className="grid place-items-center py-24"><Spinner /></div>
  const field = (key, label, control, isToggle) => (
    <Field
      key={key}
      label={label}
      htmlFor={isToggle ? undefined : `q-${key}`}
      badge={autoFields[key] && <Badge tone="success" icon={FileCheck2}>From Gerber</Badge>}
      className={autoFields[key] ? 'rounded-lg p-2 -m-2 ring-1 ring-emerald-300 bg-emerald-50/40' : ''}
    >
      {isToggle ? <div role="group" aria-label={label}>{control}</div> : control}
    </Field>
  )
  const toggle = (key, label, opts = options[key]) =>
    field(key, label, <ToggleGroup options={opts} value={values[key]} onChange={(v) => onChange(key, v)} />, true)
  const select = (key, label, opts = options[key]) =>
    field(key, label, <Select id={`q-${key}`} options={opts} value={values[key]} onChange={(e) => onChange(key, e.target.value)} />)
  const number = (key, label, suffix, inputMode = 'decimal') =>
    field(key, label, (
      <Input id={`q-${key}`} type="number" min="0" step="any" inputMode={inputMode} suffix={suffix} placeholder="0"
        value={values[key]} onChange={(e) => onChange(key, e.target.value)} />
    ))

  const setMask = (color) => {
    onChange('maskColor', color)
    const flip = { White: 'Black', Black: 'White' }[color]
    if (flip && values.silkscreen === color) onChange('silkscreen', flip)
  }

  const section = (title, children) => (
    <Card title={title}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">{children}</div>
    </Card>
  )

  return (
    <div className="flex flex-col gap-4">
      {section('Board', <>
        <div className="sm:col-span-2">{toggle('orderType', 'Order type')}</div>
        {number('boardW', 'Width', 'mm')}
        {number('boardL', 'Length', 'mm')}
        {number('quantity', 'Quantity', 'pcs', 'numeric')}
        {toggle('layers', 'Layers')}
      </>)}
      {section('Build', <>
        {select('thickness', 'Thickness', options.thickness.map((t) => ({ value: t, label: `${t} mm` })))}
        {select('copper', 'Copper weight', options.copper.map((c) => ({ value: c, label: `${c} oz` })))}
        {select('material', 'Material')}
        {select('finish', 'Surface finish')}
      </>)}
      {section('Appearance', <>
        <div className="sm:col-span-2">
          {field('maskColor', 'Solder mask', (
            <ToggleGroup size="sm" value={values.maskColor} onChange={setMask}
              options={options.maskColor.map((c) => ({ value: c, label: c, color: SWATCH[c] ?? '#94a3b8' }))} />
          ), true)}
        </div>
        <div className="sm:col-span-2">{toggle('silkscreen', 'Silkscreen')}</div>
      </>)}
      {section('Process', <>
        {toggle('traceSpace', 'Min trace / space (mil)')}
        {toggle('minHole', 'Min hole (mm)')}
        {toggle('ipcStd', 'IPC class')}
        {toggle('testing', 'Electrical test')}
        {toggle('express', 'Production speed')}
      </>)}
      <Card title="Extras" description="Special requirements add to the board price">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.specials.map((k) => (
            <label key={k} className="flex items-center justify-between gap-3 h-11 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 has-checked:border-emerald-300 has-checked:bg-emerald-50/50">
              {SPECIALS[k] ?? k}
              <input type="checkbox" className="w-4 h-4 accent-emerald-600" checked={!!values.specials[k]}
                onChange={(e) => onChange('specials', { ...values.specials, [k]: e.target.checked })} />
            </label>
          ))}
        </div>
      </Card>
    </div>
  )
}
