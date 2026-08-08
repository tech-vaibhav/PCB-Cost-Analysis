import { useState, useEffect, useRef } from 'react'
import ToggleGroup from './ToggleGroup'
import AutoBadge from './AutoBadge'
import { calculatePrice } from '../api/api'

/* ── Snap helpers ── */
function snapMinHole(mm) {
  if (!mm) return null
  const opts = [0.15, 0.2, 0.25, 0.3, 0.8, 1.0]
  return String(opts.reduce((b, o) => Math.abs(mm - o) < Math.abs(mm - b) ? o : b, opts[0]))
}
function snapLayers(n) {
  const opts = ['1','2','4','6','8','10','12','14']
  if (!n) return '1'
  return opts.reduce((b, o) => Math.abs(n - Number(o)) <= Math.abs(n - Number(b)) ? o : b, opts[0])
}

const LAYER_OPTIONS = ['1','2','4','6','8','10','12','14'].map(v => ({ value: v, label: `${v}L` }))

const MATERIAL_OPTIONS = [
  { value: 'XPC',      label: 'XPC'      },
  { value: 'FR-1',     label: 'FR-1'     },
  { value: 'FR-4',     label: 'FR-4'     },
  { value: 'Aluminum', label: 'Aluminum' },
]

const THICKNESS_BY_MATERIAL = {
  'XPC':      ['1.0'],
  'FR-1':     ['0.2','0.8','1.0','1.6'],
  'FR-4':     ['1.0','1.6','2.0'],
  'Aluminum': ['1.0','1.5'],
}

const MICRO_OPTIONS = [
  { value: '18 micro', label: '18 µ' },
  { value: '35 micro', label: '35 µ' },
  { value: '70 micro', label: '70 µ' },
]

const SOLDER_MASK_OPTIONS = [
  { value: 'Green',  label: 'Green',  color: '#16a34a' },
  { value: 'Red',    label: 'Red',    color: '#dc2626' },
  { value: 'Blue',   label: 'Blue',   color: '#2563eb' },
  { value: 'White',  label: 'White',  color: '#f8fafc' },
  { value: 'Black',  label: 'Black',  color: '#111111' },
  { value: 'Yellow', label: 'Yellow', color: '#eab308' },
]

const SILKSCREEN_OPTIONS = [
  { value: 'White', label: 'White', color: '#f8fafc' },
  { value: 'Black', label: 'Black', color: '#111111' },
]

const SURFACE_FINISH_OPTIONS = [
  { value: 'None',    label: 'None'    },
  { value: 'Lacquer', label: 'Lacquer' },
  { value: 'Tinning', label: 'Tinning' },
]

const BOARD_TYPE_OPTIONS = [
  { value: 'single',          label: 'Single pieces'      },
  { value: 'panel_customer',  label: 'Panel by Customer'  },
  { value: 'panel_pelectro',  label: 'Panel by Pelectro'  },
]

const DESIGN_IN_PANEL_OPTIONS = ['1','2','3','4','5','6'].map(v => ({ value: v, label: v }))

function FormRow({ label, auto, children }) {
  return (
    <div className="flex items-start gap-5 py-4 px-6 border-b border-slate-100 last:border-b-0">
      <div className="w-36 flex-shrink-0 pt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-semibold text-slate-600">{label}</span>
          <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[10px] font-bold flex items-center justify-center cursor-help leading-none flex-shrink-0" title="Help">?</span>
          {auto && <AutoBadge />}
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {children}
      </div>
    </div>
  )
}

