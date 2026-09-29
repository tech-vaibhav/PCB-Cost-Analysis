import { ChevronDown } from 'lucide-react'
import { inputClass } from './Input'

// options: array of strings or { value, label }
export default function Select({ options = [], className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      <select className={`${inputClass} appearance-none pr-9`} {...props}>
        {options.map((o) => {
          const value = typeof o === 'object' ? o.value : o
          const label = typeof o === 'object' ? o.label : o
          return <option key={value} value={value}>{label}</option>
        })}
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}
