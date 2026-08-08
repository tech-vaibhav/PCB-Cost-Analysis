import { useState, useEffect } from 'react'
import JSZip from 'jszip'
import pcbStackup from 'pcb-stackup'
import { Eye, Layers } from 'lucide-react'

/* ── Default 2-layer PCB visual stack ── */
const DEFAULT_STACK = [
  { name: 'Top Solder Mask',    type: 'solder',   color: '#23834B' },
  { name: 'Top Copper',         type: 'copper',   color: '#D99A2B' },
  { name: 'Prepreg',            type: 'prepreg',  color: '#E7D39B' },
  { name: 'Core',               type: 'core',     color: '#F1F1EC' },
  { name: 'Prepreg',            type: 'prepreg',  color: '#E7D39B' },
  { name: 'Bottom Copper',      type: 'copper',   color: '#D99A2B' },
  { name: 'Bottom Solder Mask', type: 'solder',   color: '#23834B' },
]

function buildVisualStack(layers) {
  if (!layers?.length) return DEFAULT_STACK
  const find = (side, type) =>
    layers.find(l => l.side?.toLowerCase() === side && l.layer_type?.toLowerCase() === type)
  const inner = layers.filter(l =>
    !['top', 'bottom'].includes(l.side?.toLowerCase()) && l.layer_type?.toLowerCase() === 'copper'
  )
  const stack = []
  const topSilk   = find('top', 'silkscreen')
  const topSolder = find('top', 'soldermask')
  const topCopper = find('top', 'copper')
  const botCopper = find('bottom', 'copper')
  const botSolder = find('bottom', 'soldermask')
  const botSilk   = find('bottom', 'silkscreen')

  if (topSilk)   stack.push({ name: 'Top Silkscreen',     type: 'silkscreen', color: '#A8D8EA' })
  if (topSolder) stack.push({ name: 'Top Solder Mask',    type: 'solder',     color: '#23834B' })
  if (topCopper) stack.push({ name: 'Top Copper',         type: 'copper',     color: '#D99A2B' })
  stack.push({ name: 'Prepreg', type: 'prepreg', color: '#E7D39B' })
  inner.forEach((_, i) => {
    stack.push({ name: `Inner Copper ${i + 1}`, type: 'copper', color: '#D99A2B' })
    if (i < inner.length - 1) stack.push({ name: 'Prepreg', type: 'prepreg', color: '#E7D39B' })
  })
  stack.push({ name: 'Core',    type: 'core',    color: '#F1F1EC' })
  stack.push({ name: 'Prepreg', type: 'prepreg', color: '#E7D39B' })
  if (botCopper) stack.push({ name: 'Bottom Copper',      type: 'copper', color: '#D99A2B' })
  if (botSolder) stack.push({ name: 'Bottom Solder Mask', type: 'solder', color: '#23834B' })
  if (botSilk)   stack.push({ name: 'Bottom Silkscreen',  type: 'silkscreen', color: '#A8D8EA' })
  return stack.length >= 3 ? stack : DEFAULT_STACK
}

