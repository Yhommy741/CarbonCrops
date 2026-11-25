import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import { Loading } from './components/ui.jsx'
import CalendarDetail from './pages/CalendarDetail.jsx'
import Carbon from './pages/Carbon.jsx'
import Certificate from './pages/Certificate.jsx'
import Dashboard from './pages/Dashboard.jsx'
import FarmerDetail from './pages/FarmerDetail.jsx'
import Farmers from './pages/Farmers.jsx'
import History from './pages/History.jsx'
import Login from './pages/Login.jsx'
import VerifyQueue from './pages/VerifyQueue.jsx'

function App() {
  const { user, ready } = useAuth()
  if (!ready) return <Loading />
  if (!user) return <Login />

  const isReviewer = user.role === 'verifier' || user.role === 'admin'
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={isReviewer ? <Navigate to="/verify" replace /> : <Dashboard />} />
        <Route path="calendars/:calendarId" element={<CalendarDetail />} />
        <Route path="carbon" element={<Carbon />} />
        <Route path="history" element={<History />} />
        <Route path="history/:creditId" element={<Certificate />} />
        {isReviewer && <Route path="verify" element={<VerifyQueue />} />}
        {isReviewer && <Route path="farmers" element={<Farmers />} />}
        {isReviewer && <Route path="farmers/:userId" element={<FarmerDetail />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
