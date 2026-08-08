import { useState, useEffect, useRef } from 'react'
import JSZip from 'jszip'
import pcbStackup from 'pcb-stackup'

/**
 * GerberViewer — renders top and bottom PCB views from a Gerber ZIP file.
 *
 * Uses the `pcb-stackup` library (same engine as tracespace.io) to convert
 * all layers in the ZIP into two realistic SVG renders: top side and bottom side.
 *
 * Props:
 *   file  — the raw File object (ZIP) from the upload input
 */
export default function GerberViewer({ file }) {
  const [topSvg,    setTopSvg]    = useState(null)
  const [bottomSvg, setBottomSvg] = useState(null)
  const [error,     setError]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [activeSide, setActiveSide] = useState('top')

  useEffect(() => {
    if (!file) {
      setTopSvg(null)
      setBottomSvg(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    setTopSvg(null)
    setBottomSvg(null)

    processZip(file)
      .then(({ top, bottom }) => {
        setTopSvg(top)
        setBottomSvg(bottom)
        setLoading(false)
      })
      .catch(err => {
        console.error('GerberViewer error:', err)
        setError('Could not render PCB preview.')
        setLoading(false)
      })
  }, [file])

  if (!file)     return null
  if (loading)   return <div className="gerber-viewer gerber-viewer--loading"><span className="spinner" /> Rendering PCB preview…</div>
  if (error)     return <div className="gerber-viewer gerber-viewer--error">⚠ {error}</div>
  if (!topSvg && !bottomSvg) return null

  return (
    <div className="gerber-viewer">
      <div className="gerber-viewer-header">
        <span className="gerber-viewer-title">PCB Preview</span>
        <div className="gerber-side-tabs">
          <button
            className={`gerber-side-tab${activeSide === 'top' ? ' gerber-side-tab--active' : ''}`}
            onClick={() => setActiveSide('top')}
          >Top</button>
          <button
            className={`gerber-side-tab${activeSide === 'bottom' ? ' gerber-side-tab--active' : ''}`}
            onClick={() => setActiveSide('bottom')}
          >Bottom</button>
        </div>
      </div>

      <div className="gerber-canvas">
        {activeSide === 'top' && topSvg && (
          <div
            className="gerber-svg-wrap"
            dangerouslySetInnerHTML={{ __html: topSvg }}
          />
        )}
        {activeSide === 'bottom' && bottomSvg && (
          <div
            className="gerber-svg-wrap gerber-svg-wrap--flip"
            dangerouslySetInnerHTML={{ __html: bottomSvg }}
          />
        )}
      </div>

      <p className="gerber-disclaimer">
        Preview is a representation only. Actual board may differ.
      </p>
    </div>
  )
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

async function processZip(file) {
  const zip = await JSZip.loadAsync(file)
  const layers = []

  for (const [filename, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue

    const ext = filename.split('.').pop().toLowerCase()
    const baseName = filename.split('/').pop()

    // Only process Gerber and drill files
    const gerberExts = ['gbr', 'ger', 'gtl', 'gbl', 'gts', 'gbs', 'gto',
                        'gbo', 'gtp', 'gbp', 'gko', 'gm1', 'gm2',
                        'drl', 'drl', 'xln', 'exc', 'ncd', 'txt']
    if (!gerberExts.includes(ext)) continue

    const content = await entry.async('string')
    layers.push({ filename: baseName, content })
  }

  if (layers.length === 0) {
    throw new Error('No Gerber files found in ZIP.')
  }

  // pcb-stackup expects: { filename, gerber } for each layer
  const stackupLayers = layers.map(l => ({
    filename: l.filename,
    gerber:   l.content,
  }))

  const stackup = await pcbStackup(stackupLayers)

  return {
    top:    stackup.top.svg,
    bottom: stackup.bottom.svg,
  }
}
