import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const NAV_ITEMS = [

  { icon: 'assignment_turned_in', label: 'My Tasks', to: '/tasks' },
  { icon: 'notifications', label: 'Notifications', to: '/notifications' },
  { icon: 'chat', label: 'Chat', to: '/chat' },
  { icon: 'group', label: 'Team', to: '/team' },
  { icon: 'domain', label: 'Clients', to: '/clients' },
  { icon: 'assessment', label: 'Monthly Reports', to: '/reports' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { setShowNewTaskModal, personalChats, groupChats, tasks, messagesByChatId, lastSeenTimestamps, profile, fetchClients } = useApp()
  
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [clientForm, setClientForm] = useState({
    projectName: '',
    clientName: '',
    emails: [''],
    phones: [''],
    industry: ''
  })
  const [isSubmittingClient, setIsSubmittingClient] = useState(false)

  const handleCreateClient = async (e) => {
    e.preventDefault()
    if (!clientForm.projectName) {
      alert('Project Name is required')
      return
    }

    setIsSubmittingClient(true)
    try {
      const res = await fetch('https://script.google.com/macros/s/AKfycbxJXe4c9yDIEtf7UHaXHWBIpMnnc4NxtSwOl3nVzvTsN882GWIDzbMdTm1-cIUueGQo/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'add_client',
          projectName: clientForm.projectName,
          clientName: clientForm.clientName,
          contactEmail: clientForm.emails.filter(e => e.trim()).join(', '),
          phone: clientForm.phones.filter(p => p.trim()).join(', '),
          industry: clientForm.industry,
          userEmail: profile?.email
        })
      })
      const data = await res.json()
      if (data.ok) {
        alert('Client added successfully!')
        setShowNewClientModal(false)
        setClientForm({ projectName: '', clientName: '', emails: [''], phones: [''], industry: '' })
        fetchClients()
      } else {
        alert('Failed to add client: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      alert('Error adding client: ' + err.message)
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

  return (
    <>
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
          className="w-full mb-2 py-3 bg-primary-container text-white rounded-lg font-label-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined">add</span>
          New Task
        </button>

        {profile?.systemRole !== 'Employee' && (
          <button
            onClick={() => setShowNewClientModal(true)}
            className="w-full mb-4 py-3 bg-surface-container border border-primary/20 text-primary rounded-lg font-label-lg flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
          >
            <span className="material-symbols-outlined">domain_add</span>
            New Client
          </button>
        )}

        <button
          onClick={() => {
            if (profile?.email) {
              fetch('https://script.google.com/macros/s/AKfycbxJXe4c9yDIEtf7UHaXHWBIpMnnc4NxtSwOl3nVzvTsN882GWIDzbMdTm1-cIUueGQo/exec', {
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
                <label className="text-label-sm font-label-sm text-secondary uppercase">Email(s)</label>
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
                <label className="text-label-sm font-label-sm text-secondary uppercase">Phone(s)</label>
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

