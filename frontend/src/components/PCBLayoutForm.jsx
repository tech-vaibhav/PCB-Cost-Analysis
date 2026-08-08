import { useState, useEffect, useRef } from 'react'
import ToggleGroup from './ToggleGroup'
import LayerSummary from './LayerSummary'


/* ── Helper: snap min drill mm to nearest Pelectro option ── */
function snapMinHole(mm) {
  if (!mm) return null
  const opts = [0.15, 0.2, 0.25, 0.3, 0.8, 1.0]
  let best = opts[0]
  let diff = Math.abs(mm - best)
  for (const o of opts) {
    const d = Math.abs(mm - o)
    if (d < diff) { diff = d; best = o }
  }
  return String(best)
}

/* ── Helper: snap copper count to nearest Pelectro option ── */
function snapLayers(n) {
  const opts = ['1', '2', '4', '6', '8', '10', '12', '14']
  if (!n) return '1'
  let best = opts[0]
  let diff = Math.abs(n - Number(best))
  for (const o of opts) {
    const d = Math.abs(n - Number(o))
    if (d <= diff) { diff = d; best = o }
  }
  return best
}

const LAYER_OPTIONS = ['1', '2', '4', '6', '8', '10', '12', '14'].map(v => ({
  value: v, label: `${v} Layer${v === '1' ? '' : 's'}`
}))

const MATERIAL_OPTIONS = [
  { value: 'XPC', label: 'XPC', icon: '🟫' },
  { value: 'FR-1', label: 'FR-1', icon: '🟩' },
  { value: 'FR-4', label: 'FR-4', icon: '🟩' },
  { value: 'Aluminum', label: 'Aluminum', icon: '🪨' },
]

/* Thickness options keyed by material — matches Pelectro */
const THICKNESS_BY_MATERIAL = {
  'XPC': ['1.0'],
  'FR-1': ['0.2', '0.8', '1.0', '1.6'],
  'FR-4': ['1.0', '1.6', '2.0'],
  'Aluminum': ['1.0', '1.5'],
}

function thicknessOptions(material) {
  return (THICKNESS_BY_MATERIAL[material] || ['1.0', '1.6', '2.0']).map(v => ({
    value: v, label: v
  }))
}

const MICRO_OPTIONS = [
  { value: '18 micro', label: '18 micro' },
  { value: '35 micro', label: '35 micro' },
  { value: '70 micro', label: '70 micro' },
]

const SOLDER_MASK_OPTIONS = [
  { value: 'Green', label: 'Green', color: '#16a34a' },
  { value: 'Red', label: 'Red', color: '#dc2626' },
  { value: 'Blue', label: 'Blue', color: '#2563eb' },
  { value: 'White', label: 'White', color: '#ffffff' },
  { value: 'Black', label: 'Black', color: '#111111' },
  { value: 'Yellow', label: 'Yellow', color: '#eab308' },
]

const SILKSCREEN_OPTIONS = [
  { value: 'White', label: 'White', color: '#ffffff' },
  { value: 'Black', label: 'Black', color: '#111111' },
]

const SURFACE_FINISH_OPTIONS = [
  { value: 'None', label: 'No surface Finish' },
  { value: 'Lacquer', label: 'Lacquer' },
  { value: 'Tinning', label: 'Tinning' },
]

const BOARD_TYPE_OPTIONS = [
  { value: 'single', label: 'Single pieces' },
  { value: 'panel_customer', label: 'Panel by Customer' },
  { value: 'panel_pelectro', label: 'Panel by Pelectro' },
]

const DESIGN_IN_PANEL_OPTIONS = ['1', '2', '3', '4', '5', '6'].map(v => ({ value: v, label: v }))

/* ── FormRow helper ─────────────────────────────────────── */
function FormRow({ label, children }) {
  return (
    <div className="form-row">
      <div className="form-label-col">
        <div className="form-label">
          {label}
          <span className="form-label-q" title="Help">?</span>
        </div>
      </div>
      <div className="form-control-col">
        {children}
      </div>
    </div>
  )
}

