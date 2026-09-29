import { useState } from 'react'
import { ChevronUp, X } from 'lucide-react'
import { Button, Spinner } from '../../components/ui'
import { inr } from '../../lib/format'
import QuoteSummary from './QuoteSummary'

export default function PriceBar(props) {
  const [open, setOpen] = useState(false)
  const { quote, loading, error } = props
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show price breakdown"
        className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgb(15_23_42/0.06)] text-left"
      >
        {quote ? (
          <>
            <span className="flex-1 min-w-0">
              <span className="block text-lg font-semibold text-slate-900 tabular-nums">
                {inr(quote.pricePerBoard)}<span className="text-xs font-normal text-slate-500"> / board</span>
              </span>
              <span className="block text-xs text-slate-500 truncate">{quote.delivery}</span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold text-slate-900 tabular-nums">{inr(quote.total)}</span>
              <span className="block text-[11px] text-slate-500">incl. GST</span>
            </span>
          </>
        ) : (
          <span className={`flex-1 text-sm ${error ? 'text-red-600' : 'text-slate-500'}`}>{error ? 'Could not price this board. Tap for details' : 'Enter board size and quantity'}</span>
        )}
        {loading ? <Spinner size={16} /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end bg-slate-900/40 animate-fade-in" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Price breakdown"
            className="w-full max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-fade-up"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Your quote</h2>
              <Button variant="ghost" size="sm" icon={X} aria-label="Close" onClick={() => setOpen(false)} />
            </div>
            <QuoteSummary {...props} />
          </div>
        </div>
      )}
    </div>
  )
}
