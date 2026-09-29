import { Loader2 } from 'lucide-react'

export default function Spinner({ size = 18, className = '' }) {
  return <Loader2 className={`animate-spin text-slate-400 ${className}`} style={{ width: size, height: size }} aria-label="Loading" />
}
