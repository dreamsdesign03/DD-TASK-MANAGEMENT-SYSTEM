import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { renderAvatar } from '../utils/avatar'

function getISTTimeFromTs(ts) {
  const d = new Date(ts)
  const istOffset = 5.5 * 60 * 60 * 1000
  const ist = new Date(d.getTime() + istOffset)
  return [ist.getUTCHours(), ist.getUTCMinutes(), ist.getUTCSeconds()]
    .map(v => String(v).padStart(2, '0')).join(':')
}

export default function TopNav({ title, badgeCount, showSearch = true }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { searchQuery, setSearchQuery, profile, notifications, isDarkMode, setIsDarkMode, setIsSidebarOpen, isPunchedIn, handlePunchIn, handlePunchOut, punchInTime, todaysSessions } = useApp()

  const [nowTs, setNowTs] = useState(Date.now())
  const [sessionOpen, setSessionOpen] = useState(false)
  const sessionRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleClickOutside = useCallback((e) => {
    if (sessionRef.current && !sessionRef.current.contains(e.target)) setSessionOpen(false)
  }, [])
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  const activeDuration = (() => {
    if (!punchInTime) return null
    const nowSecs = timeToSeconds(getISTTimeFromTs(nowTs))
    const inSecs = timeToSeconds(punchInTime)
    const diff = Math.max(0, nowSecs - inSecs)
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  })()

  function timeToSeconds(t) {
    if (!t) return 0
    const p = t.split(':')
    return parseInt(p[0]||0)*3600 + parseInt(p[1]||0)*60 + parseInt(p[2]||0)
  }

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isPunchedIn && punchInTime && (
            <div ref={sessionRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FDF4', borderRadius: 8, padding: '4px 12px', border: '1px solid #BBF7D0', fontSize: 11, fontWeight: 600, color: '#166534' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span className="material-symbols-outlined" style={{fontSize: 13}}>login</span>
                  <span>{punchInTime}</span>
                </span>
                <span style={{ color: '#94A3B8' }}>|</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span className="material-symbols-outlined" style={{fontSize: 13}}>timer</span>
                  <span>{activeDuration}</span>
                </span>
                {todaysSessions.length > 0 && (
                  <button
                    onClick={() => setSessionOpen(o => !o)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: '#166534' }}
                  >
                    <span className="material-symbols-outlined" style={{fontSize: 16, transform: sessionOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'}}>expand_more</span>
                  </button>
                )}
              </div>
              {sessionOpen && todaysSessions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 100,
                  minWidth: 280, background: 'white', borderRadius: 12,
                  border: '1px solid #E5E7EB', boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                  padding: 12
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>Today's Sessions</div>
                  {todaysSessions.map((s, i) => {
                    const inSecs = timeToSeconds(s.in)
                    const outSecs = s.out ? timeToSeconds(s.out) : timeToSeconds(getISTTimeFromTs(nowTs))
                    const dur = Math.max(0, outSecs - inSecs)
                    const dh = Math.floor(dur / 3600)
                    const dm = Math.floor((dur % 3600) / 60)
                    const ds = dur % 60
                    const durStr = dh > 0 ? `${dh}h ${dm}m` : dm > 0 ? `${dm}m ${ds}s` : `${ds}s`
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, fontSize: 12, background: i === todaysSessions.length - 1 && !s.out ? '#F0FDF4' : 'transparent' }}>
                        <span style={{ fontWeight: 700, color: '#702c91', fontSize: 10, minWidth: 18 }}>#{i + 1}</span>
                        <span style={{ color: '#16A34A', fontWeight: 600 }}>In:</span>
                        <span style={{ fontWeight: 700, color: '#1E1B2E' }}>{s.in}</span>
                        <span style={{ color: '#94A3B8', fontSize: 10 }}>→</span>
                        <span style={{ color: '#DC2626', fontWeight: 600 }}>Out:</span>
                        <span style={{ fontWeight: 700, color: '#1E1B2E' }}>{s.out || <span style={{color: '#16A34A'}}>Active</span>}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#702c91', fontSize: 11 }}>{durStr}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {!isPunchedIn ? (
            <button onClick={handlePunchIn} className="btn-gradient" style={{ border: 'none', padding: '8px 16px', borderRadius: 8, color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><span className="material-symbols-outlined" style={{fontSize: 18}}>login</span> Punch In</button>
          ) : (
            <button onClick={handlePunchOut} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><span className="material-symbols-outlined" style={{fontSize: 18}}>logout</span> Punch Out</button>
          )}
        </div>
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
