import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function TopNav() {
  const navigate = useNavigate()
  const { searchQuery, setSearchQuery, profile, notifications, isDarkMode, setIsDarkMode, setIsSidebarOpen } = useApp()

  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <header className="sticky top-0 right-0 w-full h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-4 md:px-gutter z-40 gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Hamburger Menu (Mobile) */}
        <button 
          className="md:hidden text-on-surface-variant hover:text-primary transition-colors flex-shrink-0 p-1 -ml-1"
          onClick={() => setIsSidebarOpen(true)}
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        {/* Search */}
        <div className="flex flex-1 md:flex-none items-center gap-2 bg-surface px-3 py-2 rounded-md border border-outline-variant w-full max-w-[250px] md:max-w-xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all shadow-sm">
          <span className="material-symbols-outlined text-outline text-[20px]">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 w-full text-[13px] md:text-label-md font-label-md placeholder:text-outline outline-none min-w-0"
            placeholder="Search tasks..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="text-on-surface-variant hover:text-primary transition-all duration-150 flex items-center justify-center"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <span className="material-symbols-outlined">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Notifications */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => navigate('/notifications')}
            className="text-on-surface-variant hover:text-primary transition-all duration-150 flex items-center justify-center"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full" />
          )}
        </div>

        <div className="h-8 w-[1px] bg-outline-variant" />

        {/* User */}
        <div
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          onClick={() => navigate('/settings')}
        >
          <div className="hidden md:block text-right">
            <p className="text-label-md font-bold text-primary">{profile.name}</p>
            <p className="text-[11px] text-secondary font-medium tracking-wide">{profile.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container text-primary flex items-center justify-center text-[14px] font-semibold border border-outline-variant/50 shadow-sm flex-shrink-0">
            {(() => {
              const name = profile.name || 'User'
              const parts = name.split(' ')
              if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
              return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            })()}
          </div>
        </div>
      </div>
    </header>
  )
}
