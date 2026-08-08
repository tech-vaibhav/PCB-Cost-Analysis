// CalculationCard — live pricing sidebar widget
export default function CalculationCard({ pricing, loading }) {
  const fmt = (val) =>
    val != null ? `₹ ${Number(val).toLocaleString('en-IN')}` : '—'

  const plans = [
    {
      key:       'express_48hr',
      lead:      '48 hr',
      label:     'Express',
      highlight: true,
      total:     pricing?.express_48hr?.total,
      single:    pricing?.express_48hr?.single,
    },
    {
      key:       'standard_7wd',
      lead:      '7 WD',
      label:     'Standard',
      highlight: false,
      total:     pricing?.standard_7wd?.total,
      single:    pricing?.standard_7wd?.single,
    },
  ]

  return (
    <div className="card calc-card">
      <div className="calc-header">Calculation</div>

      <div className="calc-plans">
        {plans.map((plan) => (
          <div key={plan.key} className={`calc-plan${plan.highlight ? ' calc-plan--express' : ''}`}>
            <div className="calc-plan-top">
              <div>
                <div className="calc-plan-lead">{plan.lead}</div>
                <div className="calc-plan-type">{plan.label}</div>
              </div>
              <button className="calc-cart-btn" disabled={!pricing}>
                🛒 Add to Cart
              </button>
            </div>

            <div className="calc-plan-prices">
              <div className="calc-price-block">
                <div className="calc-price-label">Single piece</div>
                <div className={`calc-price-value${loading ? ' calc-price--loading' : ''}`}>
                  {loading ? '…' : fmt(plan.single)}
                </div>
              </div>
              <div className="calc-price-divider" />
              <div className="calc-price-block">
                <div className="calc-price-label">Order value</div>
                <div className={`calc-price-value${loading ? ' calc-price--loading' : ''}`}>
                  {loading ? '…' : fmt(plan.total)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown hint — only shown when we have a result */}
      {pricing?.breakdown && (
        <div className="calc-breakdown">
          <span>Panel: {pricing.breakdown.pieces_per_column}×{pricing.breakdown.columns_needed} layout</span>
          <span>{pricing.breakdown.area_used_mm2} mm² used</span>
        </div>
      )}

      <div className="gst-row">
        <span>GST (12% included)</span>
        <span className="gst-val">+12%</span>
      </div>
    </div>
  )
}
