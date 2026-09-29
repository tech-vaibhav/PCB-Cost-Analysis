export default function Field({ label, hint, error, badge, htmlFor, className = '', children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="flex items-center gap-2 text-xs font-medium text-slate-600">
          {label}
          {badge}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  )
}
