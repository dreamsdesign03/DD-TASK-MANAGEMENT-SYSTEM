import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import MyTasksPage from './pages/MyTasksPage'
import TaskDetailPage from './pages/TaskDetailPage'
import NotificationsPage from './pages/NotificationsPage'
import ChatPage from './pages/ChatPage'

import MonthlyReportPage from './pages/MonthlyReportPage'
import ProfilePage from './pages/ProfilePage'
import TeamPage from './pages/TeamPage'

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

export default function App() {
  return (
    <HashRouter>
      <GlobalNav />
      <Routes>
        {/* Default → login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* App routes */}
        <Route path="/tasks" element={<MyTasksPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />

        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/groups" element={<ChatPage initialTab="groups" />} />
        <Route path="/dashboard" element={<MyTasksPage />} />
        <Route path="/projects" element={<MyTasksPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/reports" element={<MonthlyReportPage />} />
        <Route path="/settings" element={<ProfilePage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  )
}

