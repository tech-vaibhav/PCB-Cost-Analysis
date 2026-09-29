import { ChevronDown } from 'lucide-react'
import { InfoTip } from '../../components/ui'
import { tipRow } from './SettingRow'

export default function Section({ icon: Icon, tint = 'bg-slate-100 text-slate-900', title, description, help, action, children }) {
  return (
    <details open className="group bg-white rounded-xl border border-slate-200">
      <summary className="flex items-center gap-3 px-4 py-3.5 sm:px-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {Icon && <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${tint}`}><Icon className="w-4 h-4" /></span>}
        <div className="min-w-0 flex-1">
          <div className={tipRow}>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {help && <span onClick={(e) => e.preventDefault()}><InfoTip title={title} text={help} /></span>}
          </div>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        {action}
        <ChevronDown className="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-2 sm:px-5 border-t border-slate-100">{children}</div>
    </details>
  )
}
