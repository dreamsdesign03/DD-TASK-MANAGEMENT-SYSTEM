import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

/* ─── Priority badge config ─────────────────────────────────────────────── */
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

/* ─── Status badge config ───────────────────────────────────────────────── */
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

/* ─── Filter tabs ───────────────────────────────────────────────────────── */
const FILTERS = ['All', 'Pending', 'In Progress', 'Review', 'Done', 'Blocked']

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function TaskTable() {
  const { tasks, searchQuery, deleteTask, profile, employees, messagesByChatId, lastSeenTimestamps, updateTask, addTask } = useApp()
  const location = useLocation()
  const [activeFilter, setActiveFilter] = useState('All')
  const [sortBy, setSortBy] = useState('Task ID (Descending)')
  const [selectedClient, setSelectedClient] = useState(location.state?.clientFilter || 'All Clients')
  const [selectedUser, setSelectedUser] = useState('All Users')
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments')

  const [viewMode, setViewMode] = useState('List') // 'List' | 'Board'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [tasksPerPage, setTasksPerPage] = useState(10)
  const [taskToDelete, setTaskToDelete] = useState(null)

  const navigate = useNavigate()

  // Hand Scrolling State
  const boardRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // Quick Add State
  const [quickAddCol, setQuickAddCol] = useState(null)
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [quickAddAssignee, setQuickAddAssignee] = useState([])
  const [quickAddDueDate, setQuickAddDueDate] = useState('')
  const [quickAddPriority, setQuickAddPriority] = useState('Medium')

  // Department File Upload State
  const fileInputRef = useRef(null)
  const [uploadDept, setUploadDept] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleDeptUploadClick = (e, dept) => {
    e.stopPropagation()
    setUploadDept(dept)
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleDeptFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uploadDept) return

    setIsUploading(true)
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const currentClient = selectedClient !== 'All Clients' ? selectedClient : (tasks[0]?.client || 'General')

      const url = 'https://script.google.com/macros/s/AKfycbwT8ub3UKW8-fj-S19hSOhRKp6F9SLfPgCvJTyUnpB-5rD6a0ElMDo7sQ9UhwLvRLsQ/exec'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'upload_file',
          filename: file.name,
          mimeType: file.type,
          base64: base64Data.split(',')[1],
          projectName: currentClient,
          department: uploadDept
        })
      })

      const data = await res.json()
      if (data.ok) {
        alert('File successfully uploaded to Google Drive!')
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('File upload error:', error)
      alert('Failed to upload file: ' + error.message)
    } finally {
      setIsUploading(false)
      setUploadDept(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeFilter, selectedClient, selectedUser, selectedDepartment, sortBy, tasksPerPage])

  // Extract unique clients
  const uniqueClients = ['All Clients', ...new Set(tasks.map((t) => t.client).filter(c => c && c.toLowerCase() !== 'internal'))]

  // Extract unique users
  const uniqueUsers = ['All Users', ...new Set(tasks.flatMap((t) => (t.assignedTo || '').split(',').map(s => s.trim()).filter(Boolean)))]

  // Extract unique departments
  const uniqueDepartments = ['All Departments', 'COMMON', 'SOCIAL MEDIA', 'WEBSITE', 'SEO', 'GRAPHIC', 'HR', 'ACCOUNT', 'SALES', ...new Set(tasks.map(t => (t.department || 'COMMON').toUpperCase()))]
  const deduplicatedDepartments = [...new Set(uniqueDepartments)]

  // 1. Filter tasks
  const filtered = tasks
    .filter((t) => {
      // Exclude Sub Tasks from main table view
      if (t.taskType === 'Sub Task' || t.taskType === 'Subtask') return false;

      const matchesStatus = activeFilter === 'All' || t.status === activeFilter
      const matchesClient = selectedClient === 'All Clients' || t.client === selectedClient
      const matchesUser = selectedUser === 'All Users' || (t.assignedTo || '').includes(selectedUser)
      const matchesDepartment = selectedDepartment === 'All Departments' || (t.department || 'COMMON').toUpperCase() === selectedDepartment

      const query = searchQuery.toLowerCase()
      const matchesSearch =
        t.title.toLowerCase().includes(query) ||
        t.client.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query) ||
        (t.assignedTo || '').toLowerCase().includes(query)

      return matchesStatus && matchesSearch && matchesClient && matchesUser && matchesDepartment
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

  // Hand Scrolling Handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.task-card') || e.target.closest('button') || e.target.closest('input')) return
    setIsDragging(true)
    setStartX(e.pageX - boardRef.current.offsetLeft)
    setScrollLeft(boardRef.current.scrollLeft)
  }

  const handleMouseLeave = () => setIsDragging(false)
  const handleMouseUp = () => setIsDragging(false)

  const handleMouseMove = (e) => {
    if (!isDragging) return
    e.preventDefault()
    const x = e.pageX - boardRef.current.offsetLeft
    const walk = (x - startX) * 2 // Scroll speed multiplier
    boardRef.current.scrollLeft = scrollLeft - walk
  }

  // Drag and Drop Handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId)
    e.dataTransfer.effectAllowed = 'move'
    setTimeout(() => { e.target.style.opacity = '0.5' }, 0)
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
  }

  const handleDragOver = (e) => {
    e.preventDefault() // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, colName) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId) return

    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    if (colName === 'COMPLETE') {
      if (task.status !== 'Done') {
        updateTask(taskId, { status: 'Done', department: task.department || 'COMMON' })
      }
    } else {
      if (task.department !== colName || task.status === 'Done') {
        updateTask(taskId, { department: colName, status: task.status === 'Done' ? 'Pending' : task.status })
      }
    }
  }

  // Quick Add Handler
  const handleQuickAdd = (department) => {
    if (!quickAddTitle.trim()) {
      setQuickAddCol(null)
      return
    }

    let maxIdNum = 0
    tasks.forEach((t) => {
      if (t.id && (!t.taskType || t.taskType === 'Main Task' || t.taskType === 'Task') && String(t.id).match(/^T-\d+$/)) {
        const match = String(t.id).match(/^T-(\d+)$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxIdNum) maxIdNum = num
        }
      }
    })
    const nextIdNum = maxIdNum > 0 ? maxIdNum + 1 : 1
    const nextIdStr = `T-${String(nextIdNum).padStart(4, '0')}`

    const isComplete = department === 'COMPLETE'
    const newDept = isComplete ? 'COMMON' : department

    const assignedEmps = employees?.filter(e => quickAddAssignee.includes(e.name)) || []
    const finalAssignees = quickAddAssignee.length > 0 ? quickAddAssignee : [profile?.name || 'Unassigned']

    const newTask = {
      id: nextIdStr,
      title: quickAddTitle.trim(),
      client: selectedClient !== 'All Clients' ? selectedClient : (tasks[0]?.client || ''),
      project: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      assigned: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      assignedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      dueDate: quickAddDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], // 1 week default
      priority: quickAddPriority,
      status: isComplete ? 'Done' : 'Pending',
      statusUpdatedOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      department: newDept,
      assignedTo: finalAssignees.join(', '),
      employeeId: assignedEmps.length > 0 ? assignedEmps.map(e => e.id).join(', ') : (profile?.id || ''),
      assignedEmail: assignedEmps.length > 0 ? assignedEmps.map(e => e.email).join(', ') : (profile?.email || ''),
      description: { intro: 'No description provided.', bullets: [], outro: '' },
      comments: [],
      attachments: [],
      remarks: '',
      post: 'YES'
    }

    if (addTask) {
      addTask(newTask)
    }
    setQuickAddCol(null)
    setQuickAddTitle('')
    setQuickAddAssignee([])
    setQuickAddDueDate('')
    setQuickAddPriority('Medium')
  }

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / tasksPerPage)
  const indexOfLastTask = currentPage * tasksPerPage
  const indexOfFirstTask = indexOfLastTask - tasksPerPage
  const currentTasks = filtered.slice(indexOfFirstTask, indexOfLastTask)

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleDeptFileUpload} 
      />
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
        <div className="flex flex-wrap items-end gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/60">
          {/* Client Filter */}
          <div className="flex flex-col gap-1 min-w-[200px] flex-1 md:flex-initial">
            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider pl-1">
              Filter by Client
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
          <div className="flex flex-col gap-1 min-w-[160px] flex-1 md:flex-initial">
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

          {/* Department Filter */}
          <div className="flex flex-col gap-1 min-w-[160px] flex-1 md:flex-initial">
            <label className="text-[11px] font-bold text-secondary uppercase tracking-wider pl-1">
              Filter by Dept
            </label>
            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 pr-10 text-body-sm font-label-md text-on-surface focus:border-primary focus:ring-0 outline-none cursor-pointer"
              >
                {deduplicatedDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
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

          {/* View Mode Toggle */}
          <div className="flex bg-surface-container-lowest rounded-lg p-1 border border-outline-variant/60 shadow-sm mt-4 md:mt-0">
            <button
              onClick={() => setViewMode('List')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-label-sm font-bold transition-all ${viewMode === 'List' ? 'bg-primary/10 text-primary' : 'text-secondary hover:text-on-surface hover:bg-surface-container'}`}
            >
              <span className="material-symbols-outlined text-[18px]">list</span> List
            </button>
            <button
              onClick={() => setViewMode('Board')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-label-sm font-bold transition-all ${viewMode === 'Board' ? 'bg-primary/10 text-primary' : 'text-secondary hover:text-on-surface hover:bg-surface-container'}`}
            >
              <span className="material-symbols-outlined text-[18px]">view_kanban</span> Board
            </button>
            <button
              onClick={() => {
                if (selectedClient === 'All Clients') {
                  alert('Please select the client from the filter first.')
                } else {
                  navigate(`/projects/${encodeURIComponent(selectedClient)}`)
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-label-sm font-bold transition-all text-primary hover:text-primary hover:bg-primary/10 border-l border-outline-variant/50 ml-1 pl-5 bg-primary/5"
              title="Open Overview"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span> Overview
            </button>
          </div>

          {/* Sort selector */}
          <div className="flex flex-col gap-1 min-w-[180px] flex-1 md:flex-initial mt-4 md:mt-0">
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

      {/* ──────────────────────────────────────────────────────────── */}
      {viewMode === 'List' ? (
        <>
          <div
            className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden mt-4"
            style={{ boxShadow: '0px 2px 12px rgba(112, 44, 145, 0.08)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    {['Task ID', 'Task Title', 'Client', 'Assigned To', 'Assigned By', 'Due Date', 'Priority', 'Status', 'Action'].map(
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
                    (() => {
                      const DEPARTMENTS = ['COMMON', 'SOCIAL MEDIA', 'WEBSITE', 'SEO', 'GRAPHIC', 'HR', 'ACCOUNT', 'SALES'];
                      const taskDepts = [...new Set(currentTasks.map(t => (t.department || 'COMMON').toUpperCase()))];
                      taskDepts.sort((a, b) => {
                        const idxA = DEPARTMENTS.indexOf(a);
                        const idxB = DEPARTMENTS.indexOf(b);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1;
                        if (idxB !== -1) return 1;
                        return a.localeCompare(b);
                      });

                      return taskDepts.map(dept => {
                        const deptTasks = currentTasks.filter(t => (t.department || 'COMMON').toUpperCase() === dept);
                        if (deptTasks.length === 0) return null;

                        return (
                          <React.Fragment key={dept}>
                            {/* Department Header Row */}
                            <tr className="bg-surface-container-high border-y border-outline-variant">
                              <td colSpan="9" className="px-4 py-3">
                                <div className="flex items-center gap-2 font-bold text-primary text-[13px] tracking-wider uppercase">
                                  <span className="material-symbols-outlined text-[18px]">folder_open</span>
                                  {dept}
                                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[11px]">{deptTasks.length}</span>
                                  
                                  <button 
                                    onClick={(e) => handleDeptUploadClick(e, dept)}
                                    disabled={isUploading && uploadDept === dept}
                                    title={`Add attachment for ${dept} department`}
                                    className="ml-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary disabled:opacity-50"
                                  >
                                    <span className={`material-symbols-outlined text-[16px] ${isUploading && uploadDept === dept ? 'animate-spin' : ''}`}>
                                      {isUploading && uploadDept === dept ? 'refresh' : 'add'}
                                    </span>
                                    <span className="text-[11px] font-bold tracking-normal normal-case mt-[1px]">
                                      Add attachment for {dept}
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Tasks for this Department */}
                            {deptTasks.map((task) => {
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
                                    <div className="flex flex-col items-start gap-1">
                                      <a
                                        onClick={() => navigate(`/tasks/${task.id}`)}
                                        className="font-semibold text-primary hover:underline cursor-pointer"
                                      >
                                        {task.title}
                                      </a>
                                      {(() => {
                                        const subtasks = tasks.filter(t => String(t.mainTaskId) === String(task.id) && (t.taskType === 'Sub Task' || t.taskType === 'Subtask'))
                                        if (subtasks.length > 0) {
                                          return (
                                            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                              <span className="material-symbols-outlined text-[10px]">account_tree</span>
                                              {subtasks.length} sub task{subtasks.length > 1 ? 's' : ''}
                                            </span>
                                          )
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  </td>

                                  {/* Client */}
                                  <td className="px-4 py-3 font-semibold text-secondary whitespace-nowrap">
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/projects/${encodeURIComponent(task.client)}`);
                                      }}
                                      className="flex items-center gap-1.5 hover:text-primary hover:underline cursor-pointer transition-colors group/client w-fit"
                                      title={`View ${task.client} Overview`}
                                    >
                                      <span className="material-symbols-outlined text-[16px] group-hover/client:text-primary transition-colors text-primary/70">domain</span>
                                      {task.client}
                                    </span>
                                  </td>

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
                                      {profile?.systemRole !== 'Employee' && (
                                        <button
                                          onClick={() => {
                                            setTaskToDelete(task.id)
                                          }}
                                          className="px-2 py-1.5 border border-error text-error rounded-lg hover:bg-error hover:text-white transition-colors flex items-center justify-center"
                                          title="Delete Task"
                                        >
                                          <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </React.Fragment>
                        )
                      })
                    })()
                  )}
                </tbody>
              </table>
            </div>

            {/* ──────────────────────────────────────────────────────────── */}
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
      ) : (
        <div
          ref={boardRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className={`mt-6 overflow-x-auto select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <div className="flex gap-4 min-w-max items-start">
            {['COMMON', 'SOCIAL MEDIA', 'WEBSITE', 'SEO', 'GRAPHIC', 'HR', 'ACCOUNT', 'SALES', 'COMPLETE'].filter(col => {
              if (col === 'COMMON' || col === 'COMPLETE') return true;
              return filtered.some(t => t.status !== 'Done' && (t.department || 'COMMON').toUpperCase() === col);
            }).map((colName) => {
              const columnTasks = filtered.filter(t => {
                if (colName === 'COMPLETE') return t.status === 'Done';
                return t.status !== 'Done' && (t.department || 'COMMON').toUpperCase() === colName;
              })

              const displayColName = colName === 'WEBSITE' ? 'WEBSITE WORK' : colName === 'SEO' ? 'SEO WORK' : colName;

              const headerClass =
                colName === 'COMMON' ? 'bg-gray-100/50 border-gray-200 dark:border-gray-700/50 text-gray-800 dark:text-gray-300' :
                  colName === 'SOCIAL MEDIA' ? 'bg-red-100/30 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300' :
                    colName === 'WEBSITE' ? 'bg-amber-100/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300' :
                      colName === 'SEO' ? 'bg-green-100/30 border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-300' :
                        colName === 'GRAPHIC' ? 'bg-purple-100/30 border-purple-200 dark:border-purple-900/50 text-purple-800 dark:text-purple-300' :
                          colName === 'HR' ? 'bg-pink-100/30 border-pink-200 dark:border-pink-900/50 text-pink-800 dark:text-pink-300' :
                            colName === 'ACCOUNT' ? 'bg-blue-100/30 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300' :
                              colName === 'SALES' ? 'bg-indigo-100/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-300' :
                                'bg-emerald-100/50 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'; // COMPLETE

              const dotClass =
                colName === 'COMMON' ? 'bg-gray-500' :
                  colName === 'SOCIAL MEDIA' ? 'bg-red-500' :
                    colName === 'WEBSITE' ? 'bg-amber-500' :
                      colName === 'SEO' ? 'bg-green-500' :
                        colName === 'GRAPHIC' ? 'bg-purple-500' :
                          colName === 'HR' ? 'bg-pink-500' :
                            colName === 'ACCOUNT' ? 'bg-blue-500' :
                              colName === 'SALES' ? 'bg-indigo-500' :
                                'bg-emerald-500';

              return (
                <div
                  key={colName}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, colName)}
                  className="w-[340px] flex flex-col bg-surface-container-low rounded-xl border border-outline-variant/60 shadow-sm overflow-hidden h-[calc(100vh-280px)]"
                >
                  {/* Column Header */}
                  <div className={`p-4 border-b flex justify-between items-center ${headerClass}`}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-label-lg flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${dotClass}`} />
                        {displayColName}
                      </h3>
                      <button 
                        onClick={(e) => handleDeptUploadClick(e, colName)}
                        disabled={isUploading && uploadDept === colName}
                        title="Upload file to Drive"
                        className="flex items-center justify-center w-6 h-6 rounded bg-black/5 hover:bg-black/10 transition-colors disabled:opacity-50"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${isUploading && uploadDept === colName ? 'animate-spin' : ''}`}>
                          {isUploading && uploadDept === colName ? 'refresh' : 'add'}
                        </span>
                      </button>
                    </div>
                    <span className="bg-surface-container-high px-2.5 py-0.5 rounded-full text-xs font-bold text-secondary border border-outline-variant/50">
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Column Body */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {columnTasks.length === 0 && quickAddCol !== colName ? (
                      <div className="text-center py-10 flex flex-col items-center justify-center opacity-40">
                        <span className="material-symbols-outlined text-[32px] mb-2">inbox</span>
                        <span className="text-label-sm">No tasks</span>
                      </div>
                    ) : (
                      <>
                        {columnTasks.map(task => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => navigate(`/tasks/${task.id}`)}
                            className="task-card bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/60 hover:border-primary/50 cursor-pointer shadow-sm hover:shadow-md transition-all group flex flex-col gap-3 relative"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
                                  {task.id}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${task.priority === 'Urgent' ? 'bg-urgent-red/10 text-urgent-red border-urgent-red/30' :
                                    task.priority === 'High' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                                      task.priority === 'Medium' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
                                        'bg-gray-500/10 text-gray-600 border-gray-500/30'
                                  }`}>
                                  {task.priority}
                                </span>
                                {profile?.systemRole !== 'Employee' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setTaskToDelete(task.id)
                                    }}
                                    className="text-secondary hover:text-urgent-red transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center p-1 rounded-md hover:bg-urgent-red/10"
                                    title="Delete Task"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <h4 className="font-bold text-label-md text-on-surface group-hover:text-primary transition-colors leading-snug">
                              {task.title}
                            </h4>

                            <div className="flex flex-col gap-1.5 mt-1 bg-surface-container-low/50 p-2 rounded-lg border border-outline-variant/30">
                              <div className="flex items-center gap-2 text-secondary text-[12px] group/client w-fit max-w-full">
                                <span className="material-symbols-outlined text-[14px] group-hover/client:text-primary transition-colors">domain</span>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/projects/${encodeURIComponent(task.client)}`);
                                  }}
                                  className="truncate font-medium hover:text-primary hover:underline cursor-pointer transition-colors"
                                >
                                  {task.client}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-secondary text-[12px]">
                                <span className="material-symbols-outlined text-[14px]">category</span>
                                <span className="truncate font-medium">{task.department || 'COMMON'}</span>
                              </div>
                              <div className="flex items-center justify-between text-secondary text-[12px] mt-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                  <span className={(!task.daysOverdue || task.daysOverdue === 'No') ? '' : 'text-urgent-red font-bold'}>
                                    {task.dueDate}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Assignee Avatar/Name */}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center">
                                {(task.assignedTo || 'Unassigned').split(',').map(s => s.trim()).filter(Boolean).map((a, idx) => (
                                  <div key={idx} className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[9px] font-bold border-[1.5px] border-surface-container-lowest shrink-0 -ml-2 first:ml-0 relative z-10" title={a}>
                                    {getInitials(a)}
                                  </div>
                                ))}
                              </div>
                              <span className="text-[11px] text-secondary truncate flex-1">
                                {task.assignedTo || 'Unassigned'}
                              </span>
                            </div>
                          </div>
                        ))}

                        {/* Quick Add Input */}
                        {quickAddCol === colName && (
                          <div className="bg-surface-container-lowest p-3 rounded-xl border border-primary/50 shadow-md mt-2 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <input
                                autoFocus
                                type="text"
                                placeholder="Task Name..."
                                value={quickAddTitle}
                                onChange={(e) => setQuickAddTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleQuickAdd(colName)
                                  if (e.key === 'Escape') {
                                    setQuickAddCol(null)
                                    setQuickAddTitle('')
                                    setQuickAddAssignee([])
                                    setQuickAddDueDate('')
                                    setQuickAddPriority('Medium')
                                  }
                                }}
                                className="w-full bg-transparent border-none text-body-sm text-on-surface focus:ring-0 outline-none placeholder:text-secondary font-bold"
                              />
                              <button onClick={() => handleQuickAdd(colName)} className="px-2.5 py-1 text-[11px] font-bold bg-primary text-on-primary rounded hover:opacity-90 transition-opacity ml-2 shrink-0 flex items-center gap-1">
                                Save <span className="material-symbols-outlined text-[12px]">keyboard_return</span>
                              </button>
                            </div>

                            <div className="text-[11px] text-secondary mb-1">
                              {new Date().toLocaleString('en-US', { month: 'short', year: '2-digit' })}
                            </div>

                            <div className="flex items-start gap-2 text-secondary hover:text-on-surface transition-colors w-full group relative flex-col">
                              <div className="flex items-center gap-2 w-full">
                                <span className="material-symbols-outlined text-[16px] shrink-0">person_add</span>

                                <div className="flex flex-wrap gap-1 flex-1 items-center">
                                  {quickAddAssignee.map(name => (
                                    <span key={name} className="flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      {getInitials(name)}
                                      <button
                                        onClick={() => setQuickAddAssignee(prev => prev.filter(n => n !== name))}
                                        className="hover:text-red-500 flex items-center justify-center"
                                      >
                                        <span className="material-symbols-outlined text-[10px]">close</span>
                                      </button>
                                    </span>
                                  ))}

                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value && !quickAddAssignee.includes(e.target.value)) {
                                        setQuickAddAssignee(prev => [...prev, e.target.value])
                                      }
                                    }}
                                    className="flex-1 min-w-[100px] bg-transparent border-none text-[12px] font-medium outline-none focus:ring-0 cursor-pointer text-secondary group-hover:text-on-surface appearance-none py-1"
                                  >
                                    <option value="">{quickAddAssignee.length === 0 ? 'Add assignee' : 'Add more...'}</option>
                                    {employees?.filter(emp => !quickAddAssignee.includes(emp.name)).map(emp => (
                                      <option key={emp.id} value={emp.name}>{emp.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            <div
                              className="flex items-center gap-2 text-secondary hover:text-on-surface transition-colors w-full group relative cursor-pointer"
                              onClick={(e) => {
                                const input = e.currentTarget.querySelector('input');
                                if (input) {
                                  input.type = 'date';
                                  input.focus();
                                  try { input.showPicker(); } catch (err) { }
                                }
                              }}
                            >
                              <span className="material-symbols-outlined text-[16px] shrink-0">calendar_add_on</span>
                              <input
                                type="text"
                                onClick={(e) => {
                                  e.target.type = 'date';
                                  try { e.target.showPicker(); } catch (err) { }
                                }}
                                onFocus={(e) => {
                                  e.target.type = 'date';
                                  try { e.target.showPicker(); } catch (err) { }
                                }}
                                onBlur={(e) => {
                                  if (!e.target.value) e.target.type = 'text'
                                }}
                                value={quickAddDueDate}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const dateObj = new Date(e.target.value)
                                    if (dateObj.getDay() === 0) { // 0 is Sunday
                                      alert("Sundays cannot be selected as due dates.")
                                      setQuickAddDueDate('')
                                      return
                                    }
                                  }
                                  setQuickAddDueDate(e.target.value)
                                }}
                                className="w-full bg-transparent border-none text-[12px] font-medium outline-none focus:ring-0 cursor-pointer text-secondary group-hover:text-on-surface py-1"
                                placeholder="Due Date"
                              />
                            </div>

                            <div className="flex items-center gap-2 text-secondary hover:text-on-surface transition-colors w-full group relative">
                              <span className="material-symbols-outlined text-[16px] shrink-0">flag</span>
                              <select
                                value={quickAddPriority}
                                onChange={(e) => setQuickAddPriority(e.target.value)}
                                className="w-full bg-transparent border-none text-[12px] font-medium outline-none focus:ring-0 cursor-pointer text-secondary group-hover:text-on-surface appearance-none py-1"
                              >
                                <option value="Medium">Add priority</option>
                                <option value="Urgent">Urgent</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </div>

                            <div className="flex justify-start gap-2 mt-2">
                              <button onClick={() => {
                                setQuickAddCol(null);
                                setQuickAddTitle('');
                                setQuickAddAssignee([]);
                                setQuickAddDueDate('');
                                setQuickAddPriority('Medium');
                              }} className="px-3 py-1.5 text-[11px] font-bold text-secondary hover:bg-surface-container-high rounded transition-colors w-full border border-outline-variant/30">Cancel</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Add Task Button at bottom of column */}
                  {quickAddCol !== colName && (
                    <div className="p-2 border-t border-outline-variant/30 bg-surface-container-lowest shrink-0">
                      <button
                        onClick={() => {
                          setQuickAddCol(colName)
                          setQuickAddTitle('')
                        }}
                        className="w-full py-2 flex items-center justify-center gap-2 text-[12px] font-bold text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Add Task
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-scale-in flex flex-col border border-outline-variant">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-outline-variant bg-surface-container-low">
              <div className="w-9 h-9 rounded-full bg-error/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-error text-[20px]">warning</span>
              </div>
              <h2 className="text-label-lg font-bold text-on-surface">Delete Task</h2>
            </div>
            <div className="px-6 py-5 bg-surface-container-lowest">
              <p className="text-body-sm text-secondary leading-relaxed">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-5 py-2 border border-outline-variant text-secondary rounded-lg font-label-md hover:bg-surface-container-high transition-all text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteTask(taskToDelete)
                  setTaskToDelete(null)
                }}
                className="px-5 py-2 bg-error text-on-error rounded-lg font-label-md shadow-md hover:brightness-105 active:scale-95 transition-all text-sm font-bold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}



