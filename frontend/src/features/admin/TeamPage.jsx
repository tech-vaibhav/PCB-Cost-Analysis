import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Check, Trash2, X } from 'lucide-react'
import { Badge, Button, Card, Spinner } from '../../components/ui'
import { ago, day } from '../../lib/format'
import PageHeader from './PageHeader'
import { pageByKey } from './nav'
import useAdmins from './useAdmins'

const row = 'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5'
const list = 'divide-y divide-slate-100 border-t border-slate-100'

export default function TeamPage() {
  const { token, signOut } = useOutletContext()
  const team = useAdmins(token, signOut)
  const [busy, setBusy] = useState(null)
  const stats = [['Admins', team.admins.length], ['Pending', team.pending.length]]

  const act = (id, fn, question) => async () => {
    if (question && !window.confirm(question)) return
    setBusy(id)
    try {
      await fn(id)
    } catch (e) {
      window.alert(e.status ? e.message : 'Could not reach the server.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader page={pageByKey.team} />
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          {stats.map(([label, n]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
              <p className="text-lg font-semibold tabular-nums">{team.loading ? '-' : n}</p>
            </div>
          ))}
        </div>
        {team.loading ? (
          <Card><div className="grid place-items-center py-10"><Spinner /></div></Card>
        ) : team.error ? (
          <Card>
            <div className="flex items-center gap-3">
              <p role="alert" className="flex-1 text-sm text-red-600">{team.error}</p>
              <Button variant="secondary" size="sm" onClick={team.reload}>Retry</Button>
            </div>
          </Card>
        ) : (
          <>
            {team.pending.length > 0 && (
              <Card title="Pending requests" description="People asking to sign in to this panel" padding={false}>
                <ul className={list}>
                  {team.pending.map((u) => (
                    <li key={u.id} className={row}>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">{u.name}<Badge tone="warning">Pending</Badge></p>
                        <p className="text-xs text-slate-500 break-all">{u.email} · {u.phone}</p>
                        {u.note && <p className="mt-1 text-xs text-slate-500 whitespace-pre-line">{u.note}</p>}
                        <p className="mt-1 text-xs text-slate-400">Requested {ago(u.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" icon={Check} loading={busy === u.id} onClick={act(u.id, team.approve)}>Approve</Button>
                        <Button size="sm" variant="secondary" icon={X} disabled={busy === u.id} onClick={act(u.id, team.remove, 'Decline and delete this request?')}>Decline</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Card title="Admins" description="Everyone who can sign in to this panel" padding={false}>
              {team.admins.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-slate-500 sm:px-5">No admins yet.</p>
              ) : (
                <ul className={list}>
                  {team.admins.map((u) => (
                    <li key={u.id} className={row}>
                      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                        <span aria-hidden className="inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0 bg-slate-100 text-sm font-semibold uppercase text-slate-900">{u.name[0]}</span>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                            {u.name}<Badge tone="success">Approved</Badge>{u.isYou && <Badge>You</Badge>}
                          </p>
                          <p className="text-xs text-slate-500 break-all">{u.email} · {u.phone}</p>
                          <p className="mt-1 text-xs text-slate-400">Joined {day(u.createdAt)} · Last sign in {day(u.lastSignInAt)}</p>
                        </div>
                      </div>
                      {!u.isYou && (
                        busy === u.id ? <span className="w-9 h-9 grid place-items-center self-end sm:self-auto"><Spinner size={14} /></span> : (
                          <button type="button" onClick={act(u.id, team.remove, `Remove ${u.name}? They will no longer be able to sign in.`)} aria-label={`Remove ${u.name}`} title="Remove"
                            className="inline-flex items-center justify-center w-9 h-9 self-end rounded-lg shrink-0 text-slate-900 hover:bg-slate-100 sm:self-auto">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  )
}
