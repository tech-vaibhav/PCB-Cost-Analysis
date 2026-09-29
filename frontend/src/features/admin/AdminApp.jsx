import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '../../components/ui'
import useAuth from './useAuth'
import AdminLayout from './AdminLayout'
import LoginPage from './LoginPage'
import SignupPage from './SignupPage'
import PendingPage from './PendingPage'
import OverviewPage from './OverviewPage'
import PricingPage from './PricingPage'
import CostsPage from './CostsPage'
import QuoteLabPage from './QuoteLabPage'
import TeamPage from './TeamPage'

export default function AdminApp() {
  const auth = useAuth()
  if (auth.loading) return <div className="min-h-dvh grid place-items-center bg-slate-50"><Spinner /></div>
  const guest = (page) => (auth.user ? <Navigate to="/admin" replace /> : page)
  return (
    <Routes>
      <Route path="login" element={guest(<LoginPage signIn={auth.signIn} />)} />
      <Route path="signup" element={guest(<SignupPage />)} />
      <Route path="pending" element={guest(<PendingPage />)} />
      <Route element={auth.user ? <AdminLayout auth={auth} /> : <Navigate to="/admin/login" replace />}>
        <Route index element={<OverviewPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="costs" element={<CostsPage />} />
        <Route path="quote-lab" element={<QuoteLabPage />} />
        <Route path="team" element={<TeamPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
