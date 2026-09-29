export const inputClass =
  'w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400'

export default function Input({ suffix, className = '', ...props }) {
  if (!suffix) return <input className={`${inputClass} ${className}`} {...props} />
  return (
    <div className={`relative ${className}`}>
      <input className={`${inputClass} pr-12`} {...props} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">{suffix}</span>
    </div>
  )
}
