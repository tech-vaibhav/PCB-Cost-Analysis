// ToggleGroup — reusable button-group selector (like PCBWay / Pelectro pill buttons)
export default function ToggleGroup({ options, value, onChange, swatchMode = false, iconMode = false }) {
  return (
    <div className="tg-wrap">
      {options.map((opt) => {
        const key      = typeof opt === 'object' ? opt.value : opt
        const label    = typeof opt === 'object' ? opt.label : opt
        const color    = typeof opt === 'object' ? opt.color : null
        const icon     = typeof opt === 'object' ? opt.icon  : null
        const isActive = value === key

        return (
          <button
            key={key}
            type="button"
            className={`tg-btn${isActive ? ' tg-btn--active' : ''}${swatchMode ? ' tg-btn--swatch' : ''}`}
            onClick={() => onChange(key)}
          >
            {swatchMode && color && (
              <span
                className="swatch-dot"
                style={{ background: color }}
              />
            )}
            {iconMode && icon && (
              <span className="tg-icon" aria-hidden="true">{icon}</span>
            )}
            {label}
          </button>
        )
      })}
    </div>
  )
}
