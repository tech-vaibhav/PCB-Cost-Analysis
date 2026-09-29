// options: array of strings or { value, label, color }
export default function ToggleGroup({ options, value, onChange, size = 'md' }) {
  const pad = size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-10 px-3.5 text-sm'
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((opt) => {
        const key = typeof opt === 'object' ? opt.value : opt
        const label = typeof opt === 'object' ? opt.label : opt
        const color = typeof opt === 'object' ? opt.color : null
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={`inline-flex items-center gap-2 rounded-lg border font-medium transition-colors ${pad} ${
              active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            {color && <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: color }} />}
            {label}
          </button>
        )
      })}
    </div>
  )
}
