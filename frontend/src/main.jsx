import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Spinner from './components/ui/Spinner'

const QuotePage = lazy(() => import('./features/quote/QuotePage'))
const AdminApp = lazy(() => import('./features/admin/AdminApp'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen grid place-items-center"><Spinner /></div>}>
        <Routes>
          <Route path="/" element={<QuotePage />} />
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
