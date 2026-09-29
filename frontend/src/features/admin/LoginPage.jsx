import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Button, Field, Input } from '../../components/ui'
import AuthCard, { authLink } from './AuthCard'

const message = (e) =>
  e.status === 401 ? 'Invalid email or password. If your request was declined, your details have been removed.'
    : e.status ? e.message : 'Could not reach the server.'

export default function LoginPage({ signIn }) {
  const navigate = useNavigate()
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
      if (err.code === 'pending') return navigate('/admin/pending')
      setError(message(err))
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Sign in" description="Manage pricing rates and lookups." onSubmit={submit}
      footer={<>No account? <Link to="/admin/signup" className={authLink}>Request access</Link></>}>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password" error={error}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" icon={LogIn} loading={busy} className="w-full">Sign in</Button>
    </AuthCard>
  )
}
