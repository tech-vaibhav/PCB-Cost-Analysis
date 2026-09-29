// Segmented control. items: [{ value, label, icon? }]
export default function Tabs({ items, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={`inline-flex p-1 rounded-lg bg-slate-100 ${className}`}>
      {items.map(({ value: v, label, icon: Icon }) => {
        const active = v === value
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {label}
          </button>
        )
      })}
    </div>
  )
}
