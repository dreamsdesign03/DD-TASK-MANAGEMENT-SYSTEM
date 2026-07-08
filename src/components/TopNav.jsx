import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { renderAvatar } from '../utils/avatar'

export default function TopNav({ title, badgeCount, showSearch = true }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { searchQuery, setSearchQuery, profile, notifications, isDarkMode, setIsDarkMode, setIsSidebarOpen } = useApp()

  const unreadCount = notifications?.filter((n) => n.unread).length || 0
  const isSearchVisible = showSearch && (location.pathname === '/tasks' || location.pathname === '/my-tasks' || location.pathname === '/team' || location.pathname === '/clients')

  return (
    <header style={{
      height: 72, background: isDarkMode ? '#1e1b2e' : 'white', margin: '12px 12px 0',
      borderRadius: 20, boxShadow: '0 8px 24px rgba(91,33,182,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', flexShrink: 0,
      zIndex: 40,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: isDarkMode ? '#fff' : '#1E1B2E', margin: 0 }}>
          {title || 'Dashboard'}
        </h1>
        {badgeCount !== undefined && (
          <span style={{ padding: '4px 12px', background: '#F5F3FF', color: '#702c91', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
            {badgeCount}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {isSearchVisible && (
          <div style={{ position: 'relative', width: 300 }} className="hidden md:block">
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 20 }}>search</span>
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', height: 42, background: isDarkMode ? '#2d2a3d' : '#F8F7FC', border: 'none', borderRadius: 999,
                paddingLeft: 44, paddingRight: 16, fontSize: 14, outline: 'none', color: isDarkMode ? '#fff' : '#1E1B2E',
                fontFamily: 'Inter,sans-serif',
              }} 
            />
          </div>
        )}
        
        <button 
          onClick={() => navigate('/notifications')}
          style={{ position: 'relative', width: 40, height: 40, background: '#FEF2F2', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="material-symbols-outlined" style={{ color: '#DC2626', fontSize: 20 }}>notifications</span>
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: 0, right: 0, width: 10, height: 10, background: '#EF4444', border: '2px solid #FEF2F2', borderRadius: '50%' }} />
          )}
        </button>

        <button 
          onClick={() => navigate('/chat')}
          style={{ width: 40, height: 40, background: '#EFF6FF', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="material-symbols-outlined" style={{ color: '#2563EB', fontSize: 20 }}>chat_bubble</span>
        </button>

        <div 
          onClick={() => navigate('/settings')}
          className="cursor-pointer"
          title={profile?.name}
        >
          {renderAvatar(profile?.avatar, profile?.name, "w-10 h-10 rounded-full", "text-[14px]", profile?.email)}
        </div>
      </div>
    </header>
  )
}
