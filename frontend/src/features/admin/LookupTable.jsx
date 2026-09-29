import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button, Input } from '../../components/ui'

const parse = (type, v) => (type === 'number' && v !== '' ? Number(v) : v)
const iconBtn = 'inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600'

// rows: [[option, value], ...]. valueType 'number' | 'text' | null (plain list). optionType 'number' makes the option editable.
export default function LookupTable({ rows, valueType = 'number', optionType = 'text', unit, headers = ['Option', 'Value'], onChange, onRemove, onAdd }) {
  const [opt, setOpt] = useState('')
  const [val, setVal] = useState('')
  const grid = valueType ? 'grid-cols-[minmax(0,1fr)_minmax(0,9rem)_2.25rem]' : 'grid-cols-[minmax(0,1fr)_2.25rem]'
  const taken = rows.some(([o]) => String(o) === opt.trim())
  const canAdd = opt.trim() && !taken && (!valueType || val !== '')

  const add = (e) => {
    e.preventDefault()
    if (!canAdd) return
    onAdd(parse(optionType, opt.trim()), valueType ? parse(valueType, val) : undefined)
    setOpt('')
    setVal('')
  }

  return (
    <div className="flex flex-col gap-2 md:gap-0">
      <div className={`hidden md:grid ${grid} gap-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 border-b border-slate-100`}>
        <span>{headers[0]}</span>{valueType && <span>{headers[1]}</span>}
      </div>
      {rows.map(([o, v], i) => (
        <div key={optionType === 'number' ? i : o} className={`grid ${grid} items-center gap-3 rounded-lg border border-slate-200 p-2.5 md:rounded-none md:border-0 md:border-b md:border-slate-100 md:px-0 md:py-1.5`}>
          {optionType === 'number' ? (
            <Input type="number" inputMode="numeric" aria-label={`${headers[0]} row ${i + 1}`} value={o} onChange={(e) => onChange(i, parse('number', e.target.value), v)} />
          ) : (
            <span className="text-sm text-slate-700 truncate">{o}</span>
          )}
          {valueType && (
            <Input type={valueType} inputMode={valueType === 'number' ? 'decimal' : undefined} step="any" suffix={unit} aria-label={`${headers[1]} for ${o}`} value={v ?? ''} onChange={(e) => onChange(i, o, parse(valueType, e.target.value))} />
          )}
          <button type="button" aria-label={`Remove ${o}`} onClick={() => onRemove(i, o)} className={iconBtn}><X className="w-4 h-4" /></button>
        </div>
      ))}
      <form onSubmit={add} className={`grid ${grid} items-center gap-3 pt-2`}>
        <Input type={optionType} inputMode={optionType === 'number' ? 'numeric' : undefined} placeholder={`New ${headers[0].toLowerCase()}`} aria-label={`New ${headers[0]}`} value={opt} onChange={(e) => setOpt(e.target.value)} />
        {valueType && <Input type={valueType} step="any" suffix={unit} placeholder={headers[1]} aria-label={`New ${headers[1]}`} value={val} onChange={(e) => setVal(e.target.value)} />}
        <Button type="submit" variant="secondary" icon={Plus} aria-label="Add option" disabled={!canAdd} className="w-9 px-0!" />
      </form>
    </div>
  )
}
