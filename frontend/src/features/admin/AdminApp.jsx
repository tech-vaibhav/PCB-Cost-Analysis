import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import useAuth from './useAuth'
import AdminLayout from './AdminLayout'
import LoginPage from './LoginPage'
import RatesPage from './RatesPage'
import LookupsPage from './LookupsPage'
import QuoteLabPage from './QuoteLabPage'

export default function AdminApp() {
  const auth = useAuth()
  if (auth.loading) return <div className="min-h-dvh grid place-items-center bg-slate-50"><Spinner /></div>
  return (
    <Routes>
      <Route path="login" element={auth.session ? <Navigate to="/admin" replace /> : <LoginPage signIn={auth.signIn} />} />
      <Route element={auth.session ? <AdminLayout auth={auth} /> : <Navigate to="/admin/login" replace />}>
        <Route index element={<RatesPage />} />
        <Route path="lookups" element={<LookupsPage />} />
        <Route path="quote-lab" element={<QuoteLabPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
