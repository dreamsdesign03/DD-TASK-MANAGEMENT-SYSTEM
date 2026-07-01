import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp, mqttClient } from '../context/AppContext'

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

const COLLAPSED_W = 88;
const EXPANDED_W  = 240;

export default function Sidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { setShowNewTaskModal, personalChats, groupChats, tasks, messagesByChatId, lastSeenTimestamps, profile, setProfile, fetchClients, isSidebarOpen, setIsSidebarOpen, addToast } = useApp()
  
  const isElectron = window && window.process && window.process.type
  const [expanded, setExpanded] = useState(false)
  
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [clientForm, setClientForm] = useState({
    projectName: '',
    clientName: '',
    emails: [''],
    phones: [''],
    industry: '',
    services: []
  })
  const [isSubmittingClient, setIsSubmittingClient] = useState(false)

  const handleCreateClient = async (e) => {
    e.preventDefault()
    if (!clientForm.projectName) {
      addToast('Project Name is required', 'error')
      return
    }

    setIsSubmittingClient(true)
    try {
      const res = await fetch('https://script.google.com/macros/s/AKfycbxhPoHG7KQZObNKAxn-FL35qqIUBoTFPfXoHrH6r67a6-0aQsmD0VxhEXt960CWQEie/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'add_client',
          projectName: clientForm.projectName,
          clientName: clientForm.clientName,
          contactEmail: clientForm.emails.filter(e => e.trim()).join(', '),
          phone: clientForm.phones.filter(p => p.trim()).join(', '),
          industry: clientForm.industry,
          services: clientForm.services.join(', '),
          userEmail: profile?.email
        })
      })
      const data = await res.json()
      if (data.ok) {
        addToast('Client added successfully!', 'success')
        setShowNewClientModal(false)
        setClientForm({ projectName: '', clientName: '', emails: [''], phones: [''], industry: '', services: [] })
        fetchClients()
        if (mqttClient && mqttClient.connected) {
          setTimeout(() => {
            mqttClient.publish('dd_task_engine_v1/sync', JSON.stringify({ action: 'sync' }))
          }, 1000)
        }
      } else {
        addToast('Failed to add client: ' + (data.error || 'Unknown error'), 'error')
      }
    } catch (err) {
      addToast('Error adding client: ' + err.message, 'error')
    } finally {
      setIsSubmittingClient(false)
    }
  }

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

  const NAV_ITEMS = [
    { icon: 'grid_view',       label: 'All Tasks',     path: '/tasks',          count: totalUnreadTasks, countBg: '#EF4444' },
    { icon: 'check_box',       label: 'My Tasks',      path: '/my-tasks'                },
    { icon: 'notifications',   label: 'Notifications', path: '/notifications' },
    { icon: 'chat_bubble',     label: 'Chat',          path: '/chat',           count: totalUnreadChat, countBg: '#A78BFA' },
    { icon: 'group',           label: 'Team',          path: '/team'                    },
    { icon: 'business_center', label: 'Clients',       path: '/clients'                 },
    { icon: 'bar_chart',       label: 'Reports',       path: '/reports'                 },
  ];

  return (
    <>
      <style>{`
        /* ── Nav item base ── */
        .dd-item {
          position: relative;
          display: flex;
          align-items: center;
          height: 48px;
          border: none;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 15px;
          text-align: left;
          transition: background-color 0.3s ease, color 0.3s ease;
          border-radius: 16px;
          color: rgba(255,255,255,0.65);
          background: transparent;
          overflow: hidden;
        }
        .dd-item:not(.dd-active):hover {
          background: rgba(255,255,255,0.12);
          color: #fff;
        }
        .dd-item.dd-active {
          background: rgba(255, 255, 255, 0.15) !important;
          color: #fff !important;
          font-weight: 700;
          box-shadow: none;
          border: 1px solid rgba(255,255,255,0.1);
        }

        /* ── Hide scrollbar in Nav ── */
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[200%]'}`}
        style={{
          position: 'fixed',
          top: 12, left: 12, bottom: 12,
          width: expanded ? EXPANDED_W : COLLAPSED_W,
          background: 'linear-gradient(to top, #702c91 0%, #ec008c 0%, #702c91 100%)',
          borderRadius: 24,
          boxShadow: '0 12px 32px rgba(112, 44, 145, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          overflow: 'hidden',
          transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 1s ease, transform 0.3s ease',
        }}
      >
        {/* ── LOGO SECTION ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: expanded ? '32px 0 32px 28px' : '32px 0 32px 24px',
          flexShrink: 0, overflow: 'hidden',
          transition: 'padding 1s cubic-bezier(0.25, 1, 0.5, 1)',
        }}>
          <div style={{
            minWidth: 48, height: 48, borderRadius: '50%',
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div className="logo-mask" style={{ width: 32, height: 32, backgroundColor: '#702c91' }} />
          </div>
          <div style={{
            opacity: expanded ? 1 : 0,
            transition: expanded ? 'opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.3s' : 'opacity 0.3s ease 0s',
            whiteSpace: 'nowrap', overflow: 'hidden',
          }}>
            <p style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>Dreamsdesk</p>
          </div>
        </div>

        {/* ── NAV ── */}
        <nav
          className="hide-scrollbar"
          style={{
            flex: 1,
            padding: '10px 0 22px 0',
            display: 'flex', flexDirection: 'column', gap: 8,
            overflowY: 'auto', overflowX: 'visible',
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
                  setIsSidebarOpen(false);
                }}
                style={{
                  margin: '0 20px',
                  width: expanded ? 'calc(100% - 40px)' : '48px',
                  padding: '0 14px',
                  justifyContent: 'flex-start',
                  transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              >
                {/* Icon */}
                <span style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 20,
                      color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                      fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                      transition: 'color 0.2s',
                    }}
                  >
                    {item.icon}
                  </span>
                </span>

                {/* Label — fades in on expand */}
                <span style={{
                  opacity: expanded ? 1 : 0,
                  marginLeft: 12,
                  transition: expanded ? 'opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.3s' : 'opacity 0.3s ease 0s',
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
                    flexShrink: 0, marginLeft: 8
                  }}>
                    {item.count}
                  </span>
                )}
                {item.count > 0 && !expanded && (
                  <span style={{
                    position: 'absolute', top: 12, right: 12,
                    width: 8, height: 8, borderRadius: '50%',
                    background: item.countBg, border: '2px solid #702c91'
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── BOTTOM ACTIONS ── */}
        <div style={{
          padding: '24px 0 32px 0',
          display: 'flex', flexDirection: 'column', gap: 10,
          flexShrink: 0, overflow: 'hidden',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          {!isElectron && (
            <button
              onClick={() => window.open('https://github.com/dreamsdesign03/DD-TASK-MANAGEMENT-SYSTEM/releases/download/v0.0.1/Dreamsdesk.Setup.0.0.1.exe', '_blank')}
              style={{
                display: 'flex', alignItems: 'center',
                height: 48, margin: '0 20px', width: expanded ? 'calc(100% - 40px)' : '48px',
                padding: '0 14px', justifyContent: 'flex-start',
                borderRadius: 14, cursor: 'pointer',
                background: '#fff', color: '#702c91',
                transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s',
                overflow: 'hidden'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0 }}>get_app</span>
              <span style={{
                opacity: expanded ? 1 : 0, marginLeft: 12,
                transition: expanded ? 'opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.3s' : 'opacity 0.3s ease 0s',
                whiteSpace: 'nowrap', fontSize: 14, fontWeight: 700
              }}>
                Get Desktop App
              </span>
            </button>
          )}

          <button
            onClick={() => {
              setShowNewTaskModal(true);
              navigate('/tasks');
            }}
            style={{
              display: 'flex', alignItems: 'center',
              height: 48, margin: '0 20px', width: expanded ? 'calc(100% - 40px)' : '48px',
              padding: '0 14px', justifyContent: 'flex-start',
              borderRadius: 14, cursor: 'pointer',
              background: 'rgba(255,255,255,0.2)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s',
              overflow: 'hidden'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0 }}>add</span>
            <span style={{
              opacity: expanded ? 1 : 0, marginLeft: 12,
              transition: expanded ? 'opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.3s' : 'opacity 0.3s ease 0s',
              whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600
            }}>
              New Task
            </span>
          </button>

          {profile?.systemRole !== 'Employee' && (
            <button
              onClick={() => setIsAddClientModalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center',
                height: 48, margin: '0 20px', width: expanded ? 'calc(100% - 40px)' : '48px',
                padding: '0 14px', justifyContent: 'flex-start',
                borderRadius: 14, cursor: 'pointer',
                background: 'transparent', color: 'rgba(255,255,255,0.9)',
                transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s',
                overflow: 'hidden'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0 }}>domain_add</span>
              <span style={{
                opacity: expanded ? 1 : 0, marginLeft: 12,
                transition: expanded ? 'opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.3s' : 'opacity 0.3s ease 0s',
                whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600
              }}>
                New Client
              </span>
            </button>
          )}

          <button
            onClick={() => {
              if (profile?.email) {
                fetch('https://script.google.com/macros/s/AKfycbxhPoHG7KQZObNKAxn-FL35qqIUBoTFPfXoHrH6r67a6-0aQsmD0VxhEXt960CWQEie/exec', {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'logout', email: profile.email })
                }).catch(e => console.warn(e))
              }
              setProfile(null)
              localStorage.removeItem('dd_profile')
              navigate('/login')
            }}
            style={{
              display: 'flex', alignItems: 'center',
              height: 48, margin: '0 20px', width: expanded ? 'calc(100% - 40px)' : '48px',
              padding: '0 14px', justifyContent: 'flex-start',
              borderRadius: 14, cursor: 'pointer',
              background: 'transparent', color: 'rgba(255,255,255,0.7)',
              transition: 'width 1s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s',
              overflow: 'hidden'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0 }}>logout</span>
            <span style={{
              opacity: expanded ? 1 : 0, marginLeft: 12,
              transition: expanded ? 'opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.3s' : 'opacity 0.3s ease 0s',
              whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600
            }}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <form
            onSubmit={handleCreateClient}
            className="bg-surface-container-lowest w-[480px] rounded-lg shadow-2xl p-6 flex flex-col gap-4"
          >
            <div className="flex justify-between items-center border-b border-divider pb-3">
              <h2 className="text-headline-sm font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">domain_add</span>
                Add New Client
              </h2>
              <button
                type="button"
                onClick={() => setShowNewClientModal(false)}
                className="text-secondary hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-label-sm text-secondary uppercase">Project Name *</label>
              <input
                type="text"
                required
                value={clientForm.projectName}
                onChange={e => setClientForm({ ...clientForm, projectName: e.target.value })}
                className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2.5 text-body-sm text-on-surface focus:border-primary focus:ring-0 outline-none"
                placeholder="e.g. Dreamsdesign Redesign"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-label-sm text-secondary uppercase">Client Name</label>
              <input
                type="text"
                value={clientForm.clientName}
                onChange={e => setClientForm({ ...clientForm, clientName: e.target.value })}
                className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2.5 text-body-sm text-on-surface focus:border-primary focus:ring-0 outline-none"
                placeholder="e.g. Dreamsdesign"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-label-sm font-label-sm text-secondary uppercase">Client Email(s)</label>
                <button
                  type="button"
                  onClick={() => setClientForm({ ...clientForm, emails: [...clientForm.emails, ''] })}
                  className="text-primary hover:bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                  title="Add another email"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
              </div>
              <div className="space-y-2">
                {clientForm.emails.map((email, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        const newEmails = [...clientForm.emails]
                        newEmails[idx] = e.target.value
                        setClientForm({ ...clientForm, emails: newEmails })
                      }}
                      className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2.5 text-body-sm text-on-surface focus:border-primary focus:ring-0 outline-none"
                      placeholder="e.g. client@example.com"
                    />
                    {clientForm.emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newEmails = clientForm.emails.filter((_, i) => i !== idx)
                          setClientForm({ ...clientForm, emails: newEmails })
                        }}
                        className="text-error hover:bg-error/10 rounded-md px-2.5 flex items-center justify-center transition-colors border border-outline-variant hover:border-error/50"
                        title="Remove email"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-label-sm font-label-sm text-secondary uppercase">Client Phone(s)</label>
                <button
                  type="button"
                  onClick={() => setClientForm({ ...clientForm, phones: [...clientForm.phones, ''] })}
                  className="text-primary hover:bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                  title="Add another phone"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                </button>
              </div>
              <div className="space-y-2">
                {clientForm.phones.map((phone, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={phone}
                      onChange={e => {
                        const newPhones = [...clientForm.phones]
                        newPhones[idx] = e.target.value
                        setClientForm({ ...clientForm, phones: newPhones })
                      }}
                      className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2.5 text-body-sm text-on-surface focus:border-primary focus:ring-0 outline-none"
                      placeholder="+91 98000 00000"
                    />
                    {clientForm.phones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newPhones = clientForm.phones.filter((_, i) => i !== idx)
                          setClientForm({ ...clientForm, phones: newPhones })
                        }}
                        className="text-error hover:bg-error/10 rounded-md px-2.5 flex items-center justify-center transition-colors border border-outline-variant hover:border-error/50"
                        title="Remove phone"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-label-sm text-secondary uppercase">Industry</label>
              <input
                type="text"
                value={clientForm.industry}
                onChange={e => setClientForm({ ...clientForm, industry: e.target.value })}
                className="w-full bg-surface-container border border-outline-variant rounded-md px-4 py-2.5 text-body-sm text-on-surface focus:border-primary focus:ring-0 outline-none"
                placeholder="e.g. Technology"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-label-sm font-label-sm text-secondary uppercase">Services</label>
              <div className="bg-surface-container border border-outline-variant rounded-md px-4 py-2 text-body-sm text-on-surface max-h-[160px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
                {AVAILABLE_SERVICES.map(service => (
                  <label key={service} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={clientForm.services.includes(service)}
                      onChange={e => {
                        const isChecked = e.target.checked
                        setClientForm(prev => ({
                          ...prev,
                          services: isChecked 
                            ? [...prev.services, service]
                            : prev.services.filter(s => s !== service)
                        }))
                      }}
                      className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface-container-lowest bg-surface-container-lowest"
                    />
                    <span className="text-secondary group-hover:text-on-surface transition-colors">{service}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-divider mt-2">
              <button
                type="button"
                onClick={() => setShowNewClientModal(false)}
                className="px-5 py-2.5 rounded-md text-label-lg font-bold text-secondary hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingClient}
                className="px-5 py-2.5 rounded-md text-label-lg font-bold bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingClient ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                    Saving...
                  </>
                ) : (
                  'Save Client'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