/* ──────────────────────────────────────────────────────────────────
   LayerStackSVG — a SINGLE SVG that renders:
     • Isometric parallelogram plates (offset per layer for depth)
     • Inline text labels aligned with each plate (inside same SVG coords)
     • The actual top-view PCB render embedded in the top-most plate
   No separate legend div — labels live right next to their plates.
────────────────────────────────────────────────────────────────── */
function LayerStackSVG({ stack, topSvg }) {
  // Per-layer shift constants
  const OX = 4    // px shift right per layer  
  const OY = 24   // px shift down per layer → sets label spacing

  // Plate geometry (local group coords)
  //   Top face:   parallelogram at y=10..35
  //   Front face: rect at y=35..48
  //   Side face:  left sliver
  const TOP_Y1 = 10, TOP_Y2 = 35
  const BOT_Y  = 48
  const L_IN   = 40   // inner left of plate (skewed)
  const L_OUT  = 20   // outer left
  const R_IN   = 200  // inner right
  const R_OUT  = 220  // outer right (skewed)

  // Top-face vertical center in group coords
  const TOP_CY = (TOP_Y1 + TOP_Y2) / 2   // = 22.5

  // Label position (group-relative)
  const DOT_X  = R_OUT + 16   // 16px gap after the right edge
  const TEXT_X = DOT_X + 9

  // SVG viewBox: width to fit plate + label text; height for all layers
  const svgW = 450
  const svgH = 14 + BOT_Y + (stack.length - 1) * OY + 8  // top pad + shape + stacks + bot pad

  // Convert topSvg string → data URL for <image> embedding
  const topSvgHref = topSvg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(topSvg)}`
    : null

  // Clip-path coords for the top face of layer 0 in SVG coordinate space.
  // Layer 0 group: translate(0, 14), top face: "L_OUT,TOP_Y1 R_IN,TOP_Y1 R_OUT,TOP_Y2 L_IN,TOP_Y2"
  // → in SVG coords: add translate = L_OUT,TOP_Y1+14 …
  const clip0 = [
    `${L_OUT},${TOP_Y1 + 14}`,
    `${R_IN},${TOP_Y1 + 14}`,
    `${R_OUT},${TOP_Y2 + 14}`,
    `${L_IN},${TOP_Y2 + 14}`,
  ].join(' ')

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      height="auto"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {topSvgHref && (
          <clipPath id="pcb-top-face-clip">
            <polygon points={clip0} />
          </clipPath>
        )}
      </defs>

      {/* Render layers BOTTOM → TOP so top layer draws over lower ones */}
      {[...stack].reverse().map((layer, ri) => {
        const i   = stack.length - 1 - ri
        const tx  = i * OX
        const ty  = i * OY + 14    // 14px top padding

        return (
          <g key={`l${i}`} transform={`translate(${tx},${ty})`}>

            {/* ── Top face ── */}
            <polygon
              points={`${L_OUT},${TOP_Y1} ${R_IN},${TOP_Y1} ${R_OUT},${TOP_Y2} ${L_IN},${TOP_Y2}`}
              fill={layer.color}
            />

            {/* ── Front face (slightly darker) ── */}
            <polygon
              points={`${L_IN},${TOP_Y2} ${R_OUT},${TOP_Y2} ${R_OUT},${BOT_Y} ${L_IN},${BOT_Y}`}
              fill={layer.color}
              opacity={0.68}
            />

            {/* ── Left side face (darkest) ── */}
            <polygon
              points={`${L_OUT},${TOP_Y1} ${L_IN},${TOP_Y2} ${L_IN},${BOT_Y} ${L_OUT},${TOP_Y1 + (BOT_Y - TOP_Y1) * 0.55}`}
              fill={layer.color}
              opacity={0.45}
            />

            {/* ── Copper layer: trace + pad decorations ── */}
            {layer.type === 'copper' && (
              <>
                <circle cx="70"  cy={TOP_CY} r="5.5" fill="none" stroke="#FFF1C7" strokeWidth="1.8" />
                <circle cx="94"  cy={TOP_CY} r="5.5" fill="none" stroke="#FFF1C7" strokeWidth="1.8" />
                <circle cx="118" cy={TOP_CY} r="5.5" fill="none" stroke="#FFF1C7" strokeWidth="1.8" />
                <circle cx="142" cy={TOP_CY} r="5.5" fill="none" stroke="#FFF1C7" strokeWidth="1.8" />
                <path d={`M70 ${TOP_CY} H94 M118 ${TOP_CY} H142`} stroke="#FFF1C7" strokeWidth="1.8" />
                <rect x="162" y={TOP_CY - 7} width="22" height="14" rx="2"
                  fill="none" stroke="#FFF1C7" strokeWidth="1.4" />
              </>
            )}

            {/* ── Solder mask: pad openings ── */}
            {layer.type === 'solder' && (
              <>
                <circle cx="70"  cy={TOP_CY} r="4" fill={layer.color} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                <circle cx="94"  cy={TOP_CY} r="4" fill={layer.color} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                <circle cx="118" cy={TOP_CY} r="4" fill={layer.color} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
              </>
            )}

            {/* ── Inline label: dot + text, aligned with this plate's top face ── */}
            <circle cx={DOT_X} cy={TOP_CY} r="4" fill={layer.color} />
            <text
              x={TEXT_X}
              y={TOP_CY + 4.5}
              fontSize="11.5"
              fill="#374151"
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight="500"
            >
              {layer.name}
            </text>
          </g>
        )
      })}

      {/* ── Top-view PCB SVG rendered ON TOP of the top plate ─────────────────
          Placed AFTER all layer groups so it renders above everything.
          Clipped to the exact top-face parallelogram of layer 0.
      ─────────────────────────────────────────────────────────────────────── */}
      {topSvgHref && (
        <image
          href={topSvgHref}
          x={L_OUT}
          y={TOP_Y1 + 14}
          width={R_OUT - L_OUT}
          height={TOP_Y2 - TOP_Y1}
          clipPath="url(#pcb-top-face-clip)"
          preserveAspectRatio="xMidYMid slice"
          opacity="0.92"
        />
      )}
    </svg>
  )
}

/* ── Preview: top above bottom (white bg, no tabs) ── */
function PreviewView({ topSvg, bottomSvg }) {
  return (
    <div>
      {topSvg && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Top View</p>
          <div className="gerber-svg-wrap">
            <div dangerouslySetInnerHTML={{ __html: topSvg }} className="w-full" />
          </div>
        </div>
      )}
      {topSvg && bottomSvg && <div className="mx-4 border-t border-slate-100" />}
      {bottomSvg && (
        <div className="px-4 pt-3 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Bottom View</p>
          <div className="gerber-svg-wrap gerber-svg-wrap--flip">
            <div dangerouslySetInnerHTML={{ __html: bottomSvg }} className="w-full" />
          </div>
        </div>
      )}
    </div>
  )
}

function PillTab({ children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold',
        'transition-all duration-150 cursor-pointer',
        active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

/* ── Main component ── */
export default function GerberViewer({ file, layers }) {
  const [topSvg,    setTopSvg]    = useState(null)
  const [bottomSvg, setBottomSvg] = useState(null)
  const [error,     setError]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [tab,       setTab]       = useState('stack')

  useEffect(() => {
    if (!file) { setTopSvg(null); setBottomSvg(null); setError(null); return }
    setLoading(true); setError(null); setTopSvg(null); setBottomSvg(null)
    processZip(file)
      .then(({ top, bottom }) => { setTopSvg(top); setBottomSvg(bottom) })
      .catch(err => { console.error(err); setError('Could not render PCB preview.') })
      .finally(() => setLoading(false))
  }, [file])

  const stack = buildVisualStack(layers)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">PCB Preview</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {tab === 'stack' ? 'Layer stack' : 'Gerber render'}
          </p>
        </div>

        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
          <PillTab active={tab === 'stack'} onClick={() => setTab('stack')}>
            <Layers className="w-3 h-3" /> Layer Stack
          </PillTab>
          {(topSvg || bottomSvg) && (
            <PillTab active={tab === 'preview'} onClick={() => setTab('preview')}>
              <Eye className="w-3 h-3" /> Preview
            </PillTab>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
          <span className="spinner" /> Rendering…
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">
          ⚠ {error}
        </div>
      )}

      {/* Layer Stack tab */}
      {tab === 'stack' && !loading && (
        <div className="px-4 pb-5 pt-1">
          <LayerStackSVG stack={stack} topSvg={topSvg} />
        </div>
      )}

      {/* Preview tab */}
      {tab === 'preview' && !loading && !error && (topSvg || bottomSvg) && (
        <PreviewView topSvg={topSvg} bottomSvg={bottomSvg} />
      )}
    </div>
  )
}

/* ── Zip → SVG ── */
async function processZip(file) {
  const zip = await JSZip.loadAsync(file)
  const layers = []
  const exts = ['gbr','ger','gtl','gbl','gts','gbs','gto','gbo','gtp','gbp','gko','gm1','gm2','drl','xln','exc','ncd','txt']
  for (const [filename, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    const ext = filename.split('.').pop().toLowerCase()
    if (!exts.includes(ext)) continue
    const content = await entry.async('string')
    layers.push({ filename: filename.split('/').pop(), gerber: content })
  }
  if (!layers.length) throw new Error('No Gerber files found in ZIP.')
  const stackup = await pcbStackup(layers)
  return { top: stackup.top.svg, bottom: stackup.bottom.svg }
}
