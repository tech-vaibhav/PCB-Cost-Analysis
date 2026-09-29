import { Check } from 'lucide-react'
import { Button } from '../../components/ui'

export default function SaveBar({ cfg }) {
  if (!cfg.dirty && !cfg.justSaved && !cfg.error) return null
  return (
    <div className="fixed inset-x-0 bottom-16 z-10 border-t border-slate-200 bg-white px-4 py-3 lg:sticky lg:bottom-4 lg:mt-6 lg:rounded-xl lg:border lg:shadow-sm lg:shadow-slate-200">
      <div className="flex items-center gap-2">
        {cfg.error ? (
          <p role="alert" className="flex-1 min-w-0 text-xs text-red-600 line-clamp-2">{cfg.error}</p>
        ) : cfg.dirty ? (
          <p className="flex-1 text-sm text-slate-600">{cfg.changes} unsaved change{cfg.changes === 1 ? '' : 's'}</p>
        ) : (
          <p role="status" className="flex-1 flex items-center gap-1.5 text-sm font-medium text-emerald-700"><Check className="w-4 h-4" />Saved</p>
        )}
        {cfg.dirty && (
          <>
            <Button variant="secondary" onClick={cfg.discard} disabled={cfg.busy}>Discard</Button>
            <Button onClick={cfg.save} loading={cfg.busy}>Save</Button>
          </>
        )}
      </div>
    </div>
  )
}
