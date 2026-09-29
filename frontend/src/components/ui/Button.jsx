import Spinner from './Spinner'

const VARIANTS = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:text-slate-300',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
}
const SIZES = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-5 text-base gap-2' }

export default function Button({ variant = 'primary', size = 'md', icon: Icon, loading, className = '', children, ...props }) {
  return (
    <button
      type="button"
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Spinner size={14} /> : Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
    </button>
  )
}
