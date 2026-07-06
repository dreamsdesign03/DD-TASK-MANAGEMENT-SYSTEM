import { useRef, useCallback, useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'

function formatHms(totalSecs) {
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

export default function TimerBadge() {
  const { activeTimer, sessionSecs, toggleTimer, tasks, profile } = useApp()
  const badgeRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem('dd_timer_pos')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  useEffect(() => {
    if (window.require) {
      try {
        const { ipcRenderer } = window.require('electron')
        ipcRenderer.send('timer-update', {
          active: !!activeTimer,
          time: formatHms(sessionSecs),
          taskTitle: activeTimer?.taskTitle || '',
          taskId: activeTimer?.taskId || null,
        })
      } catch (e) {}
    }
  }, [activeTimer, sessionSecs])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    setDragging(true)
    const rect = badgeRef.current.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return
    const x = Math.max(0, Math.min(window.innerWidth - badgeRef.current.offsetWidth, e.clientX - dragOffset.current.x))
    const y = Math.max(0, Math.min(window.innerHeight - badgeRef.current.offsetHeight, e.clientY - dragOffset.current.y))
    setPos({ x, y })
  }, [dragging])

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setDragging(false)
      if (badgeRef.current) {
        const rect = badgeRef.current.getBoundingClientRect()
        localStorage.setItem('dd_timer_pos', JSON.stringify({ x: rect.left, y: rect.top }))
      }
    }
  }, [dragging])

  if (!activeTimer) return null

  const task = tasks?.find(t => t.id === activeTimer.taskId)
  const baseStyle = pos
    ? { left: pos.x, top: pos.y }
    : { bottom: 24, right: 24 }

  return (
    <>
      {dragging && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9998, cursor: 'grabbing',
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      )}
      <div
        ref={badgeRef}
        onMouseDown={handleMouseDown}
        className="timer-fade-in"
        style={{
          position: 'fixed',
          ...baseStyle,
          zIndex: 9999,
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          background: 'rgba(18, 16, 28, 0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 16,
          boxShadow: '0 8px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
          padding: '12px 18px 12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          transition: dragging ? 'none' : 'box-shadow 0.3s',
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            flexShrink: 0,
          }}
          className="timer-pulse-dot"
        />

        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: '#f0f0f0',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
            lineHeight: 1,
            fontFamily: "'Inter', 'SF Mono', 'Fira Code', monospace",
          }}
        >
          {formatHms(sessionSecs)}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation()
            if (task) toggleTimer(task, profile?.name)
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: 'none',
            background: 'rgba(239, 68, 68, 0.9)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#EF4444'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'}
          title="Stop Timer"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>stop</span>
        </button>
      </div>
    </>
  )
}
