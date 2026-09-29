import { AlertCircle, Ruler, Truck } from 'lucide-react'
import { Spinner, Stat } from '../../components/ui'
import { inr, pct } from '../../lib/format'

const Row = ({ label, value, strong }) => (
  <div className={`flex justify-between gap-4 ${strong ? 'text-base font-semibold text-slate-900' : 'text-sm text-slate-600'}`}>
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
)

export default function QuoteSummary({ quote, loading, error }) {
  if (error) {
    return (
      <div className="flex gap-2 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    )
  }
  if (!quote) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-slate-500">
        {loading ? <Spinner /> : <Ruler className="w-5 h-5 text-slate-300" />}
        Enter board size and quantity
      </div>
    )
  }
  const { panel } = quote
  return (
    <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <Stat hero label="Price per board" value={inr(quote.pricePerBoard)} detail={`${quote.quantity} boards`} />
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
        <Row label="Subtotal" value={inr(quote.subtotal)} />
        {quote.engFee > 0 && <Row label="Engineering fee" value={inr(quote.engFee)} />}
        <Row label={`GST (${quote.gstPct}%)`} value={inr(quote.gst)} />
        <Row strong label="Total" value={inr(quote.total)} />
      </div>
      <div className="flex flex-col gap-1.5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" />Ships in {quote.delivery}</span>
        {panel?.boardsPerPanel > 0 && <span>{panel.boardsPerPanel} boards per panel, {pct(panel.utilizationPct)} panel utilization</span>}
      </div>
      {quote.summary && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-slate-100 pt-4 text-xs">
          {Object.entries(quote.summary).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-slate-800 text-right">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
