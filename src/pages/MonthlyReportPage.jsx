import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export default function MonthlyReportPage() {
  const navigate = useNavigate()
  const { tasks } = useApp()
  const [filterType, setFilterType] = useState('Overall') // 'Overall', 'Company', 'User'
  const [selectedValue, setSelectedValue] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  // Derive unique months from task due dates
  const availableMonths = useMemo(() => {
    const months = new Set()
    tasks.forEach(t => {
      if (t.dueDate) {
        const d = new Date(t.dueDate)
        if (!isNaN(d.getTime())) {
          months.add(d.toLocaleString('default', { month: 'long', year: 'numeric' }))
        }
      }
    })
    const monthArray = Array.from(months)
    monthArray.sort((a, b) => new Date(a) - new Date(b))
    return ['All Months', ...monthArray]
  }, [tasks])

  // Initialize with 'All Months' or the most recent month
  const [currentMonth, setCurrentMonth] = useState('All Months')

  // Derive unique clients and users
  const clients = [...new Set(tasks.map((t) => t.client).filter(c => c && c.toLowerCase() !== 'internal'))].sort()
  const users = [...new Set(tasks.flatMap((t) => (t.assignedTo || '').split(',').map(s => s.trim())).filter(Boolean))].sort()

  const handleFilterChange = (type) => {
    setFilterType(type)
    if (type === 'Overall') setSelectedValue('')
    else if (type === 'Company') setSelectedValue(clients[0] || '')
    else if (type === 'User') setSelectedValue(users[0] || '')
  }

  // Filter tasks based on selection
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Exclude Internal projects from the report completely
      if (t.client && t.client.toLowerCase() === 'internal') return false

      // Month filter
      if (currentMonth !== 'All Months') {
        if (!t.dueDate) return false
        const d = new Date(t.dueDate)
        if (isNaN(d.getTime())) return false
        const taskMonth = d.toLocaleString('default', { month: 'long', year: 'numeric' })
        if (taskMonth !== currentMonth) return false
      }

      if (filterType === 'Company' && selectedValue) {
        return t.client === selectedValue
      }
      if (filterType === 'User' && selectedValue) {
        return (t.assignedTo || '').includes(selectedValue)
      }
      return true
    })
  }, [tasks, filterType, selectedValue, currentMonth])

  // Compute metrics
  const totalTasks = filteredTasks.length
  const completed = filteredTasks.filter((t) => t.status === 'Done').length
  const inProgress = filteredTasks.filter((t) => t.status === 'In Progress' || t.status === 'Review').length
  const blocked = filteredTasks.filter((t) => t.status === 'Blocked').length
  const overdue = filteredTasks.filter((t) => t.daysOverdue && t.daysOverdue !== 'No').length
  const pending = filteredTasks.filter((t) => t.status === 'Pending').length

  const completedPct = totalTasks ? Math.round((completed / totalTasks) * 100) : 0
  const inProgressPct = totalTasks ? Math.round((inProgress / totalTasks) * 100) : 0
  const pendingPct = totalTasks ? Math.round((pending / totalTasks) * 100) : 0
  const blockedPct = totalTasks ? Math.round((blocked / totalTasks) * 100) : 0

  // Calculate conic gradient string for the donut chart
  // Order: Done -> In Progress -> Pending -> Blocked
  // SVG Donut Chart Calculations
  const radius = 42.5
  const circumference = 2 * Math.PI * radius
  
  const doneDash = (completedPct / 100) * circumference
  const inProgressDash = (inProgressPct / 100) * circumference
  const pendingDash = (pendingPct / 100) * circumference
  const blockedDash = (blockedPct / 100) * circumference

  const handleDownloadPDF = async () => {
    setIsDownloading(true)
    const element = document.getElementById('report-content')
    if (!element) return

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.classList.remove('dark')
          const clonedElement = clonedDoc.getElementById('report-content')
          if (clonedElement) {
            clonedElement.style.backgroundColor = '#fbf9f8'
            clonedElement.style.padding = '40px'

            // Fix vertical clipping bug caused by truncate / overflow: hidden
            const truncates = clonedElement.querySelectorAll('.truncate')
            truncates.forEach(el => {
              el.classList.remove('truncate', 'max-w-[150px]', 'inline-block')
            })

            // Fix vertical clipping and bad rendering of <select> elements in html2canvas
            const selects = clonedElement.querySelectorAll('select')
            selects.forEach(sel => {
              const selectedText = sel.options[sel.selectedIndex]?.text || ''
              const span = clonedDoc.createElement('span')
              span.innerText = selectedText
              span.className = sel.className + ' inline-block'
              // Strip borders/backgrounds for a cleaner PDF look or keep them
              sel.parentNode.replaceChild(span, sel)
            })
          }
        }
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

      const sanitizedMonth = currentMonth.replace(/\s+/g, '_')
      const sanitizedValue = filterType === 'Overall' ? 'Overall' : selectedValue.replace(/\s+/g, '_')
      const fileName = `Dreamsdesk_Report_${sanitizedMonth}_${sanitizedValue}.pdf`

      pdf.save(fileName)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="bg-background text-on-surface flex h-screen overflow-hidden">
      <Sidebar />

      <div className="ml-[240px] flex flex-col flex-1 h-screen overflow-hidden">
        <TopNav />

        <main className="flex-1 bg-surface-container-lowest overflow-y-auto pb-12 custom-scrollbar">
          <div id="report-content" className="max-w-[1200px] mx-auto p-8 space-y-8">
            {/* Title & Month Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <h2 className="font-Montserrat font-bold text-[28px] text-primary">Monthly Report Analysis</h2>
              <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant px-4 py-2 rounded-lg shadow-sm">
                <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(e.target.value)}
                  className="font-Montserrat font-semibold text-primary whitespace-nowrap bg-transparent outline-none cursor-pointer appearance-none pr-4"
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-primary pointer-events-none -ml-4 text-[20px]">expand_more</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="flex items-center gap-2 bg-surface-container-lowest rounded-lg p-1 shadow-sm border border-outline-variant">
                {['Overall', 'Company', 'User'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleFilterChange(type)}
                    className={`px-4 py-2 rounded-md font-label-md transition-all ${
                      filterType === type ? 'bg-primary-container text-white shadow-sm' : 'text-secondary hover:bg-surface-container'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Dynamic Dropdown based on filter type */}
              {filterType === 'Company' && (
                <div className="flex items-center gap-3">
                  <label className="text-label-sm font-bold text-secondary uppercase">Select Client:</label>
                  <select
                    value={selectedValue}
                    onChange={(e) => setSelectedValue(e.target.value)}
                    className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm font-label-md focus:border-primary outline-none min-w-[200px]"
                  >
                    {clients.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              {filterType === 'User' && (
                <div className="flex items-center gap-3">
                  <label className="text-label-sm font-bold text-secondary uppercase">Select User:</label>
                  <select
                    value={selectedValue}
                    onChange={(e) => setSelectedValue(e.target.value)}
                    className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm font-label-md focus:border-primary outline-none min-w-[200px]"
                  >
                    {users.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Tasks Assigned */}
              <div className="ambient-card p-6 flex items-start justify-between border-t-4 border-primary hover:-translate-y-0.5 transition-all duration-300">
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase mb-1">Total Tasks</p>
                  <h3 className="text-headline-lg text-primary">{totalTasks}</h3>
                </div>
                <span className="material-symbols-outlined text-primary opacity-30 dark:opacity-80 text-4xl">
                  assignment_add
                </span>
              </div>

              {/* Completed */}
              <div className="ambient-card p-6 flex items-start justify-between border-t-4 border-[#2ECC71] hover:-translate-y-0.5 transition-all duration-300">
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase mb-1">Completed</p>
                  <h3 className="text-headline-lg text-[#2ECC71]">{completed}</h3>
                  <div className="w-32 h-2 bg-gray-200 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#2ECC71] h-full transition-all" style={{ width: `${completedPct}%` }}></div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#2ECC71] opacity-30 dark:opacity-80 text-4xl">
                  check_circle
                </span>
              </div>

              {/* In Progress */}
              <div className="ambient-card p-6 flex items-start justify-between border-t-4 border-[#F1C40F] hover:-translate-y-0.5 transition-all duration-300">
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase mb-1">In Progress</p>
                  <h3 className="text-headline-lg text-[#F1C40F]">{inProgress}</h3>
                  <p className="text-xs text-on-surface-variant mt-2">Active now</p>
                </div>
                <span className="material-symbols-outlined text-[#F1C40F] opacity-30 dark:opacity-80 text-4xl">
                  pending
                </span>
              </div>

              {/* Overdue */}
              <div className="ambient-card p-6 flex items-start justify-between border-t-4 border-[#E74C3C] hover:-translate-y-0.5 transition-all duration-300">
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase mb-1">Overdue</p>
                  <h3 className="text-headline-lg text-[#E74C3C]">{overdue}</h3>
                  {overdue > 0 ? (
                    <p className="text-xs text-[#E74C3C] font-semibold mt-2">Requires attention!</p>
                  ) : (
                    <p className="text-xs text-[#2ECC71] font-semibold mt-2">All on track</p>
                  )}
                </div>
                <span className="material-symbols-outlined text-[#E74C3C] opacity-30 dark:opacity-80 text-4xl">
                  warning
                </span>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Breakdown (Donut) */}
              <div className="ambient-card p-6 flex flex-col hover:-translate-y-0.5 transition-all duration-300">
                <h4 className="font-bold text-headline-sm text-on-surface mb-8">Status Breakdown</h4>
                {totalTasks === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-secondary font-label-md">
                    No data available for this selection.
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center gap-8 flex-wrap">
                    <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {/* Background ring */}
                        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-surface-container-high, #e9e8e7)" strokeWidth="15" />
                        
                        {/* Done */}
                        {completedPct > 0 && (
                          <circle cx="50" cy="50" r={radius} fill="none" stroke="#2ECC71" strokeWidth="15" 
                            strokeDasharray={`${doneDash} ${circumference}`} 
                            strokeDashoffset={0} />
                        )}
                        {/* In Progress */}
                        {inProgressPct > 0 && (
                          <circle cx="50" cy="50" r={radius} fill="none" stroke="#F1C40F" strokeWidth="15" 
                            strokeDasharray={`${inProgressDash} ${circumference}`} 
                            strokeDashoffset={-doneDash} />
                        )}
                        {/* Pending */}
                        {pendingPct > 0 && (
                          <circle cx="50" cy="50" r={radius} fill="none" stroke="#3498DB" strokeWidth="15" 
                            strokeDasharray={`${pendingDash} ${circumference}`} 
                            strokeDashoffset={-(doneDash + inProgressDash)} />
                        )}
                        {/* Blocked */}
                        {blockedPct > 0 && (
                          <circle cx="50" cy="50" r={radius} fill="none" stroke="#E74C3C" strokeWidth="15" 
                            strokeDasharray={`${blockedDash} ${circumference}`} 
                            strokeDashoffset={-(doneDash + inProgressDash + pendingDash)} />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full pointer-events-none">
                        <span className="text-headline-md font-bold text-on-surface">{totalTasks}</span>
                        <span className="text-label-sm text-on-surface-variant">Total</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#2ECC71]"></span>
                        <span className="text-label-md text-on-surface-variant">Done ({completedPct}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#F1C40F]"></span>
                        <span className="text-label-md text-on-surface-variant">In Progress ({inProgressPct}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#3498DB]"></span>
                        <span className="text-label-md text-on-surface-variant">Pending ({pendingPct}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#E74C3C]"></span>
                        <span className="text-label-md text-on-surface-variant">Blocked ({blockedPct}%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Insights Card */}
              <div className="ambient-card p-6 flex flex-col hover:-translate-y-0.5 transition-all duration-300">
                <h4 className="font-bold text-headline-sm text-on-surface mb-6">Key Insights</h4>
                <div className="space-y-4 flex-1">
                  <div className="bg-surface-container-low p-4 rounded-lg flex items-start gap-3 border-l-4 border-primary">
                    <span className="material-symbols-outlined text-primary mt-0.5">info</span>
                    <div>
                      <h5 className="font-bold text-body-sm text-on-surface">Completion Rate</h5>
                      <p className="text-xs text-secondary mt-1">
                        {filterType === 'Overall' ? 'Overall' : selectedValue} has a completion rate of {completedPct}%.
                        {completedPct > 50 ? ' Great progress!' : ' There is room for improvement.'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-lg flex items-start gap-3 border-l-4 border-[#F1C40F]">
                    <span className="material-symbols-outlined text-[#F1C40F] mt-0.5">trending_flat</span>
                    <div>
                      <h5 className="font-bold text-body-sm text-on-surface">Active Workload</h5>
                      <p className="text-xs text-secondary mt-1">
                        There are {inProgress} tasks currently actively being worked on.
                      </p>
                    </div>
                  </div>
                  {overdue > 0 && (
                    <div className="bg-surface-container-low p-4 rounded-lg flex items-start gap-3 border-l-4 border-[#E74C3C]">
                      <span className="material-symbols-outlined text-[#E74C3C] mt-0.5">warning</span>
                      <div>
                        <h5 className="font-bold text-body-sm text-on-surface">Overdue Alerts</h5>
                        <p className="text-xs text-secondary mt-1">
                          {overdue} tasks are overdue. Immediate follow-up is recommended.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Project / Lists Progress View */}
            <div className="ambient-card overflow-hidden">
              <div className="p-6 border-b border-outline-variant flex items-center justify-between">
                <h4 className="font-bold text-headline-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">view_list</span>
                  Project Progress Lists
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant text-label-sm text-secondary uppercase tracking-wider">
                      <th className="px-6 py-4 font-bold">Name</th>
                      <th className="px-6 py-4 font-bold w-[250px]">Progress</th>
                      <th className="px-6 py-4 font-bold">Start</th>
                      <th className="px-6 py-4 font-bold">End</th>
                      <th className="px-6 py-4 font-bold">Priority</th>
                      <th className="px-6 py-4 font-bold">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50 bg-surface-container-lowest">
                    {(() => {
                      const projectsMap = {};
                      filteredTasks.forEach(t => {
                        const clientName = t.client || 'General';
                        if (!projectsMap[clientName]) {
                          projectsMap[clientName] = {
                            name: clientName,
                            total: 0,
                            progressScore: 0,
                            start: t.assignedDate || t.assigned || '-',
                            end: t.dueDate || '-',
                            priority: t.priority || 'Medium',
                            owner: (t.assignedTo || 'Unassigned').split(',')[0].trim()
                          };
                        }
                        projectsMap[clientName].total += 1;
                        
                        // Weighted progress according to status
                        if (t.status === 'Done') projectsMap[clientName].progressScore += 100;
                        else if (t.status === 'Review') projectsMap[clientName].progressScore += 75;
                        else if (t.status === 'In Progress') projectsMap[clientName].progressScore += 50;
                        // Pending and Blocked = 0
                      });
                      
                      const projectsList = Object.values(projectsMap).sort((a,b) => b.total - a.total);
                      
                      if (projectsList.length === 0) {
                        return (
                          <tr>
                            <td colSpan="6" className="text-center py-8 text-secondary text-sm">
                              No projects found for this selection.
                            </td>
                          </tr>
                        );
                      }

                      return projectsList.map((proj, idx) => {
                        const progressPct = proj.total > 0 ? Math.round(proj.progressScore / proj.total) : 0;
                        return (
                          <tr key={idx} className="hover:bg-surface-container-low transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 font-bold text-on-surface cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/projects/${encodeURIComponent(proj.name)}`)}>
                                <span className="material-symbols-outlined text-[18px] text-secondary group-hover:text-primary">folder_open</span>
                                {proj.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden flex-1 border border-outline-variant/30">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${progressPct === 100 ? 'bg-[#2ECC71]' : 'bg-primary'}`} 
                                    style={{ width: `${progressPct}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-bold text-secondary whitespace-nowrap w-12 text-right">
                                  {progressPct}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-xs text-secondary font-medium">
                                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                {proj.start}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-xs text-secondary font-medium">
                                <span className="material-symbols-outlined text-[14px]">event</span>
                                {proj.end}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                                proj.priority === 'Urgent' ? 'bg-urgent-red/10 text-urgent-red border-urgent-red/30' :
                                proj.priority === 'High' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
                                'bg-blue-500/10 text-blue-600 border-blue-500/30'
                              }`}>
                                <span className="material-symbols-outlined text-[10px] mr-1 inline-block align-middle pb-[1px]">flag</span>
                                {proj.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {proj.owner.substring(0,2).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-secondary truncate max-w-[100px]">{proj.owner}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Filtered Task Table */}
            <div className="ambient-card overflow-hidden">
              <div className="p-6 border-b border-outline-variant flex items-center justify-between">
                <h4 className="font-bold text-headline-sm text-on-surface">
                  {filterType === 'Overall' ? 'All Tasks Activity' : `${selectedValue} Activity`}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="px-6 py-4 font-label-md text-on-surface-variant">Task ID</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant">Task Title</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant">Client</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant">Assigned To</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant">Status</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DDF0]">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-secondary text-sm">
                          No tasks found for this selection.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((row) => (
                        <tr
                          key={row.id}
                          className={`table-row-hover ${
                            row.status === 'Done'
                              ? 'border-l-4 border-[#2ECC71]'
                              : row.daysOverdue && row.daysOverdue !== 'No'
                              ? 'border-l-4 border-[#E74C3C]'
                              : ''
                          }`}
                        >
                          <td className="px-6 py-4 font-mono text-xs text-on-surface-variant font-bold">{row.id}</td>
                          <td className="px-6 py-4 font-label-md">{row.title}</td>
                          <td className="px-6 py-4 text-body-sm">{row.client}</td>
                          <td className="px-6 py-4 text-body-sm">
                            <span className="truncate max-w-[150px] inline-block">{row.assignedTo || 'Unassigned'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                row.status === 'Done'
                                  ? 'bg-[#2ECC71]/10 text-[#2ECC71]'
                                  : row.status === 'In Progress' || row.status === 'Review'
                                  ? 'bg-[#F1C40F]/10 text-[#F1C40F]'
                                  : row.status === 'Blocked'
                                  ? 'bg-[#E74C3C]/10 text-[#E74C3C]'
                                  : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-body-sm">
                            <button
                              onClick={() => navigate(`/tasks/${row.id}`)}
                              className="text-primary font-label-sm hover:underline flex items-center gap-1"
                            >
                              View <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Action */}
            <div className="flex justify-center md:justify-end pb-8" data-html2canvas-ignore>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-2 border-2 border-primary text-primary font-label-lg px-8 py-3 rounded-lg hover:bg-primary-container hover:text-white transition-all group disabled:opacity-70 disabled:cursor-wait"
              >
                {isDownloading ? (
                  <span className="material-symbols-outlined animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined transition-transform group-hover:translate-y-1">download</span>
                )}
                {isDownloading ? 'Generating PDF...' : 'Download PDF Report'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

