import { ChevronDown } from 'lucide-react'

export default function Section({ title, hint, action, children }) {
  return (
    <details open className="group bg-white rounded-xl border border-slate-200">
      <summary className="flex items-center gap-3 px-4 py-3.5 sm:px-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
        </div>
        {action}
        <ChevronDown className="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-5 sm:px-5">{children}</div>
    </details>
  )
}
