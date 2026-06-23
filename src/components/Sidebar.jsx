import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const NAV_ITEMS = [

  { icon: 'assignment_turned_in', label: 'My Tasks', to: '/tasks' },
  { icon: 'notifications', label: 'Notifications', to: '/notifications' },
  { icon: 'chat', label: 'Chat', to: '/chat' },
  { icon: 'group', label: 'Team', to: '/team' },
  { icon: 'assessment', label: 'Monthly Reports', to: '/reports' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { setShowNewTaskModal, personalChats, groupChats, tasks, messagesByChatId, lastSeenTimestamps, profile } = useApp()

  const totalUnreadChat =
    (personalChats?.reduce((acc, c) => acc + (c.unread || 0), 0) || 0) +
    (groupChats?.reduce((acc, g) => acc + (g.unread || 0), 0) || 0)

  // Calculate total unread messages across all tasks
  const myName = String(profile?.name || 'Mansi Shah').trim().toLowerCase()
  let totalUnreadTasks = 0
  if (tasks && messagesByChatId) {
    tasks.forEach(task => {
      const msgs = messagesByChatId[task.id]
      if (!msgs || msgs.length === 0) return
      const lastSeen = lastSeenTimestamps?.[task.id]

      const unreadCount = msgs.filter(m => {
        const isMe = String(m.senderName || m.sender || '').trim().toLowerCase() === myName
        if (isMe || m.type === 'system' || m.type === 'divider') return false
        const tTime = m.timestamp || m.time
        if (!tTime) return false
        return !lastSeen || new Date(tTime).getTime() > new Date(lastSeen).getTime()
      }).length

      totalUnreadTasks += unreadCount
    })
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-surface border-r border-outline-variant flex flex-col py-6 z-50">

      {/* Brand */}
      <div 
        className="px-6 mb-8 flex items-center gap-3 min-h-0 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => navigate('/tasks')}
      >
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
          <div className="logo-mask w-full h-full" aria-label="Dreamsdesk Logo" />
        </div>
        <div className="min-w-0">
          <h1 className="font-headline-md text-[18px] font-bold text-primary leading-tight truncate">
            Dreamsdesk
          </h1>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-lg font-label-lg text-label-lg transition-colors duration-200 ${isActive
                ? 'bg-surface-container text-primary border-l-4 border-primary'
                : 'text-secondary hover:bg-surface-container-low'
              }`
            }
          >
            <span className="material-symbols-outlined">{icon}</span>
            <span>{label}</span>
            {label === 'Chat' && totalUnreadChat > 0 && (
              <span className="ml-auto min-w-[18px] h-[18px] px-1.5 bg-[#25d366] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {totalUnreadChat}
              </span>
            )}
            {label === 'My Tasks' && totalUnreadTasks > 0 && (
              <span className="ml-auto min-w-[18px] h-[18px] px-1.5 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm animate-scale-in">
                {totalUnreadTasks}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 mt-auto pt-6 space-y-1 border-t border-outline-variant">
        <button
          onClick={() => {
            setShowNewTaskModal(true)
            navigate('/tasks')
          }}
          className="w-full mb-4 py-3 bg-primary-container text-white rounded-lg font-label-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined">add</span>
          New Task
        </button>



        <button
          onClick={() => {
            if (profile?.email) {
              fetch('https://script.google.com/macros/s/AKfycbzT91J_rKfzJ-jID6UufxvBuDgzoi2fE8CGRRVKWzFCFjKlxkj2XnDXRO83Qde_hBKZ/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'logout', email: profile.email })
              }).catch(e => console.warn(e))
            }
            navigate('/login')
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-secondary font-label-lg text-label-lg hover:bg-surface-container-low transition-colors duration-200"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

