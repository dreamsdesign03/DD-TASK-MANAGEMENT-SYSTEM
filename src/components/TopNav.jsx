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

  const [showPunchOutConfirm, setShowPunchOutConfirm] = useState(false)

  const firstPunchInToday = todaysSessions?.[0]?.in || null

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
    <>
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
                  <span>{firstPunchInToday || punchInTime}</span>
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
            <button
              onClick={() => setShowPunchOutConfirm(true)}
              style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span className="material-symbols-outlined" style={{fontSize: 18}}>logout</span> Punch Out
            </button>
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

      {/* ── Punch Out Confirmation Modal ── */}
      {showPunchOutConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: '36px 32px',
            width: 380, maxWidth: '90vw',
            boxShadow: '0 24px 64px rgba(112,44,145,0.18)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
            animation: 'scaleIn 0.25s cubic-bezier(0.4,0,0.2,1)'
          }}>
            {/* Icon */}
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#DC2626', fontVariationSettings: "'FILL' 1" }}>logout</span>
            </div>

            {/* Title */}
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1E1B2E', fontFamily: 'Inter,sans-serif', textAlign: 'center' }}>
              End Work Session?
            </h2>
            <p style={{ margin: '10px 0 0', fontSize: 14, color: '#6B7280', fontFamily: 'Inter,sans-serif', textAlign: 'center', lineHeight: 1.6 }}>
              Are you sure you want to complete your today's session of work? This will record your punch-out time and log your daily tasks.
            </p>

            {/* Session summary */}
            {punchInTime && (
              <div style={{
                marginTop: 20, width: '100%',
                background: '#F9FAFB', borderRadius: 12, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280', fontFamily: 'Inter,sans-serif' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#16A34A' }}>login</span>
                  <span>Punched in at</span>
                  <strong style={{ color: '#1E1B2E' }}>{todaysSessions?.[0]?.in || punchInTime}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280', fontFamily: 'Inter,sans-serif' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#DC2626' }}>logout</span>
                  <span>Now</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24, width: '100%' }}>
              <button
                onClick={() => setShowPunchOutConfirm(false)}
                style={{
                  flex: 1, height: 44, borderRadius: 12,
                  border: '1.5px solid #E5E7EB', background: '#fff',
                  color: '#374151', fontWeight: 600, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'Inter,sans-serif',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPunchOutConfirm(false)
                  handlePunchOut()
                }}
                style={{
                  flex: 1, height: 44, borderRadius: 12,
                  border: 'none', background: 'linear-gradient(to right, #DC2626, #EF4444)',
                  color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'Inter,sans-serif',
                  boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Yes, Punch Out
              </button>
            </div>
          </div>
        </div>
      )}
  </>
  )
}
