import { Link } from 'react-router-dom'
import { Cpu } from 'lucide-react'

export const authLink = 'font-medium text-slate-900 underline underline-offset-2'

export default function AuthCard({ icon: Icon, title, description, onSubmit, footer, children }) {
  const Tag = onSubmit ? 'form' : 'div'
  return (
    <main className="min-h-dvh grid place-items-center bg-slate-50 px-4 py-8">
      <Tag onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-6 sm:p-8 flex flex-col gap-4">
        {Icon ? (
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-900"><Icon className="w-5 h-5" /></span>
        ) : (
          <Link to="/admin/login" className="flex items-center gap-2 self-start text-sm font-semibold text-slate-900"><Cpu className="w-5 h-5" />PCB Admin</Link>
        )}
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        {children}
        {footer && <p className="text-center text-sm text-slate-500">{footer}</p>}
      </Tag>
    </main>
  )
}
