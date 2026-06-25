import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useApp } from './context/AppContext'
import LoginPage from './pages/LoginPage'
import MyTasksPage from './pages/MyTasksPage'
import TaskDetailPage from './pages/TaskDetailPage'
import NotificationsPage from './pages/NotificationsPage'
import ChatPage from './pages/ChatPage'

import MonthlyReportPage from './pages/MonthlyReportPage'
import ProfilePage from './pages/ProfilePage'
import ProjectOverviewPage from './pages/ProjectOverviewPage'
import TeamPage from './pages/TeamPage'
import ClientsPage from './pages/ClientsPage'

function GlobalNav() {
  const navigate = useNavigate()
  
  useEffect(() => {
    const handleNav = (e) => {
      if (e.detail?.path) {
        navigate(e.detail.path)
      }
    }
    window.addEventListener('dd_navigate', handleNav)
    return () => window.removeEventListener('dd_navigate', handleNav)
  }, [navigate])

  return null
}

function ProtectedRoute({ children }) {
  const { profile } = useApp()
  const searchParams = new URLSearchParams(window.location.search)

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  if (searchParams.get('desktop') === 'true' && profile.email) {
    window.location.href = `dreamsdesk://login?email=${encodeURIComponent(profile.email)}`
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-surface text-primary">
        <p className="font-label-lg">Redirecting to Dreamsdesk App...</p>
      </div>
    )
  }

  return children
}

function RootRedirect() {
  const { profile } = useApp()
  const searchParams = new URLSearchParams(window.location.search)

  if (profile && profile.email) {
    if (searchParams.get('desktop') === 'true') {
      window.location.href = `dreamsdesk://login?email=${encodeURIComponent(profile.email)}`
      return (
        <div className="flex items-center justify-center min-h-[100dvh] bg-surface text-primary">
          <p className="font-label-lg">Redirecting to Dreamsdesk App...</p>
        </div>
      )
    }
    return <Navigate to="/tasks" replace />
  }
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <HashRouter>
      <GlobalNav />
      <Routes>
        {/* Default */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        {/* App routes */}
        <Route path="/tasks" element={<ProtectedRoute><MyTasksPage /></ProtectedRoute>} />
        <Route path="/tasks/:taskId" element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>} />

        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/chat/groups" element={<ProtectedRoute><ChatPage initialTab="groups" /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><MyTasksPage /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><MyTasksPage /></ProtectedRoute>} />
        <Route path="/projects/:projectName" element={<ProtectedRoute><ProjectOverviewPage /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><MonthlyReportPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  )
}

