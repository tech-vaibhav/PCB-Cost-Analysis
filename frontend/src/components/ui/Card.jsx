export default function Card({ title, description, action, padding = true, className = '', children }) {
  return (
    <section className={`bg-white rounded-xl border border-slate-200 ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padding ? `px-4 pb-4 sm:px-5 ${title ? '' : 'pt-4'}` : ''}>{children}</div>
    </section>
  )
}
