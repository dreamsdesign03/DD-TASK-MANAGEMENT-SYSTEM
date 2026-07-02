import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'
import { renderAvatar } from '../utils/avatar'

const FILTER_TABS = ['All', 'Unread', 'Status Updates']

/* ─── Single notification card ───────────────────────────────────── */
function NotificationCard({ notification, onRead }) {
  const navigate = useNavigate()
  const { id, unread, iconBg, iconColor, icon, title, subtitle, time, taskId, category } = notification

  const handleClick = () => {
    onRead(id)
    if (category === 'Task Chat' || category === 'Status Updates' || category === 'Task Reminders' || category === 'Overdue Alerts') {
      if (taskId) navigate(`/tasks/${taskId}`)
    } else if (category === 'New Message' || category === 'New Group Message') {
      if (taskId) localStorage.setItem('dd_pending_chat_nav', taskId)
      navigate('/chat')
    } else if (taskId) {
      navigate(`/tasks/${taskId}`)
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{
        background: 'white',
        padding: 20,
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(91,33,182,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'transform 0.2s, border-color 0.2s',
        border: unread ? '1px solid rgba(112, 44, 145, 0.2)' : '1px solid transparent'
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
        {/* Icon */}
        {(() => {
          let sender = null
          if (category === 'New Message' && title.startsWith('Message from ')) {
            sender = title.replace('Message from ', '')
          } else if (category === 'Task Chat' && subtitle.includes(':')) {
            sender = subtitle.split(':')[0]
          } else if (category === 'Task Reminders' && title.includes('New Task')) {
            sender = subtitle.split(' assigned')[0]
          }

          if (sender) {
            return renderAvatar(null, sender, "w-[42px] h-[42px] rounded-xl", "text-[16px]")
          }
          if (category === 'New Group Message') {
            return (
              <div className="bg-[#E3F2FD] w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-blue-600" style={{ fontVariationSettings: "'FILL' 1", fontSize: 22 }}>group</span>
              </div>
            )
          }
          if (category === 'Status Updates') {
            return (
              <div className="bg-[#F4EFF6] w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#702c91]" style={{ fontVariationSettings: "'FILL' 1", fontSize: 22 }}>published_with_changes</span>
              </div>
            )
          }
          if (category === 'Overdue Alerts') {
            return (
              <div className="bg-red-50 w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-red-600" style={{ fontVariationSettings: "'FILL' 1", fontSize: 22 }}>warning</span>
              </div>
            )
          }
          return (
            <div className={iconBg || 'bg-[#F0EDF8]'} style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span
                className={`material-symbols-outlined ${iconColor || 'text-[#702c91]'}`}
                style={{ fontVariationSettings: "'FILL' 1", fontSize: 22 }}
              >
                {icon || 'notifications'}
              </span>
            </div>
          )
        })()}

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontWeight: 700, color: '#1E1B2E', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </span>
          <p style={{ margin: 0, color: '#6B7280', fontSize: 14, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* Unread dot / Time */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, marginLeft: 16 }}>
        <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{time}</span>
        {unread && (
          <div style={{ width: 10, height: 10, background: '#702c91', borderRadius: '50%', boxShadow: '0 0 8px rgba(91,33,182,0.4)' }} />
        )}
      </div>
    </div>
  )
}

/* ─── Main Notifications Page ────────────────────────────────────── */
export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead, isSidebarOpen } = useApp()
  const [activeFilter, setActiveFilter] = useState('All')

  /* Filter logic */
  const filtered = notifications.filter((n) => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Unread') return n.unread
    return n.category === activeFilter
  })

  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <div style={{ minHeight: '100vh', background: '#F0EDF8', display: 'flex' }}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #dce2f3;
          border-radius: 10px;
        }
      `}</style>
      
      <Sidebar />

      <main 
        className={`flex-1 flex flex-col h-[100vh] overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'md:ml-[240px]' : 'md:ml-[104px]'}`}
      >
        <TopNav title="Notifications" badgeCount={unreadCount > 0 ? unreadCount : undefined} showSearch={false} />

        {/* Filters Section */}
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, overflowX: 'auto' }} className="custom-scrollbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {FILTER_TABS.map(f => (
              <button 
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  padding: '8px 20px', borderRadius: 12, border: activeFilter === f ? 'none' : '1px solid #D1D5DB', 
                  cursor: 'pointer', fontSize: 14, fontWeight: activeFilter === f ? 700 : 500,
                  background: activeFilter === f ? 'linear-gradient(to right, #702c91 0%, #ec008c 50%, #702c91 100%)' : 'white',
                  backgroundSize: activeFilter === f ? '200% auto' : 'auto',
                  backgroundPosition: 'left center',
                  color: activeFilter === f ? 'white' : '#4B5563',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={e => {
                  if (activeFilter === f) e.currentTarget.style.backgroundPosition = 'right center';
                }}
                onMouseLeave={e => {
                  if (activeFilter === f) e.currentTarget.style.backgroundPosition = 'left center';
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault()
              markAllNotificationsRead()
            }}
            style={{ background: 'transparent', border: 'none', color: '#702c91', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 16 }}
          >
            Mark all as read
          </button>
        </div>

        {/* Scrollable List */}
        <div className="custom-scrollbar animate-fade-in-up" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-[48px] mb-4 block">notifications_none</span>
              <p style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>No notifications here</p>
            </div>
          ) : (
            filtered.map((n) => (
              <NotificationCard key={n.id} notification={n} onRead={markNotificationRead} />
            ))
          )}

          {/* Bottom CTA */}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <button style={{ 
                background: 'white', color: '#4B5563', fontWeight: 700, padding: '12px 40px', 
                borderRadius: 999, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #D1D5DB',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
              }} onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = 'rgba(91,33,182,0.3)' }} onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#D1D5DB' }}>
                <span>Load previous notifications</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

