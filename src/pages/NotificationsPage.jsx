import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'

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
      className={`flex items-center p-6 rounded-lg shadow-sm border transition-all cursor-pointer group ${unread ? 'bg-primary/5 border-primary/20 hover:border-primary/40' : 'bg-surface-container-lowest border-outline-variant/40 hover:border-outline-variant'
        }`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-12 h-12 rounded-full ${iconBg} flex items-center justify-center`}>
        <span
          className={`material-symbols-outlined ${iconColor}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>

      {/* Content */}
      <div className="ml-4 flex-1 min-w-0">
        <div className="flex justify-between items-start gap-4">
          <span className="font-label-lg text-[15px] font-semibold text-on-surface group-hover:text-primary transition-colors">
            {title}
          </span>
          <span className="text-on-surface-variant font-body-sm text-body-sm flex-shrink-0">{time}</span>
        </div>
        <p className="text-[#6B6B6B] font-body-sm text-body-sm mt-1">{subtitle}</p>
      </div>

      {/* Unread dot */}
      <div className="ml-6 flex-shrink-0 w-5 flex items-center justify-center">
        {unread && (
          <div
            className="w-2 h-2 rounded-full transition-opacity duration-300"
            style={{ backgroundColor: '#3B82F6' }}
          />
        )}
      </div>
    </div>
  )
}

/* ─── Main Notifications Page ────────────────────────────────────── */
export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp()
  const [activeFilter, setActiveFilter] = useState('All')

  /* Filter logic */
  const filtered = notifications.filter((n) => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'Unread') return n.unread
    return n.category === activeFilter
  })

  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background, #F0EDF8)', display: 'flex' }}>
      <Sidebar />

      <main className="flex-1 flex flex-col h-[100vh] overflow-hidden md:ml-[104px] transition-all duration-300">
        <TopNav title="Notifications" badgeCount={unreadCount > 0 ? unreadCount : undefined} showSearch={false} />

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
          <div className="max-w-[1200px] mx-auto w-full bg-white dark:bg-[#1e1b2e] rounded-[20px] shadow-[0_8px_24px_rgba(91,33,182,0.08)] p-6 md:p-8">
            {/* ── Header row ──────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end mb-6 md:mb-8 gap-4 md:gap-0">
              <div className="w-full md:w-auto">
                <div className="flex items-center gap-2 mb-4 md:mb-6">
                  <h2
                    className="text-primary"
                    style={{ fontWeight: 700, fontSize: '24px', fontFamily: 'Inter' }}
                  >
                    Your Notifications
                  </h2>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-4 md:gap-8 border-b border-outline-variant/30 overflow-x-auto md:overflow-x-visible w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={`pb-3 px-1 font-label-md text-label-md transition-colors whitespace-nowrap ${activeFilter === tab
                        ? 'text-primary border-b-2 border-primary -mb-px'
                        : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  markAllNotificationsRead()
                }}
                className="pb-2 md:pb-3 font-label-md text-label-md text-primary hover:underline w-full md:w-auto text-right md:text-left"
              >
                Mark all as read
              </a>
            </div>

            {/* ── Notification cards ───────────────────────────────── */}
            <div className="space-y-4">
              {filtered.length === 0 ? (
                <div className="text-center py-20 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] mb-4 block">notifications_none</span>
                  <p className="font-label-lg text-label-lg">No notifications here</p>
                </div>
              ) : (
                filtered.map((n) => (
                  <NotificationCard key={n.id} notification={n} onRead={markNotificationRead} />
                ))
              )}

              {/* Load more */}
              {filtered.length > 0 && (
                <div className="pt-8 flex justify-center">
                  <button className="px-4 md:px-8 py-3 rounded-md border border-outline-variant font-medium text-[13px] text-secondary hover:border-primary hover:text-primary transition-colors">
                    Load previous notifications
                  </button>
                </div>
              )}
            </div>

            {/* ── Bento insights ───────────────────────────────────── */}
          </div>
        </div>
      </main>
    </div>
  )
}

