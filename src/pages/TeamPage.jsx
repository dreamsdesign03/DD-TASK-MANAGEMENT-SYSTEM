import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'


const INITIAL_EMPLOYEES = []

export default function TeamPage() {
  const { setSearchQuery, profile, employees: dynamicEmployees, tasks, addToast } = useApp()
  const navigate = useNavigate()
  const [localEmployees, setLocalEmployees] = useState([])
  const [activeDept, setActiveDept] = useState('All')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Add Member Form States
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newDept, setNewDept] = useState('Development')
  const [newEmail, setNewEmail] = useState('')
  const [newAvatar, setNewAvatar] = useState('')

  const handleAddMember = (e) => {
    e.preventDefault()
    if (!newName.trim() || !newRole.trim() || !newEmail.trim()) {
      addToast('Please fill out all required fields', 'error')
      return
    }

    const newEmp = {
      id: Date.now(),
      name: newName.trim(),
      role: newRole.trim(),
      department: newDept,
      email: newEmail.trim(),
      avatar: newAvatar,
      status: 'Online',
      taskCount: 0,
    }

    setLocalEmployees((prev) => [...prev, newEmp])
    setShowAddModal(false)

    // Clear inputs
    setNewName('')
    setNewRole('')
    setNewEmail('')
  }

  // Merge dynamic team members with any locally added ones, and map task count dynamically
  const baseEmployees = dynamicEmployees && dynamicEmployees.length > 0 ? dynamicEmployees : INITIAL_EMPLOYEES
  const employees = [...baseEmployees, ...localEmployees].map(emp => {
    const taskCount = tasks ? tasks.filter(t => t.assignedTo === emp.name && t.status !== 'Done').length : 0
    return { ...emp, taskCount }
  })

  // Filter Employees
  const filtered = employees.filter((e) => {
    const dept = (e.department || '').toLowerCase().trim()
    const matchesDept = activeDept === 'All' || dept === activeDept.toLowerCase().trim()
    const query = search.toLowerCase()
    const matchesSearch =
      (e.name || '').toLowerCase().includes(query) ||
      (e.role || '').toLowerCase().includes(query) ||
      (e.department || '').toLowerCase().includes(query)
    return matchesDept && matchesSearch
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'Online':
        return 'bg-green-500'
      case 'Busy':
        return 'bg-amber-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background, #F0EDF8)', display: 'flex' }}>
      <Sidebar />

      <main className="flex-1 flex flex-col h-[100vh] overflow-hidden md:ml-[104px] transition-all duration-300">
        <TopNav title="Team Directory" showSearch={false} />

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
          <div className="max-w-[1200px] mx-auto w-full bg-white dark:bg-[#1e1b2e] rounded-[20px] shadow-[0_8px_24px_rgba(91,33,182,0.08)] p-6 md:p-8">

            {/* Filter and Search controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/40 shadow-sm">


              <div className="relative w-full md:w-80">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by name, role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-md pl-10 pr-4 py-2.5 text-body-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>

            {/* Directory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.length === 0 ? (
                <div className="col-span-full text-center py-20 text-secondary">
                  <span className="material-symbols-outlined text-[48px] mb-4">group_off</span>
                  <p className="font-label-lg text-label-lg">No matching team members found.</p>
                </div>
              ) : (
                filtered.map((emp) => (
                  <div
                    key={emp.id}
                    className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 p-6 flex flex-col items-center text-center relative hover:border-outline-variant transition-all duration-200 hover:shadow-sm"
                  >
                    {/* Status indicator dot */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-surface-container-low px-2 py-0.5 rounded-full border border-outline-variant/30">
                      <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(emp.status)}`}></span>
                      <span className="text-[10px] font-bold text-secondary font-['Montserrat'] uppercase">
                        {emp.status}
                      </span>
                    </div>

                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full overflow-hidden mb-4 border border-outline-variant/30 flex items-center justify-center bg-surface-container text-primary">
                      {emp.email === profile.email ? (
                        profile.avatar ? (
                          <img src={profile.avatar} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[20px] font-medium tracking-tight">
                            {(() => {
                              const name = profile.name || emp.name
                              const parts = name.split(' ')
                              if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
                              return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                            })()}
                          </span>
                        )
                      ) : emp.avatar ? (
                        <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[20px] font-medium tracking-tight">
                          {(() => {
                            const name = emp.name
                            const parts = name.split(' ')
                            if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
                            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                          })()}
                        </span>
                      )}
                    </div>

                    {/* Name & Title */}
                    <h3 className="font-Montserrat font-bold text-on-surface text-lg leading-tight mb-1">
                      {emp.name}
                    </h3>
                    <p className="text-secondary text-label-md font-medium mb-3">{emp.role}</p>

                    {/* Dept Badge */}
                    <span className="bg-surface-container-low text-secondary border border-outline-variant/50 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide mb-4">
                      {emp.department}
                    </span>

                    {/* Contact Details */}
                    <div className="w-full text-left space-y-2 text-label-sm text-secondary border-t border-divider pt-4 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-outline">mail</span>
                        <span className="truncate">{emp.email}</span>
                      </div>


                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-1 gap-3 w-full mt-6">
                      {emp.email !== profile.email ? (
                        <button
                          onClick={() => navigate('/chat', { state: { openChatWithName: emp.name } })}
                          className="flex items-center justify-center gap-2 border border-outline text-secondary py-2 rounded-md font-body-sm hover:border-primary hover:text-primary active:scale-[0.98] transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">chat</span>
                          Message
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSearchQuery(emp.name)
                            navigate('/tasks')
                          }}
                          className="flex items-center justify-center gap-2 bg-primary text-on-primary py-2 rounded-md font-body-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          Tasks
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            </div>
          </div>
      </main>
    </div>
  )
}


