import { Link, useOutletContext } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronRight, Users } from 'lucide-react'
import { Badge, Button, Card } from '../../components/ui'
import { ago, inr } from '../../lib/format'
import { GROUPS, pageByKey } from './nav'
import PageHeader from './PageHeader'
import useAdmins from './useAdmins'

const AREAS = GROUPS.filter((g) => g.label)

export default function OverviewPage() {
  const { cfg, token, signOut } = useOutletContext()
  const admins = useAdmins(token, signOut)
  const { draft } = cfg
  const { rates, constants } = draft ?? {}
  const tiles = draft && [
    ['Fab source', rates.fabSource === 'inhouse' ? 'In-house' : 'Outsource', '/admin/costs?tab=production'],
    ['Markup', rates.markupOverridePct != null ? `${rates.markupOverridePct}%` : 'Auto by quantity', '/admin/pricing?tab=policy'],
    ['Beat competitor', rates.beatCompetitor ? `${constants.beatCompetitorPct}% below cheapest` : 'Off', '/admin/pricing?tab=policy'],
    ['GST', `${constants.gstPct}%`, '/admin/pricing?tab=policy'],
    ['USD rate', inr(constants.usdInr), '/admin/pricing?tab=policy'],
  ]

  return (
    <>
      <PageHeader page={pageByKey.overview} />
      <div className="flex flex-col gap-5">

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-slate-100 text-slate-900">{draft ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Pricing config</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {draft ? (cfg.updatedAt ? `Saved ${ago(cfg.updatedAt)}` : 'Saved') : (cfg.error ?? 'Pricing tables could not be read.') + ' Run supabase/schema.sql, seed.sql and every file in supabase/migrations in the Supabase SQL editor.'}
              </p>
              {!draft && <Button variant="secondary" size="sm" className="mt-2" onClick={cfg.reload} loading={cfg.busy}>Retry</Button>}
            </div>
          </div>
          <Link to="/admin/team" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 sm:border-l sm:border-slate-100 sm:pl-4">
            <Users className="w-4 h-4 text-slate-400" />
            {admins.loading ? 'Loading admins' : admins.error ? 'Admins unavailable' : `${admins.admins.length} admin${admins.admins.length === 1 ? '' : 's'}`}
            {admins.pending.length > 0 && <Badge tone="warning">{admins.pending.length} pending request{admins.pending.length === 1 ? '' : 's'}</Badge>}
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </Card>

      {tiles && <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">At a glance</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {tiles.map(([label, value, to]) => (
            <Link key={label} to={to} className="flex flex-col gap-0.5 rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 hover:shadow-sm transition">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
              <span className="text-base font-semibold text-slate-900">{value}</span>
            </Link>
          ))}
        </div>
      </section>}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Areas</h2>
        <div className="flex flex-col gap-4 lg:hidden">
          {AREAS.map((g) => (
            <div key={g.label}>
              <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{g.label}</p>
              <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {g.keys.map((k) => <li key={k}><AreaLink page={pageByKey[k]} className="px-3.5 py-3 active:bg-slate-50" /></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="hidden lg:grid grid-cols-2 gap-3">
          {AREAS.flatMap((g) => g.keys).map((k) => (
            <AreaLink key={k} page={pageByKey[k]} className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition" />
          ))}
        </div>
      </section>
      </div>
    </>
  )
}

function AreaLink({ page, className }) {
  const Icon = page.icon
  return (
    <Link to={page.to} className={`flex items-center gap-3 ${className}`}>
      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${page.color}`}><Icon className="w-4 h-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-900">{page.label}</span>
        <span className="block text-xs text-slate-500 line-clamp-2">{page.description}</span>
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-slate-300" />
    </Link>
  )
}
