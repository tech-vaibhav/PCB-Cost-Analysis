import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Cpu, ExternalLink, LogOut } from 'lucide-react'
import { Button, Card, Spinner } from '../../components/ui'
import usePricingConfig from './usePricingConfig'
import SaveBar from './SaveBar'
import { GROUPS, PAGES, pageByKey } from './nav'

const iconBtn = 'inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900'
const sideLink = (active) => `flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`

export default function AdminLayout({ auth }) {
  const cfg = usePricingConfig(auth.token, auth.signOut)
  const { pathname } = useLocation()
  const wide = pathname.includes('quote-lab') ? 'max-w-[1280px]' : 'max-w-[960px]'

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 lg:pl-60">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-slate-200 bg-white px-3 py-4">
        <div className="flex items-center gap-2 px-2.5 mb-5 text-sm font-semibold"><Cpu className="w-5 h-5 text-slate-900" />PCB Admin</div>
        <nav aria-label="Admin" className="flex flex-col gap-4">
          {GROUPS.map(({ label, keys }) => (
            <div key={keys[0]} className="flex flex-col gap-0.5">
              {label && <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>}
              {keys.map((k) => {
                const { to, label: text, icon: Icon } = pageByKey[k]
                return <NavLink key={k} to={to} end className={({ isActive }) => sideLink(isActive)}><Icon className="w-4 h-4" />{text}</NavLink>
              })}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-0.5 border-t border-slate-100 pt-3">
          <a href="/" target="_blank" rel="noreferrer" className={sideLink(false)}><ExternalLink className="w-4 h-4" />Customer page</a>
          <div className="flex items-center gap-2 pl-2.5">
            <span className="flex-1 min-w-0 truncate text-xs text-slate-500" title={auth.user?.email}>{auth.user?.email}</span>
            <button type="button" aria-label="Sign out" title="Sign out" onClick={auth.signOut} className={iconBtn}><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-20 flex items-center h-14 px-4 border-b border-slate-200 bg-white/90 backdrop-blur">
        <p className="flex-1 flex items-center gap-2 text-sm font-semibold"><Cpu className="w-4 h-4 text-slate-900" />PCB Admin</p>
        <button type="button" aria-label="Sign out" title="Sign out" onClick={auth.signOut} className={iconBtn}><LogOut className="w-4 h-4" /></button>
      </header>

      <main className={`${wide} mx-auto px-4 pt-5 pb-40 lg:px-8 lg:pt-8 lg:pb-10`}>
        {cfg.draft || (cfg.error && pathname === '/admin') ? (
          <Outlet context={{ cfg, token: auth.token, signOut: auth.signOut, user: auth.user }} />
        ) : cfg.error ? (
          <Card title="Could not load pricing config" description={cfg.error}>
            <Button variant="secondary" onClick={cfg.reload} loading={cfg.busy}>Retry</Button>
          </Card>
        ) : (
          <div className="grid place-items-center py-24"><Spinner /></div>
        )}
        {cfg.draft && <SaveBar cfg={cfg} />}
      </main>

      <nav aria-label="Admin" className="lg:hidden fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 h-16 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        {PAGES.map(({ key, to, short, icon: Icon }) => (
          <NavLink key={key} to={to} end className={({ isActive }) => `flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
            <Icon className="w-5 h-5" />{short}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
