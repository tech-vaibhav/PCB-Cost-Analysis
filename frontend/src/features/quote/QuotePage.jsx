import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ChevronDown, Cpu, RotateCcw, Settings } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { parseGerber } from '../../api/gerber'
import useQuote from './useQuote'
import QuoteForm from './QuoteForm'
import QuoteSummary from './QuoteSummary'
import PriceBar from './PriceBar'
import UploadZone from './UploadZone'
import GerberViewer from './GerberViewer'

const NOISE = ['Standard layer detection failed', 'Unrecognised layer skipped']

export default function QuotePage() {
  const q = useQuote()
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleFile = async (f) => {
    setParseError(null)
    if (!f.name.toLowerCase().endsWith('.zip')) return setParseError('Please upload a .zip of your Gerber files.')
    if (f.size > 50 * 1024 * 1024) return setParseError('File is larger than 50 MB.')
    setFile(f)
    setParsed(null)
    setParsing(true)
    try {
      const data = await parseGerber(f)
      setParsed(data)
      q.applyGerber(data)
    } catch (e) {
      setParseError(e.status ? e.message : 'Could not reach the Gerber parser. Please try again shortly.')
    } finally {
      setParsing(false)
    }
  }

  const reset = () => {
    setFile(null)
    setParsed(null)
    setParseError(null)
    q.reset()
  }

  const warnings = (parsed?.warnings ?? []).filter((w) => !NOISE.some((n) => w.startsWith(n)))
  const summary = { quote: q.quote, loading: q.loading, error: q.error }

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 pb-28 lg:pb-0">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto h-14 px-4 flex items-center gap-3">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-slate-900 text-white"><Cpu className="w-4 h-4" /></span>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold leading-tight">PCB instant quote</h1>
            <p className="hidden sm:block text-xs text-slate-500">Upload Gerbers or enter specs, prices update as you go</p>
          </div>
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={reset} aria-label="Reset quote">
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Link to="/admin" aria-label="Admin"
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-slate-400">
            <Settings className="w-4 h-4" /><span className="hidden sm:inline">Admin</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 lg:py-8 grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] items-start">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
          <Card title="Gerber files" description="Board size, layers and min hole fill in automatically">
            <UploadZone onFile={handleFile} fileName={file?.name} loading={parsing} />
            {parseError && (
              <p className="mt-3 flex gap-2 text-xs text-red-600"><AlertCircle className="w-4 h-4 shrink-0" />{parseError}</p>
            )}
            {parsed && (
              <p className="mt-3 text-xs text-slate-500">
                {parsed.layer_count} layers detected, {parsed.dimensions?.width_mm?.toFixed(1)} x {parsed.dimensions?.height_mm?.toFixed(1)} mm
              </p>
            )}
            {warnings.length > 0 && (
              <details className="mt-3 text-xs text-slate-500">
                <summary className="cursor-pointer select-none">{warnings.length} parser note{warnings.length > 1 ? 's' : ''}</summary>
                <ul className="mt-2 flex flex-col gap-1 list-disc pl-4">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </details>
            )}
          </Card>

          <Card title="Your quote" className="hidden lg:block">
            <QuoteSummary {...summary} />
          </Card>

          <button type="button" onClick={() => setShowPreview((s) => !s)} aria-expanded={showPreview}
            className="lg:hidden flex items-center justify-between h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700">
            {showPreview ? 'Hide board preview' : 'Show board preview'}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showPreview ? 'rotate-180' : ''}`} />
          </button>
          <div className={showPreview ? '' : 'hidden lg:block'}>
            <GerberViewer file={file} layers={parsed?.layers} />
          </div>

        </aside>

        <QuoteForm values={q.values} onChange={q.setValue} options={q.options} autoFields={q.autoFields} />
      </main>

      <PriceBar {...summary} />
    </div>
  )
}
