export default function ToggleGroup({ options, value, onChange, swatchMode = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const key    = typeof opt === 'object' ? opt.value : opt
        const label  = typeof opt === 'object' ? opt.label : opt
        const color  = typeof opt === 'object' ? opt.color : null
        const active = value === key

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
              'border transition-all duration-130 cursor-pointer whitespace-nowrap',
              active
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50',
            ].join(' ')}
          >
            {swatchMode && color && (
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  background: color,
                  boxShadow: color === '#f8fafc' ? '0 0 0 1px #e2e8f0 inset' : undefined,
                }}
              />
            )}
            {label}
          </button>
        )
      })}
    </div>
  )
}
