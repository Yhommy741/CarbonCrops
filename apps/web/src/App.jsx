import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import { Loading } from './components/ui.jsx'
import Carbon from './pages/Carbon.jsx'
import Certificate from './pages/Certificate.jsx'
import CycleDetail from './pages/CycleDetail.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import NewPlot from './pages/NewPlot.jsx'
import Notifications from './pages/Notifications.jsx'
import PlotDetail from './pages/PlotDetail.jsx'
import Reports from './pages/Reports.jsx'
import VerifyQueue from './pages/VerifyQueue.jsx'

function App() {
  const { user, ready } = useAuth()
  if (!ready) return <Loading />
  if (!user) return <Login />

  const isReviewer = user.role === 'verifier' || user.role === 'admin'
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="plots/new" element={<NewPlot />} />
        <Route path="plots/:plotId" element={<PlotDetail />} />
        <Route path="cycles/:cycleId" element={<CycleDetail />} />
        <Route path="carbon" element={<Carbon />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/:reportId" element={<Certificate />} />
        <Route path="notifications" element={<Notifications />} />
        {isReviewer && <Route path="verify" element={<VerifyQueue />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
