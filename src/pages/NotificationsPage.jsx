import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'

const FILTER_TABS = ['All', 'Unread', 'Status Updates']

/* â”€â”€â”€ Single notification card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€ Main Notifications Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
    <div className="bg-surface-bright text-on-surface flex h-screen overflow-hidden">
      <Sidebar />

      <div className="ml-[240px] flex flex-col flex-1 h-screen overflow-hidden">
        <TopNav />

        <main className="flex-1 bg-background overflow-y-auto custom-scrollbar">
          <div className="max-w-[1200px] mx-auto px-margin_desktop py-10">
            {/* â”€â”€ Header row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2
                  className="text-on-surface mb-6"
                  style={{ fontWeight: 700, fontSize: '28px', fontFamily: 'Montserrat' }}
                >
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-3 text-[16px] font-label-md text-white bg-primary px-2.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </h2>

                {/* Filter tabs */}
                <div className="flex items-center gap-8 border-b border-outline-variant/30">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveFilter(tab)}
                      className={`pb-3 px-1 font-label-md text-label-md transition-colors ${activeFilter === tab
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
                className="pb-3 font-label-md text-label-md text-primary hover:underline"
              >
                Mark all as read
              </a>
            </div>

            {/* â”€â”€ Notification cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                  <button className="px-8 py-3 rounded-md border border-outline-variant font-medium text-[13px] text-secondary hover:border-primary hover:text-primary transition-colors">
                    Load previous notifications
                  </button>
                </div>
              )}
            </div>

            {/* â”€â”€ Bento insights â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full py-4 px-margin_desktop bg-surface-container-lowest border-t border-outline-variant flex justify-between items-center">
          <p className="font-label-sm text-label-sm text-secondary">
            Â© 2024 Dreamsdesk Internal Systems
          </p>
          <div className="flex gap-6">
            <a href="#" className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors">
              Support
            </a>
            <a href="#" className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors">
              Privacy Policy
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}

