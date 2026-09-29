import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import pcbStackup from 'pcb-stackup'
import { Eye, Layers } from 'lucide-react'
import { Card, Spinner } from '../../components/ui'

const PLY = {
  silkscreen: '#A8D8EA', solder: '#23834B', copper: '#D99A2B', prepreg: '#E7D39B', core: '#F1F1EC',
}
const plate = (name, type) => ({ name, type, color: PLY[type] })
const DEFAULT_STACK = [
  plate('Top Solder Mask', 'solder'), plate('Top Copper', 'copper'), plate('Prepreg', 'prepreg'), plate('Core', 'core'),
  plate('Prepreg', 'prepreg'), plate('Bottom Copper', 'copper'), plate('Bottom Solder Mask', 'solder'),
]

function buildVisualStack(layers) {
  if (!layers?.length) return DEFAULT_STACK
  const has = (side, type) => layers.some((l) => l.side?.toLowerCase() === side && l.layer_type?.toLowerCase() === type)
  const inner = layers.filter((l) => !['top', 'bottom'].includes(l.side?.toLowerCase()) && l.layer_type?.toLowerCase() === 'copper')
  const stack = [
    has('top', 'silkscreen') && plate('Top Silkscreen', 'silkscreen'),
    has('top', 'soldermask') && plate('Top Solder Mask', 'solder'),
    has('top', 'copper') && plate('Top Copper', 'copper'),
    plate('Prepreg', 'prepreg'),
    ...inner.flatMap((_, i) => [plate(`Inner Copper ${i + 1}`, 'copper'), i < inner.length - 1 && plate('Prepreg', 'prepreg')]),
    plate('Core', 'core'),
    plate('Prepreg', 'prepreg'),
    has('bottom', 'copper') && plate('Bottom Copper', 'copper'),
    has('bottom', 'soldermask') && plate('Bottom Solder Mask', 'solder'),
    has('bottom', 'silkscreen') && plate('Bottom Silkscreen', 'silkscreen'),
  ].filter(Boolean)
  return stack.length >= 3 ? stack : DEFAULT_STACK
}

// Isometric plates, one per layer, with inline labels; the top render is clipped onto the first plate.
function LayerStackSVG({ stack, topSvg }) {
  const OX = 4, OY = 24, PAD = 14
  const T1 = 10, T2 = 35, B = 48, LI = 40, LO = 20, RI = 200, RO = 220, CY = (T1 + T2) / 2
  const h = PAD + B + (stack.length - 1) * OY + 8
  const clip = `${LO},${T1 + PAD} ${RI},${T1 + PAD} ${RO},${T2 + PAD} ${LI},${T2 + PAD}`
  const pads = [70, 94, 118, 142]

  return (
    <svg viewBox={`0 0 450 ${h}`} width="100%" style={{ overflow: 'visible' }} role="img" aria-label="PCB layer stack">
      {topSvg && <defs><clipPath id="pcb-top-face-clip"><polygon points={clip} /></clipPath></defs>}
      {stack.map((layer, i) => ({ layer, i })).reverse().map(({ layer, i }) => (
        <g key={i} transform={`translate(${i * OX},${i * OY + PAD})`}>
          <polygon points={`${LO},${T1} ${RI},${T1} ${RO},${T2} ${LI},${T2}`} fill={layer.color} />
          <polygon points={`${LI},${T2} ${RO},${T2} ${RO},${B} ${LI},${B}`} fill={layer.color} opacity={0.68} />
          <polygon points={`${LO},${T1} ${LI},${T2} ${LI},${B} ${LO},${T1 + (B - T1) * 0.55}`} fill={layer.color} opacity={0.45} />
          {layer.type === 'copper' && (
            <g fill="none" stroke="#FFF1C7" strokeWidth="1.8">
              {pads.map((x) => <circle key={x} cx={x} cy={CY} r="5.5" />)}
              <path d={`M70 ${CY} H94 M118 ${CY} H142`} />
              <rect x="162" y={CY - 7} width="22" height="14" rx="2" strokeWidth="1.4" />
            </g>
          )}
          {layer.type === 'solder' && pads.slice(0, 3).map((x) => (
            <circle key={x} cx={x} cy={CY} r="4" fill={layer.color} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          ))}
          <circle cx={RO + 16} cy={CY} r="4" fill={layer.color} />
          <text x={RO + 25} y={CY + 4.5} fontSize="11.5" fill="#374151" fontWeight="500">{layer.name}</text>
        </g>
      ))}
      {topSvg && (
        <image
          href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(topSvg)}`}
          x={LO} y={T1 + PAD} width={RO - LO} height={T2 - T1}
          clipPath="url(#pcb-top-face-clip)" preserveAspectRatio="xMidYMid slice" opacity="0.92"
        />
      )}
    </svg>
  )
}

function Render({ title, svg, flip }) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs font-medium text-slate-500">{title}</figcaption>
      <div className={`gerber-svg-wrap ${flip ? 'gerber-svg-wrap--flip' : ''}`} dangerouslySetInnerHTML={{ __html: svg }} />
    </figure>
  )
}

function Tab({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
        active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <Icon className="w-3 h-3" /> {children}
    </button>
  )
}

export default function GerberViewer({ file, layers }) {
  const [svgs, setSvgs] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('stack')

  useEffect(() => {
    setSvgs(null)
    setError(null)
    setTab('stack')
    if (!file) return
    let live = true
    setLoading(true)
    processZip(file)
      .then((s) => { if (live) setSvgs(s) })
      .catch((err) => { console.error(err); if (live) setError('Could not render the board preview.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [file])

  return (
    <Card
      title="Board preview"
      description={file ? 'Rendered from your Gerber files' : 'Sample 2-layer stack'}
      action={svgs && (
        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
          <Tab active={tab === 'stack'} onClick={() => setTab('stack')} icon={Layers}>Stack</Tab>
          <Tab active={tab === 'preview'} onClick={() => setTab('preview')} icon={Eye}>Render</Tab>
        </div>
      )}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><Spinner size={16} /> Rendering</div>
      ) : tab === 'preview' && svgs ? (
        <div className="flex flex-col gap-4">
          <Render title="Top" svg={svgs.top} />
          <Render title="Bottom" svg={svgs.bottom} flip />
        </div>
      ) : (
        <>
          {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
          <LayerStackSVG stack={buildVisualStack(layers)} topSvg={svgs?.top} />
        </>
      )}
    </Card>
  )
}

const EXTS = ['gbr', 'ger', 'gtl', 'gbl', 'gts', 'gbs', 'gto', 'gbo', 'gtp', 'gbp', 'gko', 'gm1', 'gm2', 'drl', 'xln', 'exc', 'ncd', 'txt']

async function processZip(file) {
  const zip = await JSZip.loadAsync(file)
  const entries = Object.values(zip.files).filter((e) => !e.dir && EXTS.includes(e.name.split('.').pop().toLowerCase()))
  if (!entries.length) throw new Error('No Gerber files found in ZIP.')
  const layers = await Promise.all(entries.map(async (e) => ({ filename: e.name.split('/').pop(), gerber: await e.async('string') })))
  const stackup = await pcbStackup(layers)
  return { top: stackup.top.svg, bottom: stackup.bottom.svg }
}
