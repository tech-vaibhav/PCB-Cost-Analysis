import { useState, lazy, Suspense } from 'react'
import './App.css'
import UploadZone from './components/UploadZone'
import CalculationCard from './components/CalculationCard'
import PCBLayoutForm from './components/PCBLayoutForm'
import { CircuitBoard, CheckCircle, AlertCircle, Loader } from 'lucide-react'

const GerberViewer = lazy(() => import('./components/GerberViewer'))

export default function App() {
  const [parsed,     setParsed]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [pricing,    setPricing]    = useState(null)
  const [gerberFile, setGerberFile] = useState(null)

  const handleParsed = (data) => { setParsed(data); setPricing(null) }

  const handleReset = () => {
    setParsed(null); setPricing(null); setGerberFile(null); setLoading(false)
  }

  const layers = parsed && !parsed.__error ? parsed.layers : null

  return (
    <div className="min-h-screen bg-[#f5f6f8]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center gap-3">
          <CircuitBoard className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-slate-900 text-[15px] tracking-tight">PCB Analyzer</span>
          <span className="text-xs text-slate-400 hidden sm:block ml-1">
            Gerber parser & cost estimator
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-screen-xl mx-auto px-6 py-7">
        <div className="grid gap-5" style={{ gridTemplateColumns: '340px 1fr' }}>

          {/* ── Left sidebar ── */}
          <aside className="flex flex-col gap-4">

            {/* Upload or re-upload */}
            {!gerberFile ? (
              <UploadZone
                onParsed={handleParsed}
                onLoading={setLoading}
                onFile={setGerberFile}
              />
            ) : (
              <UploadZone
                onParsed={handleParsed}
                onLoading={setLoading}
                onFile={setGerberFile}
                compact
              />
            )}

            {/* Status pills */}
            {loading && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700 font-medium">
                <Loader className="w-4 h-4 animate-spin" />
                Parsing Gerber file…
              </div>
            )}

            {parsed && !loading && !parsed.__error && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {parsed.layer_count} layers detected
                </div>
                <button onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  Reset
                </button>
              </div>
            )}

            {parsed?.__error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
                <AlertCircle className="w-4 h-4" />
                {parsed.__error}
              </div>
            )}

            {/* PCB viewer — always shown (default stack before upload) */}
            <Suspense fallback={null}>
              <GerberViewer file={gerberFile} layers={layers} />
            </Suspense>

            {/* Pricing */}
            <CalculationCard pricing={pricing} />
          </aside>

          {/* ── Right: config form ── */}
          <div>
            <PCBLayoutForm
              parsed={parsed && !parsed.__error ? parsed : null}
              onPricing={setPricing}
            />
          </div>

        </div>
      </main>
    </div>
  )
}
