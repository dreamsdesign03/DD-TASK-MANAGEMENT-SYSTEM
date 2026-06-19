import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

/* â”€â”€â”€ Priority badge config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const PRIORITY_STYLES = {
  Urgent: 'bg-[#E74C3C] text-white',
  High: 'bg-[#F39C12] text-white',
  Medium: 'bg-[#3498DB] text-white',
  Low: 'bg-[#95A5A6] text-white',
}

const PRIORITY_WEIGHTS = {
  Urgent: 4,
  High: 3,
  Medium: 2,
  Low: 1,
}

/* â”€â”€â”€ Status badge config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const STATUS_STYLES = {
  Blocked: 'bg-red-100 text-red-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Review: 'bg-blue-100 text-blue-700',
  Done: 'bg-green-100 text-green-700',
  Pending: 'bg-gray-100 text-gray-700',
}

const STATUS_ICON = {
  Done: 'check',
}

/* â”€â”€â”€ Filter tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const FILTERS = ['All', 'Pending', 'In Progress', 'Review', 'Done', 'Blocked']

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function TaskTable() {
  const { tasks, searchQuery, deleteTask, profile, employees, messagesByChatId, lastSeenTimestamps, updateTask } = useApp()
  const [activeFilter, setActiveFilter] = useState('All')
  const [sortBy, setSortBy] = useState('Task ID (Descending)')
  const [selectedClient, setSelectedClient] = useState('All Companies')
  const [selectedUser, setSelectedUser] = useState('All Users')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [tasksPerPage, setTasksPerPage] = useState(10)

  const navigate = useNavigate()

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeFilter, selectedClient, selectedUser, sortBy, tasksPerPage])

  // Extract unique clients
  const uniqueClients = ['All Companies', ...new Set(tasks.map((t) => t.client))]

  // Extract unique users
  const uniqueUsers = ['All Users', ...new Set(tasks.flatMap((t) => (t.assignedTo || '').split(',').map(s => s.trim()).filter(Boolean)))]

  // 1. Filter tasks
  const filtered = tasks
    .filter((t) => {
      const matchesStatus = activeFilter === 'All' || t.status === activeFilter
      const matchesClient = selectedClient === 'All Companies' || t.client === selectedClient
      const matchesUser = selectedUser === 'All Users' || (t.assignedTo || '').includes(selectedUser)

      const query = searchQuery.toLowerCase()
      const matchesSearch =
        t.title.toLowerCase().includes(query) ||
        t.client.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query) ||
        (t.assignedTo || '').toLowerCase().includes(query)

      return matchesStatus && matchesSearch && matchesClient && matchesUser
    })
    // 2. Sort tasks
    .sort((a, b) => {
      if (sortBy === 'Task ID (Descending)') {
        const numA = parseInt(a.id.replace(/\D/g, '')) || 0
        const numB = parseInt(b.id.replace(/\D/g, '')) || 0
        return numB - numA
      }
      if (sortBy === 'Task ID (Ascending)') {
        const numA = parseInt(a.id.replace(/\D/g, '')) || 0
        const numB = parseInt(b.id.replace(/\D/g, '')) || 0
        return numA - numB
      }
      if (sortBy === 'Due Date') {
        return new Date(a.dueDate) - new Date(b.dueDate)
      }
      if (sortBy === 'Priority') {
        return (PRIORITY_WEIGHTS[b.priority] || 0) - (PRIORITY_WEIGHTS[a.priority] || 0)
      }
      if (sortBy === 'Status') {
        return a.status.localeCompare(b.status)
      }
      if (sortBy === 'Task Title') {
        return a.title.localeCompare(b.title)
      }
      return 0
    })

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / tasksPerPage)
  const indexOfLastTask = currentPage * tasksPerPage
  const indexOfFirstTask = indexOfLastTask - tasksPerPage
  const currentTasks = filtered.slice(indexOfFirstTask, indexOfLastTask)

  return (
    <>
      {/* â”€â”€ Filter bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex flex-col gap-4">
        {/* Top tab filter */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-5 py-2 rounded-full font-label-md text-label-md transition-all shadow-sm ${activeFilter === f
                  ? 'bg-primary text-on-primary border-transparent'
                  : 'bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Multi-Dimensional Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/60">
          {/* Client Filter */}
          <div className="flex flex-col gap-1 min-w-[200px] flex-1 md:flex-initial">
            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider pl-1">
              Filter by Company
            </label>
            <div className="relative">
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 pr-10 text-body-sm font-label-md text-on-surface focus:border-primary focus:ring-0 outline-none cursor-pointer"
              >
                {uniqueClients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3 text-secondary pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* User Filter */}
          <div className="flex flex-col gap-1 min-w-[200px] flex-1 md:flex-initial">
            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider pl-1">
              Filter by User
            </label>
            <div className="relative">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 pr-10 text-body-sm font-label-md text-on-surface focus:border-primary focus:ring-0 outline-none cursor-pointer"
              >
                {uniqueUsers.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3 text-secondary pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Spacer */}
          <div className="hidden md:block flex-grow"></div>

          {/* Sort selector */}
          <div className="flex flex-col gap-1 min-w-[180px] flex-1 md:flex-initial">
            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider pl-1">
              Sort Order
            </label>
            <div className="relative">
              <select
                value={`Sort by: ${sortBy}`}
                onChange={(e) => setSortBy(e.target.value.replace('Sort by: ', ''))}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 pr-10 text-body-sm font-label-md text-secondary focus:border-primary focus:ring-0 outline-none cursor-pointer font-bold"
              >
                <option value="Sort by: Task ID (Descending)">Sort by: Task ID (Descending)</option>
                <option value="Sort by: Task ID (Ascending)">Sort by: Task ID (Ascending)</option>
                <option value="Sort by: Due Date">Sort by: Due Date</option>
                <option value="Sort by: Priority">Sort by: Priority</option>
                <option value="Sort by: Status">Sort by: Status</option>
                <option value="Sort by: Task Title">Sort by: Task Title</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3 text-secondary pointer-events-none font-normal">
                expand_more
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden mt-4"
        style={{ boxShadow: '0px 2px 12px rgba(112, 44, 145, 0.08)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                {['Task ID', 'Task Title', 'Company', 'Assigned To', 'Assigned By', 'Due Date', 'Priority', 'Status', 'Action'].map(
                  (h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 font-label-md text-label-md text-secondary uppercase tracking-wider ${h === 'Action' ? 'text-center' : ''
                        }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-outline-variant">
              {currentTasks.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-secondary font-label-md">
                    No matching tasks found. Try altering your filters.
                  </td>
                </tr>
              ) : (
                currentTasks.map((task) => {
                  let isTaskOverdue = false
                  if (task.status !== 'Done' && task.dueDate) {
                    const due = new Date(task.dueDate)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    if (due < today) {
                      isTaskOverdue = true
                    }
                  }

                  const rowClass = isTaskOverdue
                    ? 'bg-error-container'
                    : task.status === 'Done'
                      ? 'opacity-60'
                      : ''

                  const firstTdClass = isTaskOverdue
                    ? 'border-l-4 border-urgent-red'
                    : 'border-l-4 border-transparent'

                  return (
                    <tr
                      key={task.id}
                      className={`${rowClass} hover:bg-surface-container-lowest transition-colors group`}
                      onMouseEnter={(e) => {
                        if (!task.done) {
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      {/* ID & Unread Badge */}
                      <td className={`px-4 py-3 ${firstTdClass}`}>
                        <div className="flex items-center gap-2">
                          <span className="bg-surface-container px-2 py-1 rounded text-[12px] font-mono text-secondary font-bold whitespace-nowrap inline-block">
                            {task.id}
                          </span>
                          {(() => {
                            const msgs = messagesByChatId?.[task.id]
                            if (!msgs || msgs.length === 0) return null
                            const lastSeen = lastSeenTimestamps?.[task.id]
                            const myName = String(profile?.name || 'Mansi Shah').trim().toLowerCase()

                            const unreadCount = msgs.filter(m => {
                              const isMe = String(m.senderName || m.sender || '').trim().toLowerCase() === myName
                              if (isMe || m.type === 'system' || m.type === 'divider') return false
                              const tTime = m.timestamp || m.time
                              if (!tTime) return false
                              return !lastSeen || new Date(tTime).getTime() > new Date(lastSeen).getTime()
                            }).length

                            if (unreadCount > 0) {
                              return (
                                <span className="flex items-center justify-center w-5 h-5 bg-error text-on-error text-[10px] font-bold rounded-full shadow-sm animate-scale-in">
                                  {unreadCount}
                                </span>
                              )
                            }
                            return null
                          })()}
                        </div>
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3">
                        <a
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          className="font-semibold text-primary hover:underline cursor-pointer"
                        >
                          {task.title}
                        </a>
                      </td>

                      {/* Client (Company) */}
                      <td className="px-4 py-3 font-semibold text-secondary whitespace-nowrap">{task.client}</td>


                      {/* Assigned */}
                      <td className="px-4 py-3 text-body-sm text-secondary font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const assignees = (task.assignedTo || 'Unassigned').split(',').map(s => s.trim()).filter(Boolean)
                            return (
                              <div className="flex items-center">
                                {assignees.map((a, idx) => (
                                  <div key={idx} className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 -ml-2 first:ml-0 border border-white" title={a}>
                                    {getInitials(a)}
                                  </div>
                                ))}
                              </div>
                            )
                          })()}
                        </div>
                      </td>

                      {/* Assigned By */}
                      <td className="px-4 py-3 text-body-sm text-secondary font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const rawName = task.assignedBy || 'Mansi Shah'
                            const cleanName = String(rawName).replace(/[^\w\s-]/g, '').trim()
                            return (
                              <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0" title={cleanName}>
                                {getInitials(cleanName)}
                              </div>
                            )
                          })()}
                        </div>
                      </td>

                      {/* Due date */}
                      <td
                        className={`px-4 py-3 text-body-sm font-bold whitespace-nowrap ${isTaskOverdue
                          ? 'text-error'
                          : task.status === 'Done'
                            ? 'text-secondary line-through'
                            : 'text-on-surface'
                          }`}
                      >
                        {task.dueDate}
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`${PRIORITY_STYLES[task.priority] || 'bg-gray-400 text-white'
                            } inline-block whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tighter`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="relative inline-block">
                          <select
                            value={task.status}
                            onChange={(e) => updateTask(task.id, { status: e.target.value })}
                            disabled={!(task.assignedTo || '').split(',').map(s => s.trim()).includes(profile?.name)}
                            className={`${STATUS_STYLES[task.status] || 'bg-gray-100 text-gray-700'
                              } appearance-none px-4 py-1.5 pr-8 rounded-full text-label-sm font-label-sm font-bold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none border-none ring-0`}
                            title={!(task.assignedTo || '').split(',').map(s => s.trim()).includes(profile?.name) ? "Only assigned users can update status" : ""}
                          >
                            <option value="Pending" className="bg-surface-container-lowest text-on-surface">Pending</option>
                            <option value="In Progress" className="bg-surface-container-lowest text-on-surface">In Progress</option>
                            <option value="Review" className="bg-surface-container-lowest text-on-surface">Review</option>
                            <option value="Done" className="bg-surface-container-lowest text-on-surface">Done</option>
                            <option value="Blocked" className="bg-surface-container-lowest text-on-surface">Blocked</option>
                          </select>
                          <span className="material-symbols-outlined text-[14px] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70">
                            arrow_drop_down
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/tasks/${task.id}`)}
                            className="px-3 py-1.5 border border-primary text-primary rounded-lg font-label-sm text-label-sm hover:bg-primary hover:text-on-primary transition-colors whitespace-nowrap"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* â”€â”€ Pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-label-sm font-label-sm text-secondary">
            Showing {filtered.length === 0 ? 0 : indexOfFirstTask + 1}-{Math.min(indexOfLastTask, filtered.length)} of {filtered.length} tasks
          </p>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-label-sm text-secondary font-medium">Tasks per page:</span>
              <select
                value={tasksPerPage}
                onChange={(e) => setTasksPerPage(Number(e.target.value))}
                className="bg-surface-container-lowest border border-outline-variant rounded-md px-2 py-1 text-sm outline-none cursor-pointer focus:border-primary text-on-surface"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center border border-outline-variant rounded-lg text-primary hover:bg-surface-container-lowest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>

              <div className="px-2 font-bold text-label-md text-on-surface">
                Page {currentPage} of {Math.max(1, totalPages)}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="w-10 h-10 flex items-center justify-center border border-outline-variant rounded-lg text-primary hover:bg-surface-container-lowest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}



