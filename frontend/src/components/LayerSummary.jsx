import { useState } from 'react'
import { Layers, ChevronDown } from 'lucide-react'

/* ── Layer type → visual config ── */
const PALETTE = {
  soldermask: { bg: '#166534', shadow: '#14532d', label: 'Solder Mask' },
  silkscreen:  { bg: '#1e40af', shadow: '#1e3a8a', label: 'Silkscreen'  },
  copper:      { bg: '#b45309', shadow: '#92400e', label: 'Copper'      },
  paste:       { bg: '#64748b', shadow: '#475569', label: 'Paste'       },
  outline:     { bg: '#6d28d9', shadow: '#5b21b6', label: 'Outline'     },
  drill:       { bg: '#1e293b', shadow: '#0f172a', label: 'Drill'       },
  other:       { bg: '#6b7280', shadow: '#4b5563', label: 'Other'       },
}

/* ── Sort layers into correct PCB stack order ── */
function sortOrder(layer) {
  const s = (layer.side || '').toLowerCase()
  const t = (layer.layer_type || 'other').toLowerCase()
  if (s === 'top'    && t === 'silkscreen')  return 0
  if (s === 'top'    && t === 'soldermask')  return 1
  if (s === 'top'    && t === 'paste')       return 2
  if (s === 'top'    && t === 'copper')      return 3
  if (t === 'copper')                        return 4  // inner copper
  if (s === 'bottom' && t === 'copper')      return 5
  if (s === 'bottom' && t === 'paste')       return 6
  if (s === 'bottom' && t === 'soldermask')  return 7
  if (s === 'bottom' && t === 'silkscreen')  return 8
  if (t === 'outline')                       return 9
  if (t === 'drill')                         return 10
  return 11
}

export default function LayerSummary({ layers }) {
  const [open, setOpen] = useState(true)
  if (!layers?.length) return null

  const sorted = [...layers].sort((a, b) => sortOrder(a) - sortOrder(b))

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* ── Collapsible header ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-800">Layer Stack</span>
          <span className="text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">
            {layers.length}
          </span>
        </div>
        <ChevronDown
          className="w-4 h-4 text-slate-400 transition-transform duration-250"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* ── Collapsible body ── */}
      <div className={`collapsible-grid ${open ? 'open' : 'closed'}`}>
        <div className="collapsible-inner">
          <div className="border-t border-slate-100 px-4 py-4">
            <div className="flex gap-5 items-start">

              {/* ── Isometric plate stack ── */}
              <div className="flex-shrink-0" style={{ perspective: '280px', width: '110px' }}>
                <div style={{ transform: 'rotateX(42deg)', transformStyle: 'preserve-3d' }}>
                  {sorted.map((layer, i) => {
                    const t = (layer.layer_type || 'other').toLowerCase()
                    const p = PALETTE[t] || PALETTE.other
                    // copper layers are thicker, silkscreen thinner
                    const h = t === 'copper' ? 18 : t === 'silkscreen' || t === 'paste' ? 10 : 14
                    return (
                      <div
                        key={i}
                        style={{
                          height: `${h}px`,
                          marginBottom: '4px',
                          background: p.bg,
                          borderRadius: '3px',
                          boxShadow: `0 ${Math.round(h * 0.35)}px 0 ${p.shadow}`,
                        }}
                      />
                    )
                  })}
                </div>
              </div>

              {/* ── Legend ── */}
              <div className="flex-1 space-y-2 min-w-0">
                {sorted.map((layer, i) => {
                  const t = (layer.layer_type || 'other').toLowerCase()
                  const p = PALETTE[t] || PALETTE.other
                  return (
                    <div key={i} className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: p.bg }}
                      />
                      <span className="text-xs text-slate-700 font-medium truncate">
                        {layer.name}
                      </span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0 capitalize">
                        {layer.side || ''}
                      </span>
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
