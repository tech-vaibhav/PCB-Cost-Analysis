import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { Button } from '../../components/ui'
import AuthCard from './AuthCard'

export default function PendingPage() {
  const navigate = useNavigate()
  return (
    <AuthCard icon={Clock} title="Your request is under review"
      description="An admin has to approve your account before you can sign in. Sign in again later to check; once approved you will be taken straight to the panel. If the request is declined your details are deleted.">
      <div className="flex flex-col gap-2">
        <Button onClick={() => navigate('/admin/login')} className="w-full">Sign in</Button>
        <Button variant="secondary" onClick={() => navigate('/')} className="w-full">Back to customer page</Button>
      </div>
    </AuthCard>
  )
}
