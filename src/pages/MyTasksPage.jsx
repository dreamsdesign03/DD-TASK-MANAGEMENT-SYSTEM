import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import TaskTable from '../components/TaskTable'
import { useApp } from '../context/AppContext'

export default function MyTasksPage() {
  const location = useLocation()
  const { showNewTaskModal, setShowNewTaskModal, addTask, profile, employees, tasks, clients, addToast } = useApp()
  const teamNames = employees ? employees.map(emp => emp.name) : []


  // Derive company list: prefer live Clients sheet from n8n, fallback to task-derived clients
  const taskClients = tasks.map(t => t.client).filter(Boolean)
  const taskUniqueCompanies = [...new Set(taskClients)]
  // Extract active client names from the objects
  const activeClientNames = clients
    .filter(item => {
      const isActive = item['Is Active'] || item['isActive'] || item['is_active'] || item['Is active'] || item.isActive
      return String(isActive).toLowerCase() === 'yes' || isActive === true
    })
    .map(item => item['Project Name'] || item['Client Name'] || item['Company Name'] || item['Company'] || item['Name'] || '')
    .filter(Boolean)

  // Merge n8n clients + task-derived, deduplicated
  const allClients = [...new Set([...activeClientNames, ...taskUniqueCompanies])].filter(c => c && String(c).toLowerCase() !== 'internal')
  const companyList = allClients

  // Form states
  const [title, setTitle] = useState('')
  const [client, setClient] = useState(() => companyList[0] || '')
  const [department, setDepartment] = useState('COMMON')
  const [assignedTo, setAssignedTo] = useState([profile?.name || ''])
  const uniqueTeamMembers = [...new Set([...teamNames, ...assignedTo].filter(Boolean))]
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false)
  const [assignedBy] = useState(profile?.name || '')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [description, setDescription] = useState('')
  const [remarks, setRemarks] = useState('')
  const [post, setPost] = useState('YES')

  // Recurring task states
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringSchedule, setRecurringSchedule] = useState('Weekly')
  const [recurringDay, setRecurringDay] = useState('Monday')
  const [recurringMonths, setRecurringMonths] = useState([])
  const handleCreateTask = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      addToast('Please fill out all required fields', 'error')
      return
    }

    let formattedDate = ''
    if (dueDate) {
      formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }

    let maxIdNum = 0
    tasks.forEach(t => {
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

    const assignedEmps = employees?.filter(e => assignedTo.includes(e.name)) || []

    const newTask = {
      id: nextIdStr,
      title: title.trim(),
      client: client || companyList[0] || 'Unknown Client',
      project: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      assigned: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      assignedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      dueDate: formattedDate,
      priority,
      status: 'Pending',
      statusUpdatedOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      overdue: false,
      done: false,
      department,
      assignedTo: assignedTo.join(', '),
      assignedBy,
      employeeId: assignedEmps.map(e => e.id).filter(Boolean).join(', '),
      assignedEmail: assignedEmps.map(e => e.email).filter(Boolean).join(', '),
      description: {
        intro: description.trim() || 'No description provided.',
        bullets: [],
        outro: '',
      },
      comments: [],
      attachments: [],
      remarks,
      post,
      isRecurring,
      recurringSchedule: isRecurring ? recurringSchedule : '',
      recurringDay: isRecurring && recurringSchedule === 'Weekly' ? recurringDay : '',
      recurringMonths: isRecurring && recurringSchedule === 'Monthly' ? recurringMonths.join(', ') : '',
    }

    addTask(newTask)
    setShowNewTaskModal(false)

    // Clear form
    setTitle('')
    setDescription('')
    setRemarks('')
    setPost('YES')
    setDepartment('COMMON')
    setAssignedTo([profile?.name])
    setIsRecurring(false)
    setRecurringSchedule('Weekly')
    setRecurringDay('Monday')
    setRecurringMonths([])
  }

  return (
    <div className="bg-[#F0EDF8] font-['Inter',sans-serif] text-[#151c27] overflow-hidden h-screen flex">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F8; border-radius: 10px; }
      `}</style>
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden md:ml-[104px] transition-all duration-300">
        {/* Top nav */}
        <TopNav title={location.pathname === '/my-tasks' ? 'My Tasks' : 'All Tasks'} showSearch={true} />

        {/* Page content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 pb-6 animate-fade-in-up">
          <div className="w-full flex flex-col gap-6">
            <TaskTable />
          </div>
        </div>
      </main>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <form
            onSubmit={handleCreateTask}
            className="bg-surface-container-lowest w-[520px] rounded-lg shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto custom-scrollbar border border-outline-variant/20"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-2">
              <h2 className="text-[20px] font-extrabold text-[#702c91] flex items-center gap-2">
                <span className="material-symbols-outlined font-bold">assignment</span>
                Create New Task
              </h2>
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="text-[#9CA3AF] hover:text-[#1E1B2E] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <hr className="border-[#E5E7EB] -mx-6 mb-2" />

            {/* Form Fields */}
            <div className="space-y-5">
              {/* Task Title */}
              <div>
                <input
                  id="task_title"
                  type="text"
                  required
                  placeholder="Task Title *"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 text-[14px] text-[#1E1B2E] bg-white rounded-md border border-[#E5E7EB] focus:outline-none focus:border-[#702c91] transition-colors placeholder:text-[#9CA3AF]"
                />
              </div>

              {/* Company (Client) and Department Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider pl-1">
                    Company (Client)
                  </label>
                  <div className="relative">
                    <select
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      className="w-full appearance-none bg-white border border-[#E5E7EB] rounded-md px-4 py-2 text-[13px] text-[#1E1B2E] focus:border-[#702c91] focus:outline-none cursor-pointer transition-colors"
                    >
                      {companyList.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#9CA3AF] pointer-events-none text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider pl-1">
                    Department
                  </label>
                  <div className="relative">
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full appearance-none bg-white border border-[#E5E7EB] rounded-md px-4 py-2 text-[13px] text-[#1E1B2E] focus:border-[#702c91] focus:outline-none cursor-pointer transition-colors"
                    >
                      {['SEO', 'SOCIAL MEDIA', 'WEBSITE', 'GRAPHIC', 'HR', 'ACCOUNT', 'SALES', 'COMMON'].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#9CA3AF] pointer-events-none text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {/* Assignee, Assigned By & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Assignee */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider pl-1">
                    Assignee(s)
                  </label>
                  <div className="relative">
                    <div
                      onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                      className="w-full bg-white border border-[#E5E7EB] rounded-md px-4 py-2 text-[13px] text-[#1E1B2E] cursor-pointer flex justify-between items-center hover:border-[#702c91] transition-colors h-[38px]"
                    >
                      <span className="truncate">{assignedTo.length > 0 ? assignedTo.join(', ') : 'Select Assignee'}</span>
                      <span className="material-symbols-outlined text-[#9CA3AF] text-[18px]">
                        {isAssigneeOpen ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                    {isAssigneeOpen && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 max-h-[150px] overflow-y-auto custom-scrollbar">
                        {uniqueTeamMembers.map((m) => (
                          <label key={m} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={assignedTo.includes(m)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAssignedTo([...assignedTo, m])
                                } else {
                                  setAssignedTo(assignedTo.filter(name => name !== m))
                                }
                              }}
                              className="accent-[#702c91] w-4 h-4"
                            />
                            <span className="text-[13px] text-[#1E1B2E]">{m}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned By — locked to current user */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider pl-1">
                    Assigned By
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={assignedBy}
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-4 py-2 text-[13px] text-[#6B7280] outline-none cursor-not-allowed h-[38px]"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#9CA3AF] pointer-events-none text-[18px]">
                      lock
                    </span>
                  </div>
                </div>

                {/* Due Date - calendar picker */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider pl-1">
                    Due Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dueDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val) {
                          const selectedDate = new Date(val)
                          if (selectedDate.getUTCDay() === 0) {
                            addToast("Sundays cannot be selected as a due date. Please choose a different day.", 'error')
                            return
                          }
                        }
                        setDueDate(val)
                      }}
                      className="w-full bg-white border border-[#E5E7EB] rounded-md pl-9 pr-2 py-2 text-[13px] text-[#1E1B2E] focus:border-[#702c91] focus:outline-none cursor-pointer transition-colors h-[38px] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full"
                    />
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none text-[18px]">
                      calendar_month
                    </span>
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider pl-1">
                  Priority
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Low', 'Medium', 'High', 'Urgent'].map((p) => {
                    const isSelected = priority === p
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`py-2 rounded-md text-[13px] font-bold text-center border transition-all ${isSelected
                          ? 'bg-[#C2185B] text-white border-[#C2185B]'
                          : 'bg-white border-[#E5E7EB] text-[#4B5563] hover:border-[#9CA3AF]'
                          }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Recurring Task */}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer w-fit group">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 accent-[#702c91]"
                  />
                  <span className="text-[13px] font-extrabold text-[#1E1B2E] group-hover:text-[#702c91] transition-colors">
                    Make this a recurring task
                  </span>
                </label>

                {isRecurring && (
                  <div className="p-4 bg-white rounded-lg border border-[#E5E7EB] shadow-sm flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Schedule Type */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider pl-1">
                          Recurring Schedule
                        </label>
                        <select
                          value={recurringSchedule}
                          onChange={(e) => {
                            setRecurringSchedule(e.target.value)
                            setRecurringDay('Monday')
                            setRecurringMonths([])
                          }}
                          className="w-full bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-[13px] focus:border-[#702c91] focus:outline-none cursor-pointer"
                        >
                          <option value="Weekly">Weekly</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Yearly">Yearly</option>
                        </select>
                      </div>

                      {/* Dependent Fields */}
                      {recurringSchedule === 'Weekly' && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider pl-1">
                            Day of the Week
                          </label>
                          <select
                            value={recurringDay}
                            onChange={(e) => setRecurringDay(e.target.value)}
                            className="w-full bg-white border border-[#E5E7EB] rounded-md px-3 py-2 text-[13px] focus:border-[#702c91] focus:outline-none cursor-pointer"
                          >
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {recurringSchedule === 'Monthly' && (
                        <div className="flex flex-col gap-1 sm:col-span-2">
                          <label className="text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider pl-1">
                            Select Months (task created on 1st of month)
                          </label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((mon) => (
                              <label key={mon} className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] px-2.5 py-1.5 rounded text-[12px] cursor-pointer hover:border-[#702c91] transition-colors">
                                <input
                                  type="checkbox"
                                  checked={recurringMonths.includes(mon)}
                                  onChange={(e) => {
                                    if (e.target.checked) setRecurringMonths([...recurringMonths, mon])
                                    else setRecurringMonths(recurringMonths.filter(m => m !== mon))
                                  }}
                                  className="accent-[#702c91]"
                                />
                                {mon}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {recurringSchedule === 'Yearly' && (
                        <div className="flex flex-col justify-center sm:col-span-2 text-[12px] text-[#6B7280] italic">
                          Task will be created automatically every January 1st.
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-[#702c91] font-bold flex items-center gap-1 bg-[#F5F3FF] p-2 rounded">
                      <span className="material-symbols-outlined text-[14px]">info</span>
                      If the creation date falls on a Sunday, the task will be shifted to Monday.
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider pl-1">
                  Task Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[100px] p-3 bg-white border border-[#E5E7EB] rounded-md text-[13px] text-[#1E1B2E] focus:border-[#702c91] outline-none resize-none transition-colors placeholder:text-[#9CA3AF]"
                  placeholder="Details about the task..."
                ></textarea>
              </div>

              {/* Remarks */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider pl-1">
                  Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-md px-4 py-2 text-[13px] text-[#1E1B2E] focus:border-[#702c91] outline-none transition-colors placeholder:text-[#9CA3AF]"
                  placeholder="Any remarks..."
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB] -mx-6 px-6">
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="px-6 py-2.5 border border-[#E5E7EB] text-[#1F2937] rounded-md font-bold hover:bg-gray-50 transition-all text-[13px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#E079C3] text-white rounded-md font-bold hover:bg-[#d66ab7] transition-all text-[13px]"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}


