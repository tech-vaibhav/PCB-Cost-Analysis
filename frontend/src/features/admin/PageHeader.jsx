import { Tabs } from '../../components/ui'

// Header for every admin page: tinted icon chip, title, one-line description, optional action and tabs.
export default function PageHeader({ page, title, description, action, tabs, tab, onTab }) {
  const Icon = page.icon
  return (
    <div className="mb-6">
      <div className="flex items-start gap-3">
        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${page.color}`}><Icon className="w-5 h-5" /></span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title ?? page.label}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{description ?? page.description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {tabs && <Tabs items={tabs} value={tab} onChange={onTab} className="mt-5 w-full sm:w-auto" />}
    </div>
  )
}
