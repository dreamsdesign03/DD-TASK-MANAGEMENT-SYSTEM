import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import SelectDropdown from '../components/SelectDropdown'
import { useApp } from '../context/AppContext'
import { deduplicateTasks } from '../utils/formatTaskId'
import {
  isSubTask, isTaskOverdue, passesMonthDoneRule,
  computeTaskStats, formatStatCount, taskDateToISO
} from '../utils/taskStats'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// ─── helpers ─────────────────────────────────────────────────────────────────
function parseSheetDT(val) {
  if (!val) return null
  const str = String(val).trim()
  const parts = str.split(/[ T]/)
  const datePart = parts[0] || ''
  const timePart = (parts[1] || '00:00:00').split('.')[0]
  return { date: datePart, time: timePart }
}

function timeToSecs(t) {
  if (!t) return 0
  const [h, m, s] = t.split(':').map(Number)
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0)
}

function fmtDur(secs) {
  if (!secs || secs <= 0) return '0h 0m'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getISTNow() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000)
}
function getISTDateStr(d = getISTNow()) {
  return d.toISOString().split('T')[0]
}
function getISTTimeStr(d = getISTNow()) {
  return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
    .map(v => String(v).padStart(2, '0')).join(':')
}

const STATUS_COLORS = {
  Done:        { bg: '#DCFCE7', text: '#16A34A', bar: '#22C55E' },
  'In Progress':{ bg: '#FEF9C3', text: '#B45309', bar: '#F59E0B' },
  Review:       { bg: '#FEF9C3', text: '#B45309', bar: '#F59E0B' },
  Pending:      { bg: '#EFF6FF', text: '#1D4ED8', bar: '#3B82F6' },
  Blocked:      { bg: '#FEE2E2', text: '#DC2626', bar: '#EF4444' },
}
function statusStyle(s) {
  return STATUS_COLORS[s] || { bg: '#F3F4F6', text: '#6B7280', bar: '#9CA3AF' }
}

