import { Check } from 'lucide-react'

export default function AutoBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-semibold text-emerald-700">
      <Check className="w-2.5 h-2.5" strokeWidth={3} />
      Auto-detected
    </span>
  )
}
