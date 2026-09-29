import { useState } from 'react'
import { Cpu, LogIn } from 'lucide-react'
import { Button, Field, Input } from '../../components/ui'

export default function LoginPage({ signIn }) {
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      await signIn(form.get('email'), form.get('password'))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-6 sm:p-8 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Cpu className="w-5 h-5 text-emerald-600" />PCB Admin</div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500">Manage pricing rates and lookups.</p>
        </div>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>
        <Field label="Password" htmlFor="password" error={error}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" icon={LogIn} loading={busy} className="w-full">Sign in</Button>
      </form>
    </main>
  )
}
