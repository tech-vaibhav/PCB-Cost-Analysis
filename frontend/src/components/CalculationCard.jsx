import { Zap, Clock, ShoppingCart } from 'lucide-react'

const fmt = (v) => v != null ? `₹ ${Number(v).toLocaleString('en-IN')}` : '—'

export default function CalculationCard({ pricing }) {
  const plans = [
    {
      key: 'express_48hr', qty: 128, lead: '48 hr', icon: <Zap className="w-3.5 h-3.5" />,
      total: pricing?.express_48hr?.total, single: pricing?.express_48hr?.single,
    },
    {
      key: 'standard_7wd', qty: 256, lead: '7 WD', icon: <Clock className="w-3.5 h-3.5" />,
      total: pricing?.standard_7wd?.total, single: pricing?.standard_7wd?.single,
    },
  ]

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">Calculation Summary</h3>
      </div>

      <div className="divide-y divide-slate-100">
        {plans.map((plan) => (
          <div key={plan.key} className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                {plan.icon}
                <span className="text-xs font-medium">{plan.lead} · Qty {plan.qty}</span>
              </div>
              <button
                disabled={!pricing}
                className={[
                  'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150',
                  pricing
                    ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed',
                ].join(' ')}
              >
                <ShoppingCart className="w-3 h-3" />
                Add to Cart
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Single</div>
                <div className={`text-sm font-bold ${pricing ? 'text-slate-800' : 'text-slate-200'}`}>
                  {fmt(plan.single)}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Total</div>
                <div className={`text-sm font-bold ${pricing ? 'text-blue-600' : 'text-slate-200'}`}>
                  {fmt(plan.total)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pricing?.breakdown && (
        <div className="flex items-center justify-between px-4 py-2 text-[11px] text-slate-400 bg-slate-50 border-t border-slate-100">
          <span>Panel {pricing.breakdown.pieces_per_column}×{pricing.breakdown.columns_needed}</span>
          <span>{pricing.breakdown.area_used_mm2} mm²</span>
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 bg-slate-50">
        <span>GST (12%) included</span>
        {!pricing && <span className="text-[11px]">Enter dimensions to calculate</span>}
      </div>
    </div>
  )
}