export default function PCBLayoutForm({ parsed, onPricing }) {
  const [boardType,     setBoardType]     = useState('single')
  const [designInPanel, setDesignInPanel] = useState('1')
  const [length,        setLength]        = useState('')
  const [width,         setWidth]         = useState('')
  const [quantity,      setQuantity]      = useState('5')
  const [layers,        setLayers]        = useState('2')
  const [material,      setMaterial]      = useState('FR-4')
  const [thickness,     setThickness]     = useState('1.6')
  const [micro,         setMicro]         = useState('35 micro')
  const [solderMask,    setSolderMask]    = useState('Green')
  const [silkscreen,    setSilkscreen]    = useState('White')
  const [surfaceFinish, setSurfaceFinish] = useState('None')
  const [autoFields,    setAutoFields]    = useState({})

  function handleMaterialChange(mat) {
    setMaterial(mat)
    const opts = THICKNESS_BY_MATERIAL[mat] || ['1.0']
    setThickness(prev => opts.includes(prev) ? prev : opts[0])
  }

  function handleSolderMaskChange(mask) {
    setSolderMask(mask)
    if (mask === 'White') setSilkscreen('Black')
    else if (mask === 'Black') setSilkscreen('White')
  }

  /* ── Auto-fill from parsed ── */
  useEffect(() => {
    if (!parsed || parsed.__error) return
    const auto = {}
    if (parsed.dimensions) {
      const w = parsed.dimensions.width_mm
      const h = parsed.dimensions.height_mm
      if (w) { setLength(String(Math.round(w * 100) / 100)); auto.length = true }
      if (h) { setWidth (String(Math.round(h * 100) / 100)); auto.width  = true }
    }
    if (parsed.copper_layer_count) { setLayers(snapLayers(parsed.copper_layer_count)); auto.layers = true }
    setAutoFields(auto)
  }, [parsed])

  /* ── Debounced pricing ── */
  const priceTimer = useRef(null)
  useEffect(() => {
    if (!onPricing) return
    const l = parseFloat(length)
    const w = parseFloat(width)
    const q = parseInt(quantity, 10)
    if (!l || !w || !q || l <= 0 || w <= 0 || q <= 0) { onPricing(null); return }

    clearTimeout(priceTimer.current)
    priceTimer.current = setTimeout(async () => {
      try {
        const data = await calculatePrice({ length_mm: l, width_mm: w, quantity: q, material, thickness, micro })
        onPricing(data)
      } catch { onPricing(null) }
    }, 400)
    return () => clearTimeout(priceTimer.current)
  }, [length, width, quantity, material, thickness, micro])

  const thicknessOpts = (THICKNESS_BY_MATERIAL[material] || ['1.0']).map(v => ({ value: v, label: v }))

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-900">Configure Your PCB</h2>
        <p className="text-sm text-slate-400 mt-0.5">Select the required specifications to calculate your PCB price</p>
      </div>

      <div>

        {/* Board Type */}
        <FormRow label="Board Type">
          <ToggleGroup options={BOARD_TYPE_OPTIONS} value={boardType} onChange={setBoardType} />
        </FormRow>

        {/* Design in Panel */}
        {boardType !== 'single' && (
          <FormRow label="Design in Panel">
            <ToggleGroup options={DESIGN_IN_PANEL_OPTIONS} value={designInPanel} onChange={setDesignInPanel} />
          </FormRow>
        )}

        {/* Dimensions */}
        <FormRow label="Dimensions" auto={autoFields.length || autoFields.width}>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} placeholder="Length"
              value={length} onChange={e => setLength(e.target.value)}
              className={[
                'flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-colors duration-150',
                'focus:border-blue-400 focus:ring-2 focus:ring-blue-100',
                autoFields.length ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white',
              ].join(' ')}
            />
            <span className="text-slate-400 font-medium text-sm">×</span>
            <input
              type="number" min={0} placeholder="Width"
              value={width} onChange={e => setWidth(e.target.value)}
              className={[
                'flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-colors duration-150',
                'focus:border-blue-400 focus:ring-2 focus:ring-blue-100',
                autoFields.width ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white',
              ].join(' ')}
            />
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">mm</span>
          </div>
        </FormRow>

        {/* Quantity */}
        <FormRow label="Quantity">
          <input
            type="number" min={1}
            value={quantity} onChange={e => setQuantity(e.target.value)}
            className="w-36 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors duration-150 bg-white"
          />
        </FormRow>

        {/* Layers */}
        <FormRow label="Layers" auto={autoFields.layers}>
          <ToggleGroup options={LAYER_OPTIONS} value={layers} onChange={setLayers} />
          {parsed?.copper_layer_count != null && (
            <p className="text-[11px] text-slate-400">
              Detected: {parsed.copper_layer_count} copper layer{parsed.copper_layer_count !== 1 ? 's' : ''}
              {parsed.layer_count ? ` · ${parsed.layer_count} total files` : ''}
            </p>
          )}
        </FormRow>

        {/* Material */}
        <FormRow label="Material">
          <ToggleGroup options={MATERIAL_OPTIONS} value={material} onChange={handleMaterialChange} />
        </FormRow>

        {/* Thickness */}
        <FormRow label="Thickness">
          <ToggleGroup options={thicknessOpts} value={thickness} onChange={setThickness} />
        </FormRow>

        {/* Micro (copper weight) */}
        <FormRow label="Copper Weight">
          <ToggleGroup options={MICRO_OPTIONS} value={micro} onChange={setMicro} />
        </FormRow>

        {/* Solder Mask */}
        <FormRow label="Solder Mask">
          <ToggleGroup options={SOLDER_MASK_OPTIONS} value={solderMask} onChange={handleSolderMaskChange} swatchMode />
        </FormRow>

        {/* Silkscreen */}
        <FormRow label="Silkscreen">
          <ToggleGroup options={SILKSCREEN_OPTIONS} value={silkscreen} onChange={setSilkscreen} swatchMode />
        </FormRow>

        {/* Surface Finish */}
        <FormRow label="Surface Finish">
          <ToggleGroup options={SURFACE_FINISH_OPTIONS} value={surfaceFinish} onChange={setSurfaceFinish} />
        </FormRow>
      </div>
    </div>
  )
}
