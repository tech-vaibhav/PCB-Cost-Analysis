import { useState, lazy, Suspense } from 'react'
import './App.css'
import UploadZone from './components/UploadZone'
import CalculationCard from './components/CalculationCard'
import PCBLayoutForm from './components/PCBLayoutForm'
const GerberViewer = lazy(() => import('./components/GerberViewer'))



export default function App() {
  const [parsed,       setParsed]       = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [pricing,      setPricing]      = useState(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [gerberFile,   setGerberFile]   = useState(null)

  const handleParsed = (data) => {
    setParsed(data)
    setPricing(null)
  }

  const handlePricing = (data) => {
    setPricing(data)
  }

  const handleFile = (file) => {
    setGerberFile(file)
  }


  return (
    <>
      {/* ── Header ──────────────────────────────────────── */}
      <header className="app-header">
        <div className="app-header-logo">⚡ PCB Analyzer</div>
        <span className="app-header-sub">Gerber file parser &amp; specification tool</span>
      </header>

      {/* ── Body ────────────────────────────────────────── */}
      <main className="app-body">

        {/* Left sidebar */}
        <div className="sidebar">
          <UploadZone onParsed={handleParsed} onLoading={setLoading} onFile={handleFile} />


          {/* Parse status */}
          {loading && (
            <div className="parse-status parse-status--loading">
              <span className="spinner" />
              Parsing Gerber file…
            </div>
          )}

          {parsed && !loading && !parsed.__error && (
            <div className="parse-status parse-status--success">
              ✓ Parsed successfully — {parsed.layer_count} layers detected
            </div>
          )}

          {parsed?.__error && (
            <div className="parse-status parse-status--error">
              ✗ {parsed.__error}
            </div>
          )}
          {/* PCB Visual Preview */}
          <Suspense fallback={null}>
            <GerberViewer file={gerberFile} />
          </Suspense>


          <CalculationCard pricing={pricing} loading={priceLoading} />

        </div>

        {/* Right: PCB Layout form */}
        <PCBLayoutForm
          parsed={parsed && !parsed.__error ? parsed : null}
          onPricing={handlePricing}
        />


      </main>
    </>
  )
}