export default function PCBLayoutForm({ parsed, onPricing }) {
  // ── Form state ─────────────────────────────────────────
  const [boardType, setBoardType] = useState('single')
  const [designInPanel, setDesignInPanel] = useState('1')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [quantity, setQuantity] = useState('5')
  const [layers, setLayers] = useState('2')
  const [material, setMaterial] = useState('FR-4')
  const [thickness, setThickness] = useState('1.6')
  const [micro, setMicro] = useState('35 micro')
  const [solderMask, setSolderMask] = useState('Green')
  const [silkscreen, setSilkscreen] = useState('White')
  const [surfaceFinish, setSurfaceFinish] = useState('None')

  const [autoFields, setAutoFields] = useState({})

  // ── When material changes, reset thickness to first valid option ──
  function handleMaterialChange(newMaterial) {
    setMaterial(newMaterial)
    const opts = THICKNESS_BY_MATERIAL[newMaterial] || ['1.0']
    setThickness(prev => opts.includes(prev) ? prev : opts[0])
  }

  // ── Solder mask auto-switches silkscreen (White⟷Black) ──
  function handleSolderMaskChange(newMask) {
    setSolderMask(newMask)
    if (newMask === 'White') setSilkscreen('Black')
    else if (newMask === 'Black') setSilkscreen('White')
  }

  // ── Auto-fill whenever parsed changes ─────────────────
  useEffect(() => {
    if (!parsed || parsed.__error) return

    const auto = {}

    if (parsed.dimensions) {
      const w = parsed.dimensions.width_mm
      const h = parsed.dimensions.height_mm
      if (w) { setLength(String(Math.round(w * 100) / 100)); auto.length = true }
      if (h) { setWidth(String(Math.round(h * 100) / 100)); auto.width = true }
    }

    if (parsed.copper_layer_count) {
      setLayers(snapLayers(parsed.copper_layer_count))
      auto.layers = true
    }

    setAutoFields(auto)
  }, [parsed])

  // ── Debounced pricing API call ─────────────────────────
  const priceTimer = useRef(null)

  useEffect(() => {
    if (!onPricing) return
    const l = parseFloat(length)
    const w = parseFloat(width)
    const q = parseInt(quantity, 10)

    // Need valid dimensions and quantity to calculate
    if (!l || !w || !q || l <= 0 || w <= 0 || q <= 0) {
      onPricing(null)
      return
    }

    // Debounce — wait 400ms after last change before hitting the API
    clearTimeout(priceTimer.current)
    priceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            length_mm: l,
            width_mm: w,
            quantity: q,
            material,
            thickness,
            micro,
          }),
        })
        if (!res.ok) { onPricing(null); return }
        const data = await res.json()
        onPricing(data)
      } catch {
        onPricing(null)
      }
    }, 400)

    return () => clearTimeout(priceTimer.current)
  }, [length, width, quantity, material, thickness, micro])

  // ─────────────────────────────────────────────────────
  return (
    <div className="card form-panel">
      <div className="section-header">PCB Layout</div>
      <div className="form-body">

        {/* Upload status row */}
        {parsed && !parsed.__error && (
          <FormRow label="Detected Layers">
            <LayerSummary layers={parsed.layers} />
          </FormRow>
        )}

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
        <FormRow label="Dimensions">
          <div className="dim-row">
            <input
              type="number" className="field-input" placeholder="Length"
              value={length} min={0} onChange={e => setLength(e.target.value)}
            />
            <span className="dim-sep">×</span>
            <input
              type="number" className="field-input" placeholder="Width"
              value={width} min={0} onChange={e => setWidth(e.target.value)}
            />
            <span className="dim-unit">mm</span>
          </div>
        </FormRow>

        {/* Quantity */}
        <FormRow label="Quantity">
          <input
            type="number"
            className="field-input"
            value={quantity}
            min={1}
            onChange={(e) => setQuantity(e.target.value)}
            style={{ maxWidth: 140 }}
          />
        </FormRow>

        {/* Layers */}
        <FormRow label="Layers">
          <ToggleGroup options={LAYER_OPTIONS} value={layers} onChange={(v) => { setLayers(v) }} />
          {parsed?.copper_layer_count != null && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Detected: {parsed.copper_layer_count} copper layer{parsed.copper_layer_count !== 1 ? 's' : ''}
              {parsed.layer_count ? ` (${parsed.layer_count} total files)` : ''}
            </div>
          )}
        </FormRow>

        {/* Material */}
        <FormRow label="Material">
          <ToggleGroup options={MATERIAL_OPTIONS} value={material} onChange={handleMaterialChange} iconMode />
        </FormRow>

        {/* Thickness — options change based on selected material */}
        <FormRow label="Thickness">
          <ToggleGroup options={thicknessOptions(material)} value={thickness} onChange={setThickness} />
        </FormRow>

        {/* Micro (copper weight) */}
        <FormRow label="Micro">
          <ToggleGroup options={MICRO_OPTIONS} value={micro} onChange={setMicro} />
        </FormRow>

        {/* Solder Mask — changing to White/Black auto-switches Silkscreen */}
        <FormRow label="Solder mask">
          <ToggleGroup
            options={SOLDER_MASK_OPTIONS}
            value={solderMask}
            onChange={handleSolderMaskChange}
            swatchMode
          />
        </FormRow>

        {/* Silkscreen — auto-updated when solder mask is White or Black */}
        <FormRow label="Silkscreen">
          <ToggleGroup
            options={SILKSCREEN_OPTIONS}
            value={silkscreen}
            onChange={setSilkscreen}
            swatchMode
          />
        </FormRow>

        {/* Surface Finish */}
        <FormRow label="Surface Finish">
          <ToggleGroup options={SURFACE_FINISH_OPTIONS} value={surfaceFinish} onChange={setSurfaceFinish} />
        </FormRow>

      </div>
    </div>
  )
}