// ─── component ───────────────────────────────────────────────────────────────
export default function MonthlyReportPage() {
  const navigate = useNavigate()
  const {
    tasks, addToast, profile, activityLog,
    fetchActivities, employees
  } = useApp()

  const isAdmin = profile?.systemRole === 'Admin' || profile?.role === 'Admin'

  // Non-admins only ever see their own report (no Overall / Company / User scope)
  const myName  = (profile?.name  || '').trim().toLowerCase()
  const myEmail = (profile?.email || '').trim().toLowerCase()
  const matchesMe = t => {
    const names  = String(t.assignedTo   || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean)
    const emails = String(t.assignedEmail || '').toLowerCase().split(/[,;]/).map(s => s.trim()).filter(Boolean)
    if (myName && names.some(n => n === myName || n.includes(myName) || myName.includes(n))) return true
    if (myEmail && emails.includes(myEmail)) return true
    return false
  }

  // ── filter state ──────────────────────────────────────────────────────────
  const [filterType,    setFilterType]    = useState('Overall') // Overall | Company | User
  const [selectedValue, setSelectedValue] = useState('')
  const [statusFilter,  setStatusFilter]  = useState('All')     // NEW: status filter
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')
  // Same "Current Month / All Tasks" mode as the Tasks page (default: Current Month)
  const [showAllTasks,  setShowAllTasks]  = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // ── activity month selector ───────────────────────────────────────────────
  const now = new Date()
  const [actMonth, setActMonth] = useState(now.getMonth() + 1)
  const [actYear,  setActYear]  = useState(now.getFullYear())
  const [activities, setActivities] = useState(activityLog || [])
  const [actLoading, setActLoading] = useState(false)
  const [nowTs, setNowTs] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (activityLog && activityLog.length > 0) {
      setActivities(activityLog)
    } else {
      ;(async () => {
        setActLoading(true)
        try {
          const data = await fetchActivities()
          if (Array.isArray(data)) setActivities(data)
        } catch {}
        setActLoading(false)
      })()
    }
  }, [activityLog, fetchActivities])

  // ── clients / users derived from tasks ───────────────────────────────────
  const clients = useMemo(() =>
    [...new Set((tasks || [])
      .map(t => t?.client)
      .filter(c => c && String(c).toLowerCase() !== 'internal')
    )].sort()
  , [tasks])

  const users = useMemo(() =>
    [...new Set((tasks || [])
      .flatMap(t => String(t?.assignedTo || '').split(',').map(s => s.trim()))
      .filter(Boolean)
    )].sort()
  , [tasks])

  // ── filter handlers ───────────────────────────────────────────────────────
  const handleFilterChange = type => {
    setFilterType(type)
    if (type === 'Overall') setSelectedValue('')
    else if (type === 'Company') setSelectedValue(clients[0] || '')
    else if (type === 'User') setSelectedValue(users[0] || '')
  }

  const isInDateRange = task => {
    if (!dateFrom && !dateTo) return true
    const iso = taskDateToISO(task.statusUpdatedOn || task.dueDate || task.assigned)
    if (!iso) return false
    if (dateFrom && iso < dateFrom) return false
    if (dateTo && iso > dateTo) return false
    return true
  }

  // ── filtered tasks — identical rules to the Tasks page (utils/taskStats) ───
  // Admins scope via Overall/Company/User; everyone else is locked to self.
  const filteredTasks = useMemo(() => {
    return deduplicateTasks(tasks || []).filter(t => {
      if (isSubTask(t)) return false
      if (!passesMonthDoneRule(t, showAllTasks)) return false
      if (!isInDateRange(t)) return false
      if (!isAdmin) return matchesMe(t)
      if (filterType === 'Company' && selectedValue && t.client !== selectedValue) return false
      if (filterType === 'User' && selectedValue && !String(t.assignedTo || '').includes(selectedValue)) return false
      return true
    })
  }, [tasks, filterType, selectedValue, dateFrom, dateTo, showAllTasks, isAdmin, myName, myEmail])

  // ── status-filtered tasks (for the table only) ───────────────────────────
  const tableTasks = useMemo(() => {
    if (statusFilter === 'All') return filteredTasks
    if (statusFilter === 'Overdue') return filteredTasks.filter(isTaskOverdue)
    return filteredTasks.filter(t => t.status === statusFilter)
  }, [filteredTasks, statusFilter])

  // ── metrics (shared with the Tasks page) ─────────────────────────────────
  const stats = useMemo(() => computeTaskStats(filteredTasks), [filteredTasks])
  const totalTasks   = stats.total
  const completed    = stats.completed
  const inProgress   = stats.inProgress
  const review       = stats.review
  const blocked      = stats.blocked
  const overdueCount = stats.overdue
  const pending      = stats.pending
  const other        = stats.other

  const pct = n => totalTasks ? Math.round((n / totalTasks) * 100) : 0
  const completedPct   = pct(completed)
  const inProgressPct  = pct(inProgress)
  const reviewPct      = pct(review)
  const pendingPct     = pct(pending)
  const blockedPct     = pct(blocked)
  const otherPct       = pct(other)

  // ── activity data per user per month ────────────────────────────────────
  const monthStr = `${actYear}-${String(actMonth).padStart(2, '0')}`
  const todayIST = getISTDateStr()
  const nowTimeIST = getISTTimeStr(new Date(nowTs + 5.5 * 60 * 60 * 1000))

  // Build per-user activity summary for the selected month
  const userActivitySummary = useMemo(() => {
    const summary = {}
    ;(activities || []).forEach(row => {
      const loginDt = parseSheetDT(row['Login Date and Time'])
      if (!loginDt || !loginDt.date.startsWith(monthStr)) return

      const email = String(row['Employee ID'] || row.email || '').trim()
      const name  = String(row['Full Name'] || row.Name || row.name || email || 'Unknown').trim()
      const key   = email || name

      if (!key) return
      if (!summary[key]) {
        summary[key] = {
          name,
          email,
          totalSecs: 0,
          sessions: 0,
          activeDays: new Set(),
        }
      }

      const logoutDt = parseSheetDT(row['Logout Date and Time'])
      const loginTime  = loginDt.time
      let   logoutTime = logoutDt?.time

      // If still active today, use current IST time as logout
      if (!logoutTime && loginDt.date === todayIST) {
        logoutTime = nowTimeIST
      } else if (!logoutTime) {
        logoutTime = loginTime
      }

      const dur = Math.max(0, timeToSecs(logoutTime) - timeToSecs(loginTime))
      summary[key].totalSecs += dur
      summary[key].sessions  += 1
      summary[key].activeDays.add(loginDt.date)
    })

    // Filter to admin view or self view
    return Object.values(summary)
      .filter(u => {
        if (isAdmin) return true
        const myName  = (profile?.name || '').trim().toLowerCase()
        const myEmail = (profile?.email || '').trim().toLowerCase()
        return u.name.toLowerCase() === myName || u.email.toLowerCase() === myEmail
      })
      .map(u => ({ ...u, activeDays: u.activeDays.size }))
      .sort((a, b) => b.totalSecs - a.totalSecs)
  }, [activities, monthStr, isAdmin, profile, todayIST, nowTimeIST])

  // ── company + user breakdown table data ──────────────────────────────────
  const companyBreakdown = useMemo(() => {
    const breakdown = {}
    filteredTasks.forEach(t => {
      const company = t.client || 'General'
      if (filterType === 'Company' && company !== selectedValue) return

      let assignedUsers = (t.assignedTo || 'Unassigned')
        .split(',').map(s => s.trim()).filter(Boolean)
      if (assignedUsers.length === 0) assignedUsers = ['Unassigned']
      if (filterType === 'User') {
        assignedUsers = assignedUsers.filter(u => u === selectedValue)
      }
      if (!isAdmin) {
        // Own report only — count my tasks under my name
        assignedUsers = assignedUsers.filter(u => {
          const lu = u.toLowerCase()
          return lu === myName || (myEmail && lu === myEmail) || (myName && (lu.includes(myName) || myName.includes(lu)))
        })
        if (assignedUsers.length === 0) assignedUsers = [profile?.name || profile?.email || 'Me']
      }

      assignedUsers.forEach(u => {
        if (!breakdown[company]) breakdown[company] = {}
        if (!breakdown[company][u]) {
          breakdown[company][u] = { total:0, done:0, inProgress:0, review:0, pending:0, blocked:0, overdue:0 }
        }
        const d = breakdown[company][u]
        d.total++
        if (t.status === 'Done') d.done++
        else if (t.status === 'In Progress') d.inProgress++
        else if (t.status === 'Review') d.review++
        else if (t.status === 'Pending') d.pending++
        else if (t.status === 'Blocked') d.blocked++
        if (isTaskOverdue(t)) d.overdue++
      })
    })
    return breakdown
  }, [filteredTasks, filterType, selectedValue, isAdmin, myName, myEmail, profile])

  // ── date range label ──────────────────────────────────────────────────────
  const dateRangeLabel = useMemo(() => {
    if (dateFrom && dateTo) return `${dateFrom} → ${dateTo}`
    if (dateFrom) return `From ${dateFrom}`
    if (dateTo)   return `Until ${dateTo}`
    return 'All Dates'
  }, [dateFrom, dateTo])

  // ── month navigation for activity ─────────────────────────────────────────
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const prevActMonth = () => {
    if (actMonth === 1) { setActMonth(12); setActYear(y => y - 1) }
    else setActMonth(m => m - 1)
  }
  const nextActMonth = () => {
    const nowDate = new Date()
    if (actYear > nowDate.getFullYear() || (actYear === nowDate.getFullYear() && actMonth >= nowDate.getMonth() + 1)) return
    if (actMonth === 12) { setActMonth(1); setActYear(y => y + 1) }
    else setActMonth(m => m + 1)
  }

  // ── PDF export ────────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    setIsDownloading(true)
    const element = document.getElementById('report-content')
    if (!element) return
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        onclone: clonedDoc => {
          const el = clonedDoc.getElementById('report-content')
          if (!el) return
          el.style.backgroundColor = '#fbf9f8'
          el.style.padding = '32px'
          el.style.fontFamily = 'Arial, Helvetica, sans-serif'
          // Replace select/date inputs with readable text
          el.querySelectorAll('select').forEach(sel => {
            const span = clonedDoc.createElement('span')
            span.innerText = sel.options[sel.selectedIndex]?.text || ''
            span.style.cssText = 'display:inline-flex;padding:8px 14px;border-radius:10px;border:1px solid #E5E7EB;background:white;font-size:13px;font-weight:600;'
            sel.parentNode.replaceChild(span, sel)
          })
          el.querySelectorAll('input[type="date"]').forEach(inp => {
            const span = clonedDoc.createElement('span')
            span.innerText = inp.value || '—'
            span.style.cssText = 'display:inline-flex;padding:8px 12px;border-radius:10px;border:1px solid #E5E7EB;background:white;font-size:13px;font-weight:600;'
            inp.parentNode.replaceChild(span, inp)
          })
          el.querySelectorAll('td, th').forEach(c => {
            c.style.lineHeight = '1.5'
            c.style.fontFamily = 'Arial, Helvetica, sans-serif'
          })
        }
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      const margin = 6
      const uw = pw - margin * 2
      const uh = ph - margin * 2
      const ratio = canvas.height / canvas.width
      if (ratio <= uh / uw) {
        pdf.addImage(imgData, 'PNG', margin, margin + (uh - uw * ratio) / 2, uw, uw * ratio)
      } else {
        const sliceH = Math.round((uh * canvas.width) / uw)
        let remaining = canvas.height, srcY = 0
        while (remaining > 0) {
          if (srcY > 0) pdf.addPage()
          const pageH = Math.min(remaining, sliceH)
          const pc = document.createElement('canvas')
          pc.width = canvas.width; pc.height = pageH
          pc.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, pageH, 0, 0, canvas.width, pageH)
          const pH2 = (pageH / canvas.width) * uw
          pdf.addImage(pc.toDataURL('image/png'), 'PNG', margin, margin, uw, pH2)
          srcY += pageH; remaining -= pageH
        }
      }
      const rangeSlug = dateRangeLabel.replace(/\s+/g, '_').replace(/[→]/g, '-')
      const valSlug   = !isAdmin ? 'My_Report' : filterType === 'Overall' ? 'Overall' : selectedValue.replace(/\s+/g, '_')
      pdf.save(`Dreamsdesk_Report_${rangeSlug}_${valSlug}.pdf`)
    } catch (err) {
      console.error(err)
      addToast('Failed to generate PDF. Please try again.', 'error')
    } finally {
      setIsDownloading(false)
    }
  }

  // ── status pill helper ────────────────────────────────────────────────────
  const StatusBadge = ({ status, dueDate, statusUpdatedOn }) => {
    let isDoneLate = false
    if (status === 'Done' && dueDate && statusUpdatedOn) {
      const due = new Date(dueDate)
      due.setHours(23, 59, 59, 999)
      if (new Date(statusUpdatedOn) > due) isDoneLate = true
    }
    const label = isDoneLate ? 'Done (Late)' : status
    const s = isDoneLate
      ? { bg: '#FEF3C7', text: '#B45309' }
      : statusStyle(status)
    return (
      <span
        style={{
          background: s.bg, color: s.text,
          padding: '2px 9px', borderRadius: 99,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          whiteSpace: 'nowrap'
        }}
      >{label}</span>
    )
  }

  // ── all statuses for the filter pill row ─────────────────────────────────
  const statusOptions = ['All', 'Done', 'In Progress', 'Review', 'Pending', 'Blocked', 'Overdue']

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#F0EDF8] font-['Inter',sans-serif] text-[#151c27] overflow-hidden h-screen flex">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 9px; height: 9px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(112,44,145,0.06); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #702c91; border-radius: 10px; border: 2px solid #F0EDF8; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5b2176; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #702c91 rgba(112,44,145,0.06); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .stat-card { transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(112,44,145,0.10); }
        .act-row:hover { background: #faf5ff; }
        .task-row:hover { background: #faf5ff; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
        .fade-up { animation: fadeUp 0.35s ease both; }
        .status-pill { cursor:pointer; transition: all 0.15s; }
        .status-pill:hover { filter: brightness(0.94); }
      `}</style>

      <Sidebar />

      <main className="page-main">
        <TopNav title="Reports" showSearch={false} />

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-5 pb-8 fade-up">
          <div id="report-content" className="w-full max-w-[1300px] mx-auto">

            {/* ── Header ── */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div>
                <h2 style={{ fontSize: 26, fontWeight: 900, color: '#702c91', margin: 0, lineHeight: 1.2 }}>
                  Report Analysis
                </h2>
                <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0', fontWeight: 500 }}>
                  {showAllTasks ? 'All Tasks' : 'Current Month'}{dateFrom || dateTo ? ` · ${dateRangeLabel}` : ''} · {isAdmin ? (filterType === 'Overall' ? 'All Users' : selectedValue) : 'My Report'}
                </p>
              </div>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                data-html2canvas-ignore
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#ec008c] rounded-lg text-[13px] font-bold text-[#702c91] shadow-sm hover:bg-purple-50 transition-colors disabled:opacity-70 disabled:cursor-wait"
              >
                {isDownloading
                  ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Generating…</>
                  : <><span className="material-symbols-outlined text-[18px]">download</span>Download PDF</>
                }
              </button>
            </div>

            {/* ── Filters Row ── */}
            <div className="flex flex-wrap items-center gap-3 mb-7"
              style={{ background: 'white', borderRadius: 16, padding: '14px 18px', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(112,44,145,0.04)' }}>

              {/* Filter type tabs — admin only; non-admins get a locked "My Report" */}
              {isAdmin ? (
                <div className="flex bg-[#F3F4F6] p-1 rounded-lg w-max" style={{ flexShrink: 0 }}>
                  {['Overall', 'Company', 'User'].map(type => (
                    <button
                      key={type}
                      onClick={() => handleFilterChange(type)}
                      className={`px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition-all border-none ${
                        filterType === type
                          ? 'bg-gradient-to-r from-[#702c91] to-[#ec008c] text-white shadow-sm'
                          : 'bg-transparent text-[#6B7280] hover:text-[#1E1B2E]'
                      }`}
                    >{type}</button>
                  ))}
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{ flexShrink: 0, background: 'linear-gradient(to right, #702c91, #ec008c)', color: 'white', fontSize: 13, fontWeight: 700, boxShadow: '0 2px 8px rgba(112,44,145,0.25)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
                  My Report
                </div>
              )}

              {isAdmin && filterType === 'Company' && (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Company:</span>
                  <SelectDropdown value={selectedValue} onChange={setSelectedValue} options={clients} style={{ width: 200, flexShrink: 0 }} />
                </div>
              )}
              {isAdmin && filterType === 'User' && (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>User:</span>
                  <SelectDropdown value={selectedValue} onChange={setSelectedValue} options={users} style={{ width: 200, flexShrink: 0 }} />
                </div>
              )}

              <div style={{ flex: '1 1 0' }} />

              {/* Current Month / All Tasks — same mode as the Tasks page */}
              <div className="flex bg-[#F3F4F6] p-1 rounded-lg" style={{ flexShrink: 0 }}>
                <button
                  onClick={() => setShowAllTasks(false)}
                  style={{
                    padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                    background: !showAllTasks ? 'linear-gradient(to right, #702c91, #ec008c)' : 'transparent',
                    color: !showAllTasks ? 'white' : '#6B7280'
                  }}
                >Current Month</button>
                <button
                  onClick={() => setShowAllTasks(true)}
                  style={{
                    padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                    background: showAllTasks ? 'linear-gradient(to right, #702c91, #ec008c)' : 'transparent',
                    color: showAllTasks ? 'white' : '#6B7280'
                  }}
                >All Tasks</button>
              </div>

              {/* Date range */}
              <div className="flex items-center gap-2">
                <div style={{ position: 'relative', paddingTop: 8 }}>
                  <input
                    type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    style={{ width: 148, background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 10px', fontSize: 13, fontWeight: 600, color: '#1E1B2E', outline: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                    onFocus={e => e.target.style.borderColor = '#702c91'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                  <span style={{ position:'absolute', left:10, top:0, fontSize:9, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', background:'white', padding:'0 4px', pointerEvents:'none', lineHeight:1 }}>From</span>
                </div>
                <div style={{ position: 'relative', paddingTop: 8 }}>
                  <input
                    type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    style={{ width: 148, background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 10px', fontSize: 13, fontWeight: 600, color: '#1E1B2E', outline: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                    onFocus={e => e.target.style.borderColor = '#702c91'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                  <span style={{ position:'absolute', left:10, top:0, fontSize:9, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', background:'white', padding:'0 4px', pointerEvents:'none', lineHeight:1 }}>To</span>
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo('') }}
                    style={{ background:'#FEE2E2', color:'#DC2626', border:'none', borderRadius:8, padding:'6px 10px', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize:14 }}>close</span>Clear
                  </button>
                )}
              </div>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-7">
              {[
                { label: 'Total',       value: totalTasks,   color: '#702c91', icon: 'assignment',    bg: '#F5F3FF' },
                { label: 'Done',        value: completed,    color: '#16A34A', icon: 'check_circle',  bg: '#DCFCE7', pct: completedPct },
                { label: 'In Progress', value: inProgress,   color: '#B45309', icon: 'more_horiz',    bg: '#FEF9C3', pct: inProgressPct },
                { label: 'Review',      value: review,       color: '#7C3AED', icon: 'rate_review',   bg: '#F5F3FF', pct: reviewPct },
                { label: 'Pending',     value: pending,      color: '#1D4ED8', icon: 'schedule',      bg: '#EFF6FF', pct: pendingPct },
                { label: 'Blocked',     value: blocked,      color: '#DC2626', icon: 'block',         bg: '#FEE2E2', pct: blockedPct },
                { label: 'Overdue',     value: overdueCount, color: '#EA580C', icon: 'warning',       bg: '#FFEDD5', pct: overdueCount > 0 ? Math.round(overdueCount / Math.max(totalTasks,1) * 100) : 0 },
              ].map(({ label, value, color, icon, bg, pct: p }) => (
                <div key={label} className="stat-card bg-white rounded-xl p-4 shadow-sm border border-[#E5E7EB] flex flex-col gap-2 cursor-default"
                  onClick={() => { if (label !== 'Total') setStatusFilter(statusFilter === label ? 'All' : label) }}
                  style={{ outline: statusFilter === label ? `2px solid ${color}` : 'none', cursor: label !== 'Total' ? 'pointer' : 'default' }}
                >
                  <div className="flex items-center justify-between">
                    <p style={{ margin:0, fontSize:10, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:16, color }}>{icon}</span>
                    </div>
                  </div>
                  <p style={{ margin:0, fontSize:28, fontWeight:900, color, lineHeight:1 }}>{formatStatCount(value)}</p>
                  {p !== undefined && (
                    <div style={{ width:'100%', height:3, background:'#F3F4F6', borderRadius:99 }}>
                      <div style={{ width:`${p}%`, height:'100%', background:color, borderRadius:99, transition:'width 0.4s' }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7">

              {/* Donut chart */}
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
                <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:800, color:'#1E1B2E' }}>Status Breakdown</h3>
                <div className="flex items-center gap-8">
                  <div style={{ position:'relative', width:140, height:140, flexShrink:0 }}>
                    <svg viewBox="0 0 42 42" style={{ width:'100%', height:'100%', transform:'rotate(-90deg)' }}>
                      <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#E5E7EB" strokeWidth="6" />
                      {completedPct  > 0 && <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#22C55E" strokeWidth="6" strokeDasharray={`${completedPct} 100`} strokeDashoffset="0" />}
                      {inProgressPct > 0 && <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#F59E0B" strokeWidth="6" strokeDasharray={`${inProgressPct} 100`} strokeDashoffset={-completedPct} />}
                      {reviewPct     > 0 && <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#8B5CF6" strokeWidth="6" strokeDasharray={`${reviewPct} 100`} strokeDashoffset={-(completedPct + inProgressPct)} />}
                      {pendingPct    > 0 && <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#3B82F6" strokeWidth="6" strokeDasharray={`${pendingPct} 100`} strokeDashoffset={-(completedPct + inProgressPct + reviewPct)} />}
                      {blockedPct    > 0 && <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#EF4444" strokeWidth="6" strokeDasharray={`${blockedPct} 100`} strokeDashoffset={-(completedPct + inProgressPct + reviewPct + pendingPct)} />}
                      {otherPct      > 0 && <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#9CA3AF" strokeWidth="6" strokeDasharray={`${otherPct} 100`} strokeDashoffset={-(completedPct + inProgressPct + reviewPct + pendingPct + blockedPct)} />}
                    </svg>
                    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontSize:20, fontWeight:900, color:'#1E1B2E', lineHeight:1 }}>{formatStatCount(totalTasks)}</span>
                      <span style={{ fontSize:10, color:'#6B7280', fontWeight:600 }}>Total</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { label:'Done',        pct:completedPct,  color:'#22C55E' },
                      { label:'In Progress', pct:inProgressPct, color:'#F59E0B' },
                      { label:'Review',      pct:reviewPct,     color:'#8B5CF6' },
                      { label:'Pending',     pct:pendingPct,    color:'#3B82F6' },
                      { label:'Blocked',     pct:blockedPct,    color:'#EF4444' },
                      ...(otherPct > 0 ? [{ label:'Other', pct:otherPct, color:'#9CA3AF' }] : []),
                    ].map(({ label, pct: p, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }} />
                        <span style={{ fontSize:12, fontWeight:700, color:'#4B5563' }}>{label}</span>
                        <span style={{ fontSize:12, color:'#9CA3AF', fontWeight:600, marginLeft:'auto', minWidth:36, textAlign:'right' }}>{p}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Key insights */}
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5">
                <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:800, color:'#1E1B2E' }}>Key Insights</h3>
                <div className="flex flex-col gap-3">
                  <div style={{ borderLeft:`4px solid #ec008c`, paddingLeft:12, paddingTop:6, paddingBottom:6 }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#1E1B2E' }}>Completion Rate</p>
                    <p style={{ margin:'2px 0 0', fontSize:12, color:'#6B7280' }}>
                      {!isAdmin ? 'Your report' : filterType === 'Overall' ? 'Overall' : selectedValue} — <strong style={{ color:'#702c91' }}>{completedPct}%</strong> done.{' '}
                      {completedPct >= 70 ? '🎉 Great progress!' : completedPct >= 40 ? '📈 Making progress.' : '⚠️ Needs attention.'}
                    </p>
                  </div>
                  <div style={{ borderLeft:`4px solid #F59E0B`, paddingLeft:12, paddingTop:6, paddingBottom:6 }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#1E1B2E' }}>Active Workload</p>
                    <p style={{ margin:'2px 0 0', fontSize:12, color:'#6B7280' }}>
                      <strong style={{ color:'#B45309' }}>{inProgress}</strong> task{inProgress !== 1 ? 's' : ''} currently in progress.{' '}
                      <strong style={{ color:'#1D4ED8' }}>{pending}</strong> pending.
                    </p>
                  </div>
                  {overdueCount > 0 && (
                    <div style={{ borderLeft:`4px solid #EF4444`, paddingLeft:12, paddingTop:6, paddingBottom:6 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#1E1B2E' }}>Overdue Alert</p>
                      <p style={{ margin:'2px 0 0', fontSize:12, color:'#6B7280' }}>
                        <strong style={{ color:'#DC2626' }}>{overdueCount}</strong> task{overdueCount !== 1 ? 's are' : ' is'} overdue. Immediate follow-up recommended.
                      </p>
                    </div>
                  )}
                  {overdueCount === 0 && (
                    <div style={{ borderLeft:`4px solid #22C55E`, paddingLeft:12, paddingTop:6, paddingBottom:6 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#1E1B2E' }}>All On Track</p>
                      <p style={{ margin:'2px 0 0', fontSize:12, color:'#6B7280' }}>No overdue tasks. 🟢 Everything on schedule.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── User Activity Summary ── */}
            <div className="mb-7">
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'#1E1B2E', display:'flex', alignItems:'center', gap:8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:18, color:'#702c91' }}>monitoring</span>
                  User Activity
                </h3>
                {/* Month navigator */}
                <div className="flex items-center gap-2">
                  <button onClick={prevActMonth} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:16 }}>chevron_left</span>
                  </button>
                  <span style={{ fontSize:13, fontWeight:700, color:'#1E1B2E', minWidth:90, textAlign:'center' }}>
                    {monthNames[actMonth - 1]} {actYear}
                  </span>
                  <button onClick={nextActMonth} style={{ background:'white', border:'1px solid #E5E7EB', borderRadius:8, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:16 }}>chevron_right</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                {actLoading ? (
                  <div style={{ padding:32, textAlign:'center', color:'#9CA3AF', fontSize:13 }}>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize:24, display:'block', margin:'0 auto 8px' }}>progress_activity</span>
                    Loading activity data…
                  </div>
                ) : userActivitySummary.length === 0 ? (
                  <div style={{ padding:32, textAlign:'center', color:'#9CA3AF', fontSize:13 }}>
                    No activity data found for {monthNames[actMonth - 1]} {actYear}.
                  </div>
                ) : (
                  <div className="overflow-x-auto hide-scrollbar">
                    <table className="w-full text-left border-collapse" style={{ minWidth:700 }}>
                      <thead>
                        <tr style={{ background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' }}>
                          <th style={{ padding:'10px 16px', fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em' }}>Employee</th>
                          <th style={{ padding:'10px 16px', fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'right' }}>Active Days</th>
                          <th style={{ padding:'10px 16px', fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'right' }}>Sessions</th>
                          <th style={{ padding:'10px 16px', fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'right' }}>Total Hours Worked</th>
                          <th style={{ padding:'10px 16px', fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'right' }}>Avg/Day</th>
                          <th style={{ padding:'10px 16px', fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'right' }}>Tasks Assigned</th>
                          <th style={{ padding:'10px 16px', fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'right' }}>Tasks Done</th>
                          <th style={{ padding:'10px 16px', fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'right' }}>Completion %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userActivitySummary.map((u, idx) => {
                          const avgSecs = u.activeDays > 0 ? Math.floor(u.totalSecs / u.activeDays) : 0
                          // Match tasks for this user
                          const userTasks = filteredTasks.filter(t =>
                            String(t.assignedTo || '').split(',').map(s => s.trim()).some(name =>
                              name.toLowerCase() === u.name.toLowerCase() ||
                              (u.email && name.toLowerCase() === u.email.toLowerCase())
                            )
                          )
                          const userDone = userTasks.filter(t => t.status === 'Done').length
                          const userTotal = userTasks.length
                          const userPct = userTotal > 0 ? Math.round(userDone / userTotal * 100) : 0
                          return (
                            <tr key={u.email || u.name} className="act-row" style={{ borderBottom: idx < userActivitySummary.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                              <td style={{ padding:'12px 16px' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                  <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#702c91,#ec008c)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13, fontWeight:800, flexShrink:0 }}>
                                    {u.name.slice(0,1).toUpperCase()}
                                  </div>
                                  <div>
                                    <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#1E1B2E' }}>{u.name}</p>
                                    {u.email && <p style={{ margin:0, fontSize:11, color:'#9CA3AF' }}>{u.email}</p>}
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding:'12px 16px', textAlign:'right', fontSize:13, fontWeight:700, color:'#702c91' }}>{u.activeDays}</td>
                              <td style={{ padding:'12px 16px', textAlign:'right', fontSize:13, fontWeight:600, color:'#4B5563' }}>{u.sessions}</td>
                              <td style={{ padding:'12px 16px', textAlign:'right' }}>
                                <span style={{ fontSize:14, fontWeight:900, color:'#1E1B2E' }}>{fmtDur(u.totalSecs)}</span>
                              </td>
                              <td style={{ padding:'12px 16px', textAlign:'right', fontSize:12, color:'#6B7280', fontWeight:600 }}>{fmtDur(avgSecs)}</td>
                              <td style={{ padding:'12px 16px', textAlign:'right', fontSize:13, fontWeight:700, color:'#1E1B2E' }}>{userTotal}</td>
                              <td style={{ padding:'12px 16px', textAlign:'right', fontSize:13, fontWeight:700, color:'#16A34A' }}>{userDone}</td>
                              <td style={{ padding:'12px 16px', textAlign:'right' }}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:8 }}>
                                  <div style={{ width:60, height:4, background:'#F3F4F6', borderRadius:99, overflow:'hidden' }}>
                                    <div style={{ width:`${userPct}%`, height:'100%', background: userPct >= 70 ? '#22C55E' : userPct >= 40 ? '#F59E0B' : '#EF4444', borderRadius:99, transition:'width 0.4s' }} />
                                  </div>
                                  <span style={{ fontSize:12, fontWeight:800, color: userPct >= 70 ? '#16A34A' : userPct >= 40 ? '#B45309' : '#DC2626', minWidth:32, textAlign:'right' }}>{userPct}%</span>
                                </div>
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

            {/* ── Company & User Breakdown ── */}
            <div className="mb-7">
              <h3 style={{ margin:'0 0 12px', fontSize:15, fontWeight:800, color:'#1E1B2E', display:'flex', alignItems:'center', gap:8 }}>
                <span className="material-symbols-outlined" style={{ fontSize:18, color:'#702c91' }}>corporate_fare</span>
                Company & User Breakdown
              </h3>
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left border-collapse" style={{ minWidth:860 }}>
                    <thead>
                      <tr style={{ background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' }}>
                        {['Company','User','Total','Done','In Progress','Review','Pending','Blocked','Overdue'].map(h => (
                          <th key={h} style={{ padding:'10px 14px', fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', textAlign: h === 'Company' || h === 'User' ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(companyBreakdown).sort().length === 0 ? (
                        <tr><td colSpan={9} style={{ padding:32, textAlign:'center', color:'#9CA3AF', fontSize:13 }}>No data for this selection.</td></tr>
                      ) : (
                        Object.keys(companyBreakdown).sort().flatMap((company, ci, arr) =>
                          Object.keys(companyBreakdown[company]).sort().map((u, ui, uArr) => {
                            const d = companyBreakdown[company][u]
                            return (
                              <tr key={`${company}-${u}`}
                                style={{ borderBottom: (ci === arr.length-1 && ui === uArr.length-1) ? 'none' : '1px solid #F3F4F6' }}
                                className="act-row"
                              >
                                {ui === 0 ? (
                                  <td rowSpan={uArr.length} style={{ padding:'12px 14px', fontSize:13, fontWeight:800, color:'#702c91', verticalAlign:'top', borderRight:'1px solid #F3F4F6' }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                      <span className="material-symbols-outlined" style={{ fontSize:15 }}>business</span>
                                      {company}
                                    </div>
                                  </td>
                                ) : null}
                                <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600, color:'#4B5563' }}>{u}</td>
                                <td style={{ padding:'10px 14px', fontSize:13, fontWeight:800, color:'#1E1B2E', textAlign:'right' }}>{d.total}</td>
                                <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#16A34A', textAlign:'right' }}>{d.done}</td>
                                <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#B45309', textAlign:'right' }}>{d.inProgress}</td>
                                <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#7C3AED', textAlign:'right' }}>{d.review}</td>
                                <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#1D4ED8', textAlign:'right' }}>{d.pending}</td>
                                <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#DC2626', textAlign:'right' }}>{d.blocked}</td>
                                <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#EA580C', textAlign:'right' }}>{d.overdue}</td>
                              </tr>
                            )
                          })
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── All Tasks Activity (with Status Filter) ── */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'#1E1B2E', display:'flex', alignItems:'center', gap:8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:18, color:'#702c91' }}>list_alt</span>
                  {!isAdmin ? 'My Tasks Activity' : filterType === 'Overall' ? 'All Tasks Activity' : `${selectedValue} Tasks Activity`}
                  <span style={{ fontSize:12, fontWeight:600, color:'#9CA3AF', fontStyle:'normal' }}>
                    ({tableTasks.length} task{tableTasks.length !== 1 ? 's' : ''})
                  </span>
                </h3>

                {/* Status filter pills */}
                <div data-html2canvas-ignore className="flex flex-wrap items-center gap-1.5">
                  {statusOptions.map(s => {
                    const active = statusFilter === s
                    const col = s === 'All' ? { bg: active ? '#702c91' : '#F3F4F6', text: active ? 'white' : '#6B7280' }
                      : s === 'Overdue' ? { bg: active ? '#EA580C' : '#FFF7ED', text: active ? 'white' : '#EA580C' }
                      : { bg: active ? statusStyle(s).bar : statusStyle(s).bg, text: active ? 'white' : statusStyle(s).text }
                    return (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className="status-pill"
                        style={{
                          background: col.bg, color: col.text,
                          border: 'none', borderRadius: 99,
                          padding: '4px 12px', fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none'
                        }}
                      >{s}</button>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left border-collapse" style={{ minWidth:900 }}>
                    <thead>
                      <tr style={{ background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' }}>
                        {[
                          { label:'Task ID',    w:'9%' },
                          { label:'Task Title', w:'28%' },
                          { label:'Status Updated', w:'12%' },
                          { label:'Due Date',   w:'11%' },
                          { label:'Client',     w:'14%' },
                          { label:'Assigned To',w:'16%' },
                          { label:'Status',     w:'10%' },
                          { label:'',           w:'6%' },
                        ].map(({ label, w }) => (
                          <th key={label} style={{ padding:'10px 14px', fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', width:w, textAlign: label === '' ? 'right' : 'left' }}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableTasks.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding:40, textAlign:'center', color:'#9CA3AF', fontSize:13 }}>
                            <span className="material-symbols-outlined" style={{ fontSize:32, display:'block', margin:'0 auto 8px', opacity:0.4 }}>search_off</span>
                            No tasks found{statusFilter !== 'All' ? ` with status "${statusFilter}"` : ''}.
                          </td>
                        </tr>
                      ) : (
                        tableTasks.map((row, idx) => (
                          <tr
                            key={row.id}
                            className="task-row"
                            style={{ borderBottom: idx < tableTasks.length - 1 ? '1px solid #F3F4F6' : 'none', cursor:'pointer' }}
                            onClick={() => navigate(`/tasks/${row.id}`)}
                          >
                            <td style={{ padding:'11px 14px', fontSize:12, fontWeight:800, color:'#702c91', fontFamily:'monospace' }}>
                              {row.id}
                            </td>
                            <td style={{ padding:'11px 14px', fontSize:13, color:'#4B5563', maxWidth:0 }}>
                              <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration: row.status === 'Done' ? 'line-through' : 'none', color: row.status === 'Done' ? '#9CA3AF' : '#4B5563' }}>
                                {row.title}
                              </span>
                            </td>
                            <td style={{ padding:'11px 14px', fontSize:11, color:'#6B7280' }}>
                              {row.statusUpdatedOn
                                ? (() => {
                                    try {
                                      const d = new Date(row.statusUpdatedOn)
                                      return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', timeZone:'Asia/Kolkata' })
                                    } catch { return row.statusUpdatedOn }
                                  })()
                                : <span style={{ color:'#E5E7EB' }}>—</span>
                              }
                            </td>
                            <td style={{ padding:'11px 14px' }}>
                              {row.dueDate
                                ? <span style={{ fontSize:11, fontWeight:700, color: row.overdue && row.status !== 'Done' ? '#DC2626' : '#702c91', background: row.overdue && row.status !== 'Done' ? '#FEE2E2' : '#F5F3FF', padding:'2px 8px', borderRadius:6 }}>{row.dueDate}</span>
                                : <span style={{ color:'#E5E7EB', fontSize:11 }}>—</span>
                              }
                            </td>
                            <td style={{ padding:'11px 14px', fontSize:12, color:'#6B7280' }}>{row.client || '—'}</td>
                            <td style={{ padding:'11px 14px', fontSize:12, color:'#6B7280' }}>{row.assignedTo || 'Unassigned'}</td>
                            <td style={{ padding:'11px 14px' }}>
                              <StatusBadge status={row.status} dueDate={row.dueDate} statusUpdatedOn={row.statusUpdatedOn} />
                              {row.overdue && row.status !== 'Done' && (
                                <span style={{ display:'block', fontSize:9, fontWeight:700, color:'#DC2626', marginTop:2 }}>Overdue</span>
                              )}
                            </td>
                            <td style={{ padding:'11px 14px', textAlign:'right' }}>
                              <span style={{ fontSize:11, fontWeight:700, color:'#702c91', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:2 }}>
                                View <span className="material-symbols-outlined" style={{ fontSize:13 }}>arrow_forward</span>
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
