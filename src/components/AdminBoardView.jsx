import { useMemo, useState } from 'react'
import { PRIORITY_STYLES, STATUS_STYLES } from '../utils/taskBadges'
import { getUserColor, getInitials } from '../utils/avatar'
import { deduplicateTasks } from '../utils/formatTaskId'
import { isSubTask, isTaskOverdue, passesMonthDoneRule } from '../utils/taskStats'

const STATUS_CHIPS = ['All', 'Pending', 'In Progress', 'Review', 'Done', 'Blocked']

const COL_STYLE = {
  background: 'white',
  borderRadius: 16,
  border: '1px solid #E5E7EB',
  boxShadow: '0 8px 24px rgba(91,33,182,0.05)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const COL_BODY_STYLE = {
  maxHeight: 'calc(100vh - 380px)',
  overflowY: 'auto',
}

function ColumnHeader({ children }) {
  return (
    <div className="px-4 py-3 border-b border-[#F3F4F6] bg-[#F9FAFB]">
      <span className="text-[11px] font-bold text-[#6B7280] tracking-[0.05em] uppercase">{children}</span>
    </div>
  )
}

export default function AdminBoardView({ tasks, searchQuery, showAllTasks, onOpenTask }) {
  const [selectedEmployee, setSelectedEmployee] = useState('All employees')
  const [selectedDepartment, setSelectedDepartment] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [employeeQuery, setEmployeeQuery] = useState('')

  // Base pool: respect the page-level top filters (search + Current Month / All Tasks)
  const baseTasks = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase()
    return deduplicateTasks(tasks || []).filter((t) => {
      if (isSubTask(t)) return false
      if (!passesMonthDoneRule(t, showAllTasks)) return false
      if (!query) return true
      return (
        (t.title || '').toLowerCase().includes(query) ||
        (t.client || '').toLowerCase().includes(query) ||
        (t.assignedTo || '').toLowerCase().includes(query) ||
        (t.assignedBy || '').toLowerCase().includes(query) ||
        (t.department || '').toLowerCase().includes(query)
      )
    })
  }, [tasks, searchQuery, showAllTasks])

  const matchesEmployee = (t, employee) =>
    (t.assignedTo || '')
      .split(',')
      .map((s) => s.trim())
      .includes(employee)

  // Employees derived from the base pool (all employees that appear on tasks)
  const employees = useMemo(() => {
    const counts = new Map()
    for (const t of baseTasks) {
      for (const name of (t.assignedTo || '').split(',').map((s) => s.trim()).filter(Boolean)) {
        counts.set(name, (counts.get(name) || 0) + 1)
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [baseTasks])

  // Pool for the selected employee (feeding the department column + summary)
  const employeeScopedTasks = useMemo(() => {
    if (selectedEmployee === 'All employees') return baseTasks
    return baseTasks.filter((t) => matchesEmployee(t, selectedEmployee))
  }, [baseTasks, selectedEmployee])

  const employeeTotal = baseTasks.length

  // Departments with counts (respecting selected employee)
  const departments = useMemo(() => {
    const counts = new Map()
    for (const t of employeeScopedTasks) {
      const dept = (t.department || 'COMMON').toUpperCase()
      counts.set(dept, (counts.get(dept) || 0) + 1)
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [employeeScopedTasks])

  // Selection summary (Total / Done / Overdue)
  const summary = useMemo(() => {
    const done = employeeScopedTasks.filter((t) => t.status === 'Done').length
    const overdue = employeeScopedTasks.filter(isTaskOverdue).length
    return { total: employeeScopedTasks.length, done, overdue }
  }, [employeeScopedTasks])

  // Tasks for the wide third column (employee + department + status chip)
  const visibleTasks = useMemo(() => {
    return employeeScopedTasks.filter((t) => {
      if (selectedDepartment !== 'All' && (t.department || 'COMMON').toUpperCase() !== selectedDepartment) return false
      if (statusFilter !== 'All' && t.status !== statusFilter) return false
      return true
    })
  }, [employeeScopedTasks, selectedDepartment, statusFilter])

  const filteredEmployees = employees.filter((e) => e.name.toLowerCase().includes(employeeQuery.trim().toLowerCase()))

  const handleSelectEmployee = (name) => {
    setSelectedEmployee(name)
    setSelectedDepartment('All') // selecting an employee resets department to All
  }

  const chipStyle = (active) => ({
    padding: '5px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    border: active ? 'transparent' : '1px solid #E5E7EB',
    background: active ? 'linear-gradient(to right, #702c91 0%, #ec008c 50%, #702c91 100%)' : 'white',
    color: active ? 'white' : '#6B7280',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  })

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 260px minmax(0, 1fr)',
        gap: 16,
        alignItems: 'start',
      }}
      className="admin-board-grid mt-6"
    >
      <style>{`
        @media (max-width: 1023px) {
          .admin-board-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Column 1: Employees ── */}
      <div style={COL_STYLE}>
        <ColumnHeader>Employees</ColumnHeader>
        <div className="p-3 border-b border-[#F3F4F6]">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-[18px]">search</span>
            <input
              type="text"
              value={employeeQuery}
              onChange={(e) => setEmployeeQuery(e.target.value)}
              placeholder="Search employees..."
              className="w-full h-[36px] rounded-lg border border-[#E5E7EB] bg-white pl-8 pr-3 text-[13px] font-semibold text-[#1E1B2E] outline-none focus:border-[#702c91] transition-colors"
            />
          </div>
        </div>
        <div style={COL_BODY_STYLE} className="p-2 flex flex-col gap-0.5">
          <button
            onClick={() => handleSelectEmployee('All employees')}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer"
            style={{
              background: selectedEmployee === 'All employees' ? '#F5F3FF' : 'transparent',
              border: 'none',
            }}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ color: selectedEmployee === 'All employees' ? '#702c91' : '#9CA3AF' }}>groups</span>
            <span className="flex-1 text-[13px] font-bold truncate" style={{ color: selectedEmployee === 'All employees' ? '#702c91' : '#4B5563' }}>All employees</span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: selectedEmployee === 'All employees' ? '#702c91' : '#F3F4F6', color: selectedEmployee === 'All employees' ? '#fff' : '#6B7280' }}>{employeeTotal}</span>
          </button>
          {filteredEmployees.map((emp) => {
            const active = selectedEmployee === emp.name
            return (
              <button
                key={emp.name}
                onClick={() => handleSelectEmployee(emp.name)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer"
                style={{ background: active ? '#F5F3FF' : 'transparent', border: 'none' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#FAFAFB' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <div className="w-7 h-7 rounded-full text-white flex items-center justify-center text-[11px] font-bold shrink-0" style={{ backgroundColor: getUserColor(emp.name) }}>
                  {getInitials(emp.name)}
                </div>
                <span className="flex-1 text-[13px] font-semibold truncate" style={{ color: active ? '#702c91' : '#4B5563' }} title={emp.name}>{emp.name}</span>
                <span className="text-[11px] font-bold text-[#9CA3AF]">{emp.count}</span>
              </button>
            )
          })}
          {filteredEmployees.length === 0 && (
            <div className="text-center py-6 text-[12px] text-[#9CA3AF]">No employees match</div>
          )}
        </div>
      </div>

      {/* ── Column 2: Departments ── */}
      <div style={COL_STYLE}>
        <ColumnHeader>Departments</ColumnHeader>
        <div style={COL_BODY_STYLE} className="p-2 flex flex-col gap-0.5">
          <button
            onClick={() => setSelectedDepartment('All')}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer"
            style={{ background: selectedDepartment === 'All' ? '#F5F3FF' : 'transparent', border: 'none' }}
          >
            <span className="text-[13px] font-bold" style={{ color: selectedDepartment === 'All' ? '#702c91' : '#4B5563' }}>All</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: selectedDepartment === 'All' ? '#702c91' : '#F3F4F6', color: selectedDepartment === 'All' ? '#fff' : '#6B7280' }}>{summary.total}</span>
          </button>
          {departments.map((dept) => {
            const active = selectedDepartment === dept.name
            return (
              <button
                key={dept.name}
                onClick={() => setSelectedDepartment(dept.name)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer"
                style={{ background: active ? '#F5F3FF' : 'transparent', border: 'none' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#FAFAFB' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="text-[13px] font-semibold truncate" style={{ color: active ? '#702c91' : '#4B5563' }}>{dept.name}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: active ? '#702c91' : '#F3F4F6', color: active ? '#fff' : '#6B7280' }}>{dept.count}</span>
              </button>
            )
          })}
          {departments.length === 0 && (
            <div className="text-center py-6 text-[12px] text-[#9CA3AF]">No departments</div>
          )}
        </div>
        <div className="flex items-center justify-between px-3 py-3 border-t border-[#F3F4F6] bg-[#F9FAFB]">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Total</span>
            <span className="text-[15px] font-extrabold text-[#1E1B2E]">{summary.total}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Done</span>
            <span className="text-[15px] font-extrabold text-[#16A34A]">{summary.done}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Overdue</span>
            <span className="text-[15px] font-extrabold text-[#DC2626]">{summary.overdue}</span>
          </div>
        </div>
      </div>

      {/* ── Column 3: Tasks ── */}
      <div style={COL_STYLE}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#F3F4F6] bg-[#F9FAFB]">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-[14px] font-extrabold text-[#702c91] m-0 truncate">
              Tasks · {selectedEmployee} · {selectedDepartment === 'All' ? 'All Departments' : selectedDepartment}
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#702c91] text-white shrink-0">{visibleTasks.length}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_CHIPS.map((s) => (
              <button key={s} style={chipStyle(statusFilter === s)} onClick={() => setStatusFilter(s)}>{s}</button>
            ))}
          </div>
        </div>

        <div style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }} className="custom-scrollbar">
          {visibleTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#9CA3AF]">
              <span className="material-symbols-outlined text-[36px] mb-2 opacity-50">inbox</span>
              <span className="text-[13px] font-semibold">No tasks for this selection</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-white border-b border-[#E5E7EB]">
                    {['Task Title', 'Client', 'Assigned By', 'Due Date', 'Priority', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-[#6B7280] tracking-[0.05em] uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.map((task) => {
                    const overdue = isTaskOverdue(task)
                    return (
                      <tr
                        key={task.id}
                        onClick={() => onOpenTask && onOpenTask(task)}
                        className="border-b border-[#F3F4F6] hover:bg-[#FAF5FF] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 max-w-[260px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-[#1E1B2E] truncate" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.title}>{task.title}</span>
                            {task.isRecurring && <span className="material-symbols-outlined text-[14px] text-primary shrink-0">event_repeat</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-[#6B7280] whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-[#9CA3AF]">domain</span>
                            {task.client}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const cleanName = String(task.assignedBy || '').replace(/[^\w\s-]/g, '').trim() || '—'
                              return (
                                <>
                                  <div className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: getUserColor(cleanName) }}>{getInitials(cleanName)}</div>
                                  <span className="text-[12px] text-[#6B7280]">{cleanName}</span>
                                </>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[12px] font-bold ${overdue ? 'text-[#DC2626]' : 'text-[#6B7280]'}`}>{task.dueDate || 'No Date'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`${PRIORITY_STYLES[task.priority] || 'bg-gray-400 text-white'} inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider`}>{task.priority || 'Medium'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`${STATUS_STYLES[task.status] || 'bg-gray-100 text-gray-700'} inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase`}>
                            {task.status}
                            {task.status === 'Done' && <span className="material-symbols-outlined text-[12px]">check</span>}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
