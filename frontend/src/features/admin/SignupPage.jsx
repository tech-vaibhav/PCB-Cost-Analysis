import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { Button, Field, Input, inputClass } from '../../components/ui'
import { signup } from '../../api/auth'
import AuthCard, { authLink } from './AuthCard'

const FIELDS = [
  ['name', 'Name', { autoComplete: 'name', autoFocus: true }],
  ['phone', 'Phone', { type: 'tel', autoComplete: 'tel', minLength: 5 }],
  ['email', 'Email', { type: 'email', autoComplete: 'email' }],
  ['password', 'Password', { type: 'password', autoComplete: 'new-password', minLength: 8 }, 'At least 8 characters'],
]

export default function SignupPage() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const { name, phone, email, password, note } = Object.fromEntries(new FormData(form))
    form.password.value = ''
    setBusy(true)
    setError(null)
    try {
      await signup({ name: name.trim(), phone: phone.trim(), email: email.trim(), password, note: note.trim() || undefined })
      navigate('/admin/pending')
    } catch (err) {
      setError(err.status ? err.message : 'Could not reach the server.')
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Request access" description="An admin reviews every request before you can sign in." onSubmit={submit}
      footer={<>Already approved? <Link to="/admin/login" className={authLink}>Sign in</Link></>}>
      {FIELDS.map(([id, label, props, hint]) => (
        <Field key={id} label={label} htmlFor={id} hint={hint}>
          <Input id={id} name={id} required pattern={id === 'password' ? undefined : '.*\\S.*'} {...props} />
        </Field>
      ))}
      <Field label="Note (optional)" htmlFor="note" hint="Tell the admin who you are and why you need access">
        <textarea id="note" name="note" rows={3} maxLength={500} className={`${inputClass} min-h-20 py-2 resize-y`} />
      </Field>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <Button type="submit" icon={UserPlus} loading={busy} className="w-full">Request access</Button>
    </AuthCard>
  )
}
