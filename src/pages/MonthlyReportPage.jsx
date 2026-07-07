import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import SelectDropdown from '../components/SelectDropdown'
import { useApp } from '../context/AppContext'
import { getAllUsersMonthlyActivity, formatDuration } from '../utils/activityLog'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export default function MonthlyReportPage() {
  const navigate = useNavigate()
  const { tasks, addToast } = useApp()
  const [filterType, setFilterType] = useState('Overall')
  const [selectedValue, setSelectedValue] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  // Date range filter state
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const clients = [...new Set((tasks || []).map((t) => t?.client).filter(c => c && String(c).toLowerCase() !== 'internal'))].sort()
  const users = [...new Set((tasks || []).flatMap((t) => String(t?.assignedTo || '').split(',').map(s => s.trim())).filter(Boolean))].sort()

  const handleFilterChange = (type) => {
    setFilterType(type)
    if (type === 'Overall') setSelectedValue('')
    else if (type === 'Company') setSelectedValue(clients[0] || '')
    else if (type === 'User') setSelectedValue(users[0] || '')
  }

  const isInDateRange = (task) => {
    if (!dateFrom && !dateTo) return true
    const d = task.dueDate ? new Date(task.dueDate) : null
    if (!d || isNaN(d.getTime())) return !dateFrom && !dateTo
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(dateTo) : null
    if (from && d < from) return false
    if (to) {
      const toEnd = new Date(to)
      toEnd.setHours(23, 59, 59, 999)
      if (d > toEnd) return false
    }
    return true
  }

  const sanitizedDateRange = useMemo(() => {
    if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`
    if (dateFrom) return `from ${dateFrom}`
    if (dateTo) return `until ${dateTo}`
    return 'All Dates'
  }, [dateFrom, dateTo])

  const filteredTasks = useMemo(() => {
    return (tasks || []).filter((t) => {
      if (t?.client && String(t.client).toLowerCase() === 'internal') return false
      if (!isInDateRange(t)) return false
      if (filterType === 'Company' && selectedValue) {
        return t.client === selectedValue
      }
      if (filterType === 'User' && selectedValue) {
        return (t.assignedTo || '').includes(selectedValue)
      }
      return true
    })
  }, [tasks, filterType, selectedValue, dateFrom, dateTo])

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

      const sanitizedRange = sanitizedDateRange.replace(/\s+/g, '_').replace(/-/g, '')
      const sanitizedValue = filterType === 'Overall' ? 'Overall' : selectedValue.replace(/\s+/g, '_')
      const fileName = `Dreamsdesk_Report_${sanitizedRange}_${sanitizedValue}.pdf`

      pdf.save(fileName)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      addToast('Failed to generate PDF. Please try again.', 'error')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="bg-[#F0EDF8] font-['Inter',sans-serif] text-[#151c27] overflow-hidden h-screen flex">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F8; border-radius: 10px; }

        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .donut-segment {
          transition: stroke-dasharray 0.3s ease;
        }
      `}</style>

      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden md:ml-[104px] transition-all duration-300">
        <TopNav title="Reports" showSearch={false} />

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 pb-6 animate-fade-in-up">
          <div id="report-content" className="w-full">
            
            {/* Header Row */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <h2 className="text-[26px] font-bold text-[#702c91] m-0">Monthly Report Analysis</h2>
            </div>

            {/* Filter Tabs & Date Range */}
            <div className="flex flex-col md:flex-row md:justify-between gap-4 items-start md:items-center mb-8 flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex bg-[#F3F4F6] p-1 rounded-lg w-max">
                  {['Overall', 'Company', 'User'].map(type => (
                    <button
                      key={type}
                      onClick={() => handleFilterChange(type)}
                      className={`px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition-all border-none ${
                        filterType === type 
                          ? 'bg-gradient-to-r from-[#702c91] to-[#ec008c] text-white shadow-sm' 
                          : 'bg-transparent text-[#6B7280] hover:text-[#1E1B2E]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Dynamic Dropdown based on filter type */}
                {filterType === 'Company' && (
                  <SelectDropdown value={selectedValue} onChange={setSelectedValue} options={clients} style={{ minWidth: 200 }} />
                )}
                {filterType === 'User' && (
                  <SelectDropdown value={selectedValue} onChange={setSelectedValue} options={users} style={{ minWidth: 200 }} />
                )}
              </div>

              {/* Date Range Inputs styled like SelectDropdown */}
              <div className="flex items-center gap-3">
                <div style={{ position: 'relative', width: 160 }}>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: 12,
                      padding: '10px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1E1B2E',
                      outline: 'none',
                      cursor: 'pointer',
                      minHeight: 44,
                      fontFamily: 'Inter, sans-serif',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#702c91'; e.target.style.boxShadow = '0 0 0 3px rgba(112,44,145,0.1)' }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                  />
                  <span style={{
                    position: 'absolute',
                    left: 12,
                    top: -8,
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'white',
                    padding: '0 4px',
                    pointerEvents: 'none',
                  }}>From</span>
                </div>
                <div style={{ position: 'relative', width: 160 }}>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: 12,
                      padding: '10px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1E1B2E',
                      outline: 'none',
                      cursor: 'pointer',
                      minHeight: 44,
                      fontFamily: 'Inter, sans-serif',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#702c91'; e.target.style.boxShadow = '0 0 0 3px rgba(112,44,145,0.1)' }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                  />
                  <span style={{
                    position: 'absolute',
                    left: 12,
                    top: -8,
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'white',
                    padding: '0 4px',
                    pointerEvents: 'none',
                  }}>To</span>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Total Tasks */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB] relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/10 cursor-default">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#ec008c]"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Total Tasks</p>
                    <h3 className="text-[32px] font-black text-[#702c91] leading-none m-0">{totalTasks}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#702c91]">assignment</span>
                  </div>
                </div>
              </div>

              {/* Completed */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB] relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/10 cursor-default">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#10B981]"></div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Completed</p>
                    <h3 className="text-[32px] font-black text-[#10B981] leading-none m-0">{completed}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#10B981]">check_circle</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#10B981] h-full rounded-full" style={{ width: `${completedPct}%` }}></div>
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB] relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/10 cursor-default">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#F59E0B]"></div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">In Progress</p>
                    <h3 className="text-[32px] font-black text-[#F59E0B] leading-none m-0">{inProgress}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#F59E0B]">more_horiz</span>
                  </div>
                </div>
                <p className="text-[11px] font-medium text-[#6B7280] m-0">Active now</p>
              </div>

              {/* Overdue */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB] relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/10 cursor-default">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#EF4444]"></div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Overdue</p>
                    <h3 className="text-[32px] font-black text-[#EF4444] leading-none m-0">{overdue}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#EF4444]">warning</span>
                  </div>
                </div>
                <p className={`text-[11px] font-bold m-0 ${overdue > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                  {overdue > 0 ? 'Requires attention!' : 'All on track'}
                </p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Status Breakdown */}
              <div>
                <h3 className="text-[16px] font-bold text-[#1E1B2E] mb-6 flex items-center gap-2">
                  Status Breakdown
                </h3>
                <div className="flex items-center gap-8 bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/5 hover:-translate-y-1">
                  
                  {/* SVG Donut Chart */}
                  <div className="relative w-40 h-40 shrink-0">
                    <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
                      <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#E5E7EB" strokeWidth="6"></circle>
                      {/* Done */}
                      {completedPct > 0 && (
                        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#10B981" strokeWidth="6" 
                          strokeDasharray={`${completedPct} 100`} 
                          strokeDashoffset="0"></circle>
                      )}
                      {/* In Progress */}
                      {inProgressPct > 0 && (
                        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#F59E0B" strokeWidth="6" 
                          strokeDasharray={`${inProgressPct} 100`} 
                          strokeDashoffset={-completedPct}></circle>
                      )}
                      {/* Pending */}
                      {pendingPct > 0 && (
                        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#3B82F6" strokeWidth="6" 
                          strokeDasharray={`${pendingPct} 100`} 
                          strokeDashoffset={-(completedPct + inProgressPct)}></circle>
                      )}
                      {/* Blocked */}
                      {blockedPct > 0 && (
                        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#EF4444" strokeWidth="6" 
                          strokeDasharray={`${blockedPct} 100`} 
                          strokeDashoffset={-(completedPct + inProgressPct + pendingPct)}></circle>
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[20px] font-black text-[#1E1B2E]">{totalTasks}</span>
                      <span className="text-[11px] text-[#6B7280] font-medium">Total</span>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                      <span className="text-[13px] font-bold text-[#4B5563]">Done ({completedPct}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                      <span className="text-[13px] font-bold text-[#4B5563]">In Progress ({inProgressPct}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
                      <span className="text-[13px] font-bold text-[#4B5563]">Pending ({pendingPct}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
                      <span className="text-[13px] font-bold text-[#4B5563]">Blocked ({blockedPct}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Insights */}
              <div>
                <h3 className="text-[16px] font-bold text-[#1E1B2E] mb-6 flex items-center gap-2">
                  Key Insights
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="bg-white border-l-4 border-[#ec008c] p-4 rounded-r-xl shadow-sm border-y border-r border-[#E5E7EB] transition-all duration-300 hover:translate-x-1 hover:shadow-md cursor-default">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[#702c91] text-[14px]">info</span>
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-[#1E1B2E] m-0 mb-1">Completion Rate</h4>
                        <p className="text-[12px] text-[#6B7280] m-0">{filterType === 'Overall' ? 'Overall' : selectedValue} has a completion rate of {completedPct}%. {completedPct > 50 ? 'Great progress!' : 'There is room for improvement.'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border-l-4 border-[#F59E0B] p-4 rounded-r-xl shadow-sm border-y border-r border-[#E5E7EB] transition-all duration-300 hover:translate-x-1 hover:shadow-md cursor-default">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-yellow-50 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[#F59E0B] text-[14px]">arrow_forward</span>
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-[#1E1B2E] m-0 mb-1">Active Workload</h4>
                        <p className="text-[12px] text-[#6B7280] m-0">There are {inProgress} tasks currently actively being worked on.</p>
                      </div>
                    </div>
                  </div>
                  
                  {overdue > 0 && (
                    <div className="bg-white border-l-4 border-[#EF4444] p-4 rounded-r-xl shadow-sm border-y border-r border-[#E5E7EB] transition-all duration-300 hover:translate-x-1 hover:shadow-md cursor-default">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[#EF4444] text-[14px]">warning</span>
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-[#1E1B2E] m-0 mb-1">Overdue Alerts</h4>
                          <p className="text-[12px] text-[#6B7280] m-0">{overdue} tasks are overdue. Immediate follow up is recommended.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Project Progress Lists */}
            <div className="mb-10">
              <h3 className="text-[16px] font-bold text-[#1E1B2E] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#702c91] text-[20px]">view_list</span>
                Project Progress Lists
              </h3>
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[25%]">Name</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[25%]">Progress</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Start</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">End</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Priority</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Owner</th>
                      </tr>
                    </thead>
                    <tbody>
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
                          <tr 
                            key={idx} 
                            className={`border-b border-[#E5E7EB] transition-all duration-200 relative ${idx === projectsList.length - 1 ? 'border-b-0' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={e => { 
                              e.currentTarget.style.background = 'white'; 
                              e.currentTarget.style.transform = 'scale(1.01)'; 
                              e.currentTarget.style.boxShadow = '0 8px 24px rgba(91,33,182,0.08)';
                              e.currentTarget.style.zIndex = 10;
                            }}
                            onMouseLeave={e => { 
                              e.currentTarget.style.background = 'transparent'; 
                              e.currentTarget.style.transform = 'scale(1)'; 
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.zIndex = 1;
                            }}
                          >
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3" onClick={() => navigate(`/projects/${encodeURIComponent(proj.name)}`)}>
                                <span className="material-symbols-outlined text-[#9CA3AF] text-[18px]">folder_open</span>
                                <span className="text-[13px] font-bold text-[#1E1B2E]">{proj.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-[#702c91] h-full rounded-full transition-all" style={{ width: `${progressPct}%` }}></div>
                                </div>
                                <span className="text-[11px] font-bold text-[#4B5563] w-8">{progressPct}%</span>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-[12px] text-[#6B7280]">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                {proj.start}
                              </div>
                            </td>
                            <td className="py-4 px-5 text-[12px] text-[#6B7280]">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                {proj.end}
                              </div>
                            </td>
                            <td className="py-4 px-5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center w-max gap-1 ${
                                proj.priority === 'Urgent' ? 'text-red-500 bg-red-50 border-red-200' :
                                proj.priority === 'High' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                                'text-blue-500 bg-blue-50 border-blue-200'
                              }`}>
                                <span className="material-symbols-outlined text-[12px]">
                                  {proj.priority === 'Urgent' ? 'flag' : 'play_arrow'}
                                </span>
                                {proj.priority}
                              </span>
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-purple-100 text-purple-700">
                                  {proj.owner.substring(0,2).toUpperCase()}
                                </div>
                                <span className="text-[12px] text-[#4B5563] truncate max-w-[100px]">{proj.owner}</span>
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
          </div>

          {/* Company & User Breakdown */}
            <div className="mb-10">
              <h3 className="text-[16px] font-bold text-[#1E1B2E] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#702c91] text-[20px]">group_work</span>
                Company & User Breakdown
              </h3>
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Company</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">User</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-right">Total</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-right">Done</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-right">In Progress</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-right">Pending</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-right">Blocked</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-right">Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const breakdown = {}
                        filteredTasks.forEach(t => {
                          const company = t.client || 'General'
                          const assignedUsers = (t.assignedTo || 'Unassigned').split(',').map(s => s.trim()).filter(Boolean)
                          if (assignedUsers.length === 0) assignedUsers.push('Unassigned')
                          assignedUsers.forEach(u => {
                            if (!breakdown[company]) breakdown[company] = {}
                            if (!breakdown[company][u]) {
                              breakdown[company][u] = { total: 0, done: 0, inProgress: 0, pending: 0, blocked: 0, overdue: 0 }
                            }
                            breakdown[company][u].total++
                            if (t.status === 'Done') breakdown[company][u].done++
                            else if (t.status === 'In Progress' || t.status === 'Review') breakdown[company][u].inProgress++
                            else if (t.status === 'Pending') breakdown[company][u].pending++
                            else if (t.status === 'Blocked') breakdown[company][u].blocked++
                            if (t.overdue && t.status !== 'Done') breakdown[company][u].overdue++
                          })
                        })
                        const companyNames = Object.keys(breakdown).sort()
                        if (companyNames.length === 0) {
                          return (
                            <tr>
                              <td colSpan="8" className="text-center py-8 text-secondary text-sm">No data for this selection.</td>
                            </tr>
                          )
                        }
                        const rows = []
                        companyNames.forEach((company, ci) => {
                          const userNames = Object.keys(breakdown[company]).sort()
                          userNames.forEach((u, ui) => {
                            const d = breakdown[company][u]
                            rows.push(
                              <tr key={`${company}-${u}`} className={`border-b border-[#E5E7EB] ${ci === companyNames.length - 1 && ui === userNames.length - 1 ? 'border-b-0' : ''} transition-all hover:bg-purple-50/40`}>
                                {ui === 0 && (
                                  <td className="py-4 px-5 text-[13px] font-bold text-[#702c91]" rowSpan={userNames.length}>
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[18px]">business</span>
                                      {company}
                                    </div>
                                  </td>
                                )}
                                <td className="py-4 px-5 text-[13px] text-[#4B5563] font-semibold">{u}</td>
                                <td className="py-4 px-5 text-[13px] text-[#1E1B2E] font-bold text-right">{d.total}</td>
                                <td className="py-4 px-5 text-[13px] text-[#10B981] font-semibold text-right">{d.done}</td>
                                <td className="py-4 px-5 text-[13px] text-[#F59E0B] font-semibold text-right">{d.inProgress}</td>
                                <td className="py-4 px-5 text-[13px] text-[#3B82F6] font-semibold text-right">{d.pending}</td>
                                <td className="py-4 px-5 text-[13px] text-[#EF4444] font-semibold text-right">{d.blocked}</td>
                                <td className="py-4 px-5 text-[13px] text-[#EF4444] font-semibold text-right">{d.overdue}</td>
                              </tr>
                            )
                          })
                        })
                        return rows
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          {/* All Tasks Activity */}
            <div className="mb-10">
              <h3 className="text-[16px] font-bold text-[#1E1B2E] mb-4">
                {filterType === 'Overall' ? 'All Tasks Activity' : `${selectedValue} Activity`}
              </h3>
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[10%]">Task ID</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[35%]">Task Title</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[20%]">Client</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[15%]">Assigned To</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[10%]">Status</th>
                        <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-right w-[10%]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-secondary text-[14px]">
                          No tasks found for this selection.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((row, idx) => (
                        <tr 
                          key={row.id} 
                          className={`border-b border-[#E5E7EB] transition-all duration-200 relative ${idx === filteredTasks.length - 1 ? 'border-b-0' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={e => { 
                            e.currentTarget.style.background = 'white'; 
                            e.currentTarget.style.transform = 'scale(1.01)'; 
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(91,33,182,0.08)';
                            e.currentTarget.style.zIndex = 10;
                          }}
                          onMouseLeave={e => { 
                            e.currentTarget.style.background = 'transparent'; 
                            e.currentTarget.style.transform = 'scale(1)'; 
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.zIndex = 1;
                          }}
                        >
                          <td className="py-4 px-5 text-[12px] font-bold text-[#4B5563]">
                            {row.id}
                          </td>
                          <td className="py-4 px-5 text-[13px] text-[#4B5563]">
                            <span className={row.status === 'Done' ? 'line-through text-[#9CA3AF]' : ''}>{row.title}</span>
                          </td>
                          <td className="py-4 px-5 text-[12px] text-[#6B7280]">
                            {row.client}
                          </td>
                          <td className="py-4 px-5 text-[12px] text-[#6B7280]">
                            {row.assignedTo || 'Unassigned'}
                          </td>
                          <td className="py-4 px-5">
                            {(() => {
                               let isDoneLate = false;
                               if (row.status === 'Done' && row.dueDate && row.statusUpdatedOn) {
                                  const due = new Date(row.dueDate);
                                  const updated = new Date(row.statusUpdatedOn);
                                  due.setHours(23, 59, 59, 999);
                                  if (updated > due) isDoneLate = true;
                               }
                               return (
                                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                   row.status === 'Done' 
                                     ? (isDoneLate ? 'text-amber-700 bg-amber-100' : 'text-green-600 bg-green-50') 
                                     : row.status === 'Blocked' ? 'text-red-600 bg-red-50' 
                                     : 'text-pink-600 bg-pink-50'
                                 }`}>
                                   {row.status === 'Done' && isDoneLate ? 'Done (Late)' : row.status}
                                 </span>
                               )
                            })()}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <button 
                              onClick={() => navigate(`/tasks/${row.id}`)}
                              className="text-[12px] font-bold text-[#702c91] hover:text-[#702c91] transition-colors bg-transparent border-none cursor-pointer inline-flex items-center gap-1"
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
          </div>

          {/* Working Hours */}
          {(() => {
            let activityMonth = null;
            let activityYear = null;
            if (dateFrom) {
              const d = new Date(dateFrom)
              activityMonth = d.getMonth() + 1
              activityYear = d.getFullYear()
            }
            const monthlyData = getAllUsersMonthlyActivity(activityMonth, activityYear);
            const users = Object.keys(monthlyData);
            if (users.length > 0) {
              return (
                <div className="mb-10">
                  <h3 className="text-[16px] font-bold text-[#1E1B2E] mb-4">
                    Working Hours {sanitizedDateRange !== 'All Dates' ? `- ${sanitizedDateRange}` : ''}
                  </h3>
                  <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto hide-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                            <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Name</th>
                            <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Total Days</th>
                            <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Total Hours</th>
                            <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Avg Hours / Day</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u, idx) => {
                            const d = monthlyData[u];
                            const avg = d.totalDays > 0 ? (d.totalMinutes / d.totalDays / 60).toFixed(1) : '0';
                            return (
                              <tr key={u} className={`border-b border-[#E5E7EB] ${idx === users.length - 1 ? 'border-b-0' : ''}`}>
                                <td className="py-4 px-5 text-[13px] font-semibold text-[#4B5563]">{u}</td>
                                <td className="py-4 px-5 text-[13px] text-[#6B7280]">{d.totalDays}</td>
                                <td className="py-4 px-5 text-[13px] text-[#6B7280]">{formatDuration(d.totalMinutes)}</td>
                                <td className="py-4 px-5 text-[13px] text-[#6B7280]">{avg}h</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Footer Action */}
            <div className="flex justify-end pb-8" data-html2canvas-ignore>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#ec008c] rounded-lg text-[14px] font-bold text-[#702c91] shadow-sm hover:bg-purple-50 transition-colors group disabled:opacity-70 disabled:cursor-wait"
              >
                {isDownloading ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-y-1">download</span>
                )}
                {isDownloading ? 'Generating PDF...' : 'Download PDF Report'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

