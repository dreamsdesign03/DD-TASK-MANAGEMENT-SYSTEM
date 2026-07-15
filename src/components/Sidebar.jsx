import { useNavigate, useLocation } from 'react-router-dom'
import { useApp, mqttClient } from '../context/AppContext'
import { isElectron } from '../utils/isElectron'

const AVAILABLE_SERVICES = [
  "Business Growth Consulting",
  "AI SEO & Lead Generation",
  "D2C Development / Marketing",
  "Ecommerce Development",
  "Website Development",
  "Digital Marketing & Brand Awareness",
  "Branding & Identity Management",
  "Mobile Apps and Software Development",
  "Marketing Automation & Funnel Development",
  "Films, Videos and UGC content creation",
  "Software and SAAS development",
  "Ai Automation and Business Growth",
  "360 Project"
]

const COLLAPSED_W = 72;
const EXPANDED_W  = 240;

export default function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { setShowNewTaskModal, personalChats, groupChats, tasks, messagesByChatId, lastSeenTimestamps, profile, setProfile, fetchClients, isSidebarOpen, setIsSidebarOpen, addToast } = useApp()

  // isSidebarOpen is now the persistent toggle state (not just mobile)
  const expanded = isSidebarOpen

  const totalUnreadChat =
    (personalChats?.reduce((acc, c) => acc + (c.unread || 0), 0) || 0) +
    (groupChats?.reduce((acc, g) => acc + (g.unread || 0), 0) || 0)

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

  const NAV_ITEMS = [
    { icon: 'grid_view',       label: 'All Tasks',     path: '/tasks',          count: totalUnreadTasks, countBg: '#EF4444' },
    { icon: 'check_box',       label: 'My Tasks',      path: '/my-tasks'                },
    { icon: 'notifications',   label: 'Notifications', path: '/notifications' },
    { icon: 'chat_bubble',     label: 'Chat',          path: '/chat',           count: totalUnreadChat, countBg: '#A78BFA' },
    { icon: 'group',           label: 'Team',          path: '/team'                    },
    { icon: 'business_center', label: 'Clients',       path: '/clients'                 },
    { icon: 'bar_chart',       label: 'Reports',       path: '/reports'                 },
  ];

  if (profile?.systemRole !== 'Employee') {
    NAV_ITEMS.push({ icon: 'monitoring', label: 'Activity', path: '/activity' })
  }

  return (
    <>
      <style>{`
        /* ── Nav item base ── */
        .dd-item {
          position: relative;
          display: flex;
          align-items: center;
          height: 44px;
          border: none;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 14px;
          text-align: left;
          transition: background-color 0.2s ease, color 0.2s ease;
          border-radius: 12px;
          color: rgba(255,255,255,0.65);
          background: transparent;
          overflow: hidden;
        }
        .dd-item:not(.dd-active):hover {
          background: rgba(255,255,255,0.12);
          color: #fff;
        }
        .dd-item.dd-active {
          background: rgba(255, 255, 255, 0.18) !important;
          color: #fff !important;
          font-weight: 700;
          box-shadow: none;
          border: 1px solid rgba(255,255,255,0.12);
        }

        /* ── Hide scrollbar in Nav ── */
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* ── Sidebar toggle button ── */
        .dd-toggle-btn {
          position: fixed;
          top: 50%;
          transform: translateY(-50%);
          width: 22px;
          height: 48px;
          background: white;
          border: 1px solid #E5E7EB;
          border-left: none;
          border-radius: 0 10px 10px 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 51;
          box-shadow: 3px 0 8px rgba(0,0,0,0.08);
          transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s;
          padding: 0;
        }
        .dd-toggle-btn:hover {
          background: #F5F3FF;
        }
        .dd-toggle-btn .toggle-icon {
          font-size: 16px;
          color: #702c91;
          transition: transform 0.3s ease;
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside
        style={{
          position: 'fixed',
          top: 12, left: 12, bottom: 12,
          width: expanded ? EXPANDED_W : COLLAPSED_W,
          background: 'linear-gradient(to bottom, #702c91 0%, #9b2691 50%, #702c91 100%)',
          borderRadius: 20,
          boxShadow: '0 12px 32px rgba(112, 44, 145, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          overflow: 'hidden',
          transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* ── LOGO SECTION ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: expanded ? 12 : 0,
          padding: expanded ? '28px 20px' : '28px 0',
          justifyContent: expanded ? 'flex-start' : 'center',
          flexShrink: 0, overflow: 'hidden',
          transition: 'padding 0.35s cubic-bezier(0.4, 0, 0.2, 1), gap 0.35s',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div className="logo-mask" style={{ width: 28, height: 28, backgroundColor: '#702c91' }} />
          </div>
          <div style={{
            opacity: expanded ? 1 : 0,
            width: expanded ? 'auto' : 0,
            overflow: 'hidden',
            transition: 'opacity 0.25s ease, width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            whiteSpace: 'nowrap',
          }}>
            <p style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>Dreamsdesk</p>
          </div>
        </div>

        {/* ── NAV ── */}
        <nav
          className="hide-scrollbar"
          style={{
            flex: 1,
            padding: '6px 0 16px 0',
            display: 'flex', flexDirection: 'column', gap: 4,
            overflowY: 'auto', overflowX: 'hidden',
          }}
        >
          {NAV_ITEMS.map(item => {
            const active = pathname === item.path || (pathname === '/dashboard' && item.path === '/tasks');
            return (
              <button
                key={item.path}
                className={`dd-item${active ? ' dd-active' : ''}`}
                onClick={() => {
                  navigate(item.path);
                }}
                style={{
                  margin: expanded ? '0 10px' : '0 auto',
                  width: expanded ? 'calc(100% - 20px)' : '44px',
                  padding: expanded ? '0 12px' : '0',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), margin 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {/* Icon */}
                <span style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 20,
                      color: active ? '#fff' : 'rgba(255,255,255,0.75)',
                      fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                      transition: 'color 0.2s',
                    }}
                  >
                    {item.icon}
                  </span>
                  {/* Dot badge when collapsed */}
                  {item.count > 0 && !expanded && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4,
                      width: 8, height: 8, borderRadius: '50%',
                      background: item.countBg, border: '2px solid #702c91'
                    }} />
                  )}
                </span>

                {/* Label — slides in on expand */}
                <span style={{
                  opacity: expanded ? 1 : 0,
                  maxWidth: expanded ? 160 : 0,
                  marginLeft: expanded ? 10 : 0,
                  overflow: 'hidden',
                  transition: 'opacity 0.2s ease, max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), margin 0.35s',
                  whiteSpace: 'nowrap',
                  fontWeight: active ? 700 : 500,
                  flex: 1,
                  textAlign: 'left'
                }}>
                  {item.label}
                </span>

                {item.count > 0 && expanded && (
                  <span style={{
                    minWidth: 20, height: 20, padding: '0 6px',
                    background: item.countBg, color: '#fff',
                    borderRadius: 999, fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginLeft: 6,
                    opacity: expanded ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                  }}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── BOTTOM ACTIONS ── */}
        <div style={{
          padding: '16px 0 24px 0',
          display: 'flex', flexDirection: 'column', gap: 6,
          flexShrink: 0, overflow: 'hidden',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          {!isElectron() && (
            <button
              onClick={async () => {
                try {
                  const res = await fetch('https://api.github.com/repos/dreamsdesign03/DD-TASK-MANAGEMENT-SYSTEM/releases/latest');
                  const data = await res.json();
                  const exeAsset = data.assets?.find(a => a.name.endsWith('.exe'));
                  if (exeAsset) {
                    window.location.href = exeAsset.browser_download_url;
                  } else {
                    window.open('https://github.com/dreamsdesign03/DD-TASK-MANAGEMENT-SYSTEM/releases/latest', '_blank');
                  }
                } catch (e) {
                  window.open('https://github.com/dreamsdesign03/DD-TASK-MANAGEMENT-SYSTEM/releases/latest', '_blank');
                }
              }}
              style={{
                display: 'flex', alignItems: 'center',
                height: 44,
                margin: expanded ? '0 10px' : '0 auto',
                width: expanded ? 'calc(100% - 20px)' : '44px',
                padding: expanded ? '0 12px' : '0', justifyContent: expanded ? 'flex-start' : 'center',
                borderRadius: 12, cursor: 'pointer',
                background: '#fff', color: '#702c91',
                transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), margin 0.35s, background 0.2s',
                overflow: 'hidden', border: 'none', flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0 }}>get_app</span>
              <span style={{
                opacity: expanded ? 1 : 0, marginLeft: expanded ? 10 : 0,
                maxWidth: expanded ? 160 : 0,
                overflow: 'hidden',
                transition: 'opacity 0.2s ease, max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), margin 0.35s',
                whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700
              }}>
                Get Desktop App
              </span>
            </button>
          )}

          <button
            onClick={() => {
              setProfile(null)
              localStorage.removeItem('dd_profile')
              navigate('/login')
            }}
            style={{
              display: 'flex', alignItems: 'center',
              height: 44,
              margin: expanded ? '0 10px' : '0 auto',
              width: expanded ? 'calc(100% - 20px)' : '44px',
              padding: expanded ? '0 12px' : '0', justifyContent: expanded ? 'flex-start' : 'center',
              borderRadius: 12, cursor: 'pointer',
              background: 'transparent', color: 'rgba(255,255,255,0.75)',
              transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), margin 0.35s, background 0.2s',
              overflow: 'hidden', border: 'none', flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0 }}>logout</span>
            <span style={{
              opacity: expanded ? 1 : 0, marginLeft: expanded ? 10 : 0,
              maxWidth: expanded ? 160 : 0,
              overflow: 'hidden',
              transition: 'opacity 0.2s ease, max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), margin 0.35s',
              whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600
            }}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* ── TOGGLE BUTTON — sits at the right edge of sidebar ── */}
      <button
        className="dd-toggle-btn hidden md:flex"
        onClick={() => setIsSidebarOpen(o => !o)}
        title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        style={{
          left: expanded ? (12 + EXPANDED_W) : (12 + COLLAPSED_W),
        }}
      >
        <span
          className="material-symbols-outlined toggle-icon"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          chevron_right
        </span>
      </button>
    </>
  )
}
