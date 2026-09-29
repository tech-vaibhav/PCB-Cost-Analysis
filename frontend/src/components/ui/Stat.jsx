export default function Stat({ label, value, detail, hero = false, tone = 'default' }) {
  const color = { default: 'text-slate-900', good: 'text-emerald-600', bad: 'text-red-600', muted: 'text-slate-400' }[tone]
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`font-semibold tabular-nums truncate ${hero ? 'text-2xl sm:text-3xl' : 'text-lg'} ${color}`}>{value}</span>
      {detail && <span className="text-xs text-slate-500 truncate">{detail}</span>}
    </div>
  )
}
