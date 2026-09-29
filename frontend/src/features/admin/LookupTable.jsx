import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button, Input, Switch } from '../../components/ui'

const parse = (type, v) => (type === 'boolean' ? !!v : type === 'number' && v !== '' ? Number(v) : v)
const iconBtn = 'inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900'

// rows: [[option, value], ...]. valueType 'number' | 'text' | 'boolean' | null (plain list). optionType 'number' makes the option editable.
export default function LookupTable({ rows, valueType = 'number', optionType = 'text', unit, headers = ['Option', 'Value'], readOnlyOptions, onChange, onRemove, onAdd }) {
  const [opt, setOpt] = useState('')
  const [val, setVal] = useState('')
  const grid = `${valueType ? 'grid-cols-[minmax(0,1fr)_minmax(0,12rem)]' : 'grid-cols-[minmax(0,1fr)_auto]'} sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`
  const taken = rows.some(([o]) => String(o) === opt.trim())
  const canAdd = opt.trim() && !taken && (!valueType || valueType === 'boolean' || val !== '')

  const add = (e) => {
    e.preventDefault()
    if (!canAdd) return
    onAdd(parse(optionType, opt.trim()), valueType ? parse(valueType, val) : undefined)
    setOpt('')
    setVal('')
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-0">
      <div className={`hidden sm:grid ${grid} gap-3 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400`}>
        <span>{headers[0]}</span>{valueType && <span>{headers[1]}</span>}
      </div>
      {rows.map(([o, v], i) => (
        <div key={optionType === 'number' ? i : o} className={`grid ${grid} items-center gap-3 rounded-lg border border-slate-200 p-2.5 sm:rounded-none sm:border-0 sm:border-t sm:border-slate-100 sm:px-0 sm:py-1.5`}>
          {optionType === 'number' ? (
            <Input type="number" inputMode="numeric" className="sm:max-w-40" aria-label={`${headers[0]} row ${i + 1}`} value={o} onChange={(e) => onChange(i, parse('number', e.target.value), v)} />
          ) : (
            <span className="text-sm font-semibold text-slate-800 truncate">{o}</span>
          )}
          <div className="flex items-center gap-2">
            {valueType === 'boolean' ? <Switch label={o} checked={!!v} onChange={(c) => onChange(i, o, c)} /> : valueType && (
              <Input className="flex-1 min-w-0 sm:max-w-80" type={valueType} inputMode={valueType === 'number' ? 'decimal' : undefined} step="any" suffix={unit} aria-label={`${headers[1]} for ${o}`} value={v ?? ''} onChange={(e) => onChange(i, o, parse(valueType, e.target.value))} />
            )}
            {!readOnlyOptions && <button type="button" aria-label={`Remove ${o}`} onClick={() => onRemove(i, o)} className={iconBtn}><X className="w-4 h-4" /></button>}
          </div>
        </div>
      ))}
      {!readOnlyOptions && <form onSubmit={add} className={`grid ${grid} items-center gap-3 rounded-lg border border-dashed border-slate-200 p-2.5 sm:rounded-none sm:border-0 sm:border-t sm:border-slate-100 sm:px-0 sm:py-1.5`}>
        <Input type={optionType} inputMode={optionType === 'number' ? 'numeric' : undefined} className="sm:max-w-40" placeholder={`Add ${headers[0].toLowerCase()}`} aria-label={`New ${headers[0]}`} value={opt} onChange={(e) => setOpt(e.target.value)} />
        <div className="flex items-center gap-2">
          {valueType && valueType !== 'boolean' && <Input className="flex-1 min-w-0 sm:max-w-80" type={valueType} step="any" suffix={unit} placeholder={headers[1]} aria-label={`New ${headers[1]}`} value={val} onChange={(e) => setVal(e.target.value)} />}
          <Button type="submit" variant="ghost" icon={Plus} aria-label="Add option" disabled={!canAdd} className="w-9 shrink-0 px-0!" />
        </div>
      </form>}
    </div>
  )
}
