import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Cpu, ExternalLink, FlaskConical, LogOut, SlidersHorizontal, Table2 } from 'lucide-react'
import { Badge, Button, Card, Spinner } from '../../components/ui'
import usePricingConfig from './usePricingConfig'
import SaveBar from './SaveBar'

const NAV = [
  { to: '/admin', label: 'Rates', icon: SlidersHorizontal },
  { to: '/admin/lookups', label: 'Lookups', icon: Table2 },
  { to: '/admin/quote-lab', label: 'Quote Lab', icon: FlaskConical },
]
const UNITS = [['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]]
const ago = (iso) => {
  const s = (new Date(iso) - Date.now()) / 1000
  const [unit, size] = UNITS.find(([, d]) => Math.abs(s) >= d) ?? UNITS[3]
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round(s / size), unit)
}
const HINT = 'Run supabase/schema.sql then save once'
const iconBtn = 'inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900'
const sideLink = (active) => `flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`

export default function AdminLayout({ auth }) {
  const cfg = usePricingConfig(auth.token, auth.signOut)
  const { pathname } = useLocation()
  const wide = pathname.includes('quote-lab') ? 'max-w-[1280px]' : 'max-w-[960px]'
  const title = NAV.find((n) => n.to === pathname.replace(/\/$/, ''))?.label ?? 'Admin'

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 lg:pl-56">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-56 flex-col border-r border-slate-200 bg-white px-3 py-4">
        <div className="flex items-center gap-2 px-2.5 mb-6 text-sm font-semibold"><Cpu className="w-5 h-5 text-emerald-600" />PCB Admin</div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => sideLink(isActive)}><Icon className="w-4 h-4" />{label}</NavLink>
          ))}
        </nav>
        <a href="/" target="_blank" rel="noreferrer" className={`mt-auto ${sideLink(false)}`}><ExternalLink className="w-4 h-4" />Customer page</a>
      </aside>

      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className={`${wide} mx-auto flex items-center gap-2.5 h-14 px-4 lg:px-8`}>
          <h1 className="text-base font-semibold">{title}</h1>
          {cfg.source === 'defaults' && <span title={HINT}><Badge tone="warning" icon={AlertTriangle}>Using defaults</Badge></span>}
          {cfg.source === 'defaults' && <span className="hidden xl:inline text-xs text-slate-400">{HINT}</span>}
          {cfg.source === 'supabase' && <Badge tone="success" icon={CheckCircle2}>{cfg.updatedAt ? `Saved ${ago(cfg.updatedAt)}` : 'Saved'}</Badge>}
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden md:block mr-2 text-xs text-slate-500 truncate max-w-48">{auth.user?.email}</span>
            <a href="/" target="_blank" rel="noreferrer" aria-label="Open customer page" className={`lg:hidden ${iconBtn}`}><ExternalLink className="w-4 h-4" /></a>
            <button type="button" aria-label="Sign out" title="Sign out" onClick={auth.signOut} className={iconBtn}><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className={`${wide} mx-auto px-4 pt-5 pb-40 lg:px-8 lg:pb-10`}>
        {cfg.draft ? (
          <Outlet context={{ cfg, token: auth.token, signOut: auth.signOut }} />
        ) : cfg.error ? (
          <Card title="Could not load pricing config" description={cfg.error}>
            <Button variant="secondary" onClick={cfg.reload} loading={cfg.busy}>Retry</Button>
          </Card>
        ) : (
          <div className="grid place-items-center py-24"><Spinner /></div>
        )}
        {cfg.draft && <SaveBar cfg={cfg} />}
      </main>

      <nav aria-label="Admin" className="lg:hidden fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 h-16 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
            <Icon className="w-5 h-5" />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
