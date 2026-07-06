import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

function formatHms(totalSecs) {
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

export default function TimerBadge() {
  const navigate = useNavigate()
  const { activeTimer, sessionSecs, toggleTimer, tasks, profile } = useApp()

  if (!activeTimer) return null

  const task = tasks?.find(t => t.id === activeTimer.taskId)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: '#1e1b2e',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        animation: 'fadeInUp 0.3s ease',
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#25d366',
          animation: 'pulse 1.5s ease-in-out infinite',
          flexShrink: 0,
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            lineHeight: 1,
          }}
        >
          Tracking
        </span>
        <span
          onClick={() => task && navigate(`/tasks/${task.id}`)}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.3,
            cursor: task ? 'pointer' : 'default',
            maxWidth: 180,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={activeTimer.taskTitle}
        >
          {activeTimer.taskTitle}
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: '#25d366',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            letterSpacing: '0.02em',
          }}
        >
          {formatHms(sessionSecs)}
        </span>
      </div>

      <button
        onClick={() => {
          if (task) toggleTimer(task, profile?.name)
        }}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          background: '#EF4444',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.2s, transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#DC2626'}
        onMouseLeave={e => e.currentTarget.style.background = '#EF4444'}
        title="Stop Timer"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>stop</span>
      </button>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
