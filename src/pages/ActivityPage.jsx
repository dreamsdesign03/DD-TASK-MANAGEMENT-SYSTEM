import { useState, useMemo, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'
import { getISTDate, getISTTime, formatDuration } from '../utils/activityLog'

// Helper to parse date/time from the Google Sheet activity logs
function parseSheetDateTime(val) {
  if (!val) return null
  const str = String(val).trim()
  if (!str) return null
  
  // Try parsing "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS"
  const parts = str.split(/[ T]/)
  const datePart = parts[0] // "2026-07-01"
  const timePart = parts[1] ? parts[1].split('.')[0] : "00:00:00" // "09:30:15"
  
  return {
    date: datePart,
    time: timePart,
    full: str
  }
}

// Convert "HH:MM:SS" to seconds
function timeToSeconds(timeStr) {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  const hrs = parseInt(parts[0] || 0, 10)
  const mins = parseInt(parts[1] || 0, 10)
  const secs = parseInt(parts[2] || 0, 10)
  return hrs * 3600 + mins * 60 + secs
}

// Convert seconds to "HH:MM:SS"
function formatSecondsToHMS(seconds) {
  if (isNaN(seconds) || seconds <= 0) return "00:00:00"
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return [hrs, mins, secs].map(v => String(v).padStart(2, '0')).join(':')
}

// Timeline window constants (IST) — covers typical early/late work hours
const WINDOW_START = 6 * 3600    // 06:00 IST in seconds
const WINDOW_END = 22 * 3600     // 22:00 IST in seconds
const WINDOW_DURATION = WINDOW_END - WINDOW_START

// Convert seconds-from-midnight to a percentage position within the 09:30-19:00 window
function toWindowPercent(secs) {
  const clamped = Math.max(WINDOW_START, Math.min(WINDOW_END, secs))
  return ((clamped - WINDOW_START) / WINDOW_DURATION) * 100
}

export default function ActivityPage() {
  const { profile, employees, fetchActivities } = useApp()
  
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  
  const currentEmpId = profile?.["Employee ID"] || profile?.id || ''
  const [selectedEmpId, setSelectedEmpId] = useState('')
  
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showDayModal, setShowDayModal] = useState(false)

  // Set default selected employee ID once profile or employees load
  useEffect(() => {
    if (currentEmpId && !selectedEmpId) {
      setSelectedEmpId(currentEmpId)
    } else if (employees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(employees[0].id)
    }
  }, [currentEmpId, employees, selectedEmpId])

  // Fetch activities from Google Sheets API
  const loadData = async () => {
    setLoading(true)
    const data = await fetchActivities()
    setActivities(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Find details of the selected employee
  const selectedEmployee = useMemo(() => {
    const emp = employees.find(e => String(e.id).trim() === String(selectedEmpId).trim())
    return emp || {
      id: selectedEmpId,
      name: profile?.["Full Name"] || profile?.name || '',
      role: profile?.Role || profile?.role || '',
      department: profile?.Department || profile?.department || '',
      email: profile?.["Email Address"] || profile?.email || ''
    }
  }, [employees, selectedEmpId, profile])

  // Get days in the currently selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate()
  }, [selectedMonth, selectedYear])

  // Date range display: e.g., "7/1/2026 to 7/31/2026"
  const dateRangeStr = `${selectedMonth}/1/${selectedYear} to ${selectedMonth}/${daysInMonth}/${selectedYear}`

  // Navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(y => y - 1)
    } else {
      setSelectedMonth(m => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(y => y + 1)
    } else {
      setSelectedMonth(m => m + 1)
    }
  }

  // Filter activities for the selected user and calculate stats per day
  const todayDateStr = getISTDate()
  const currentISTTimeStr = getISTTime()

  const dayStats = useMemo(() => {
    const stats = {}
    
    // Filter activities belonging to selected employee
    const userActivities = activities.filter(act => {
      // Primary: match by Employee ID
      if (String(act["Employee ID"]).trim() === String(selectedEmpId).trim()) return true
      // Fallback: match by Full Name (handles cases where the same person
      // has multiple Employee IDs across different sheets/records)
      const actName = String(act["Full Name"] || act["Name"] || act.name || '').trim().toLowerCase()
      const selName = String(selectedEmployee?.name || '').trim().toLowerCase()
      if (selName && actName && actName === selName) return true
      return false
    })

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      
      const dayLogs = userActivities.filter(act => {
        const dt = parseSheetDateTime(act["Login Date and Time"])
        return dt && dt.date === dateStr
      })

      const sessions = dayLogs.map((log, idx) => {
        const loginDt = parseSheetDateTime(log["Login Date and Time"])
        const logoutDt = parseSheetDateTime(log["Logout Date and Time"])
        
        const loginTimeStr = loginDt ? loginDt.time : null
        let logoutTimeStr = logoutDt ? logoutDt.time : null
        let isStillActive = false

        if (!logoutTimeStr) {
          if (dateStr === todayDateStr) {
            logoutTimeStr = currentISTTimeStr
            isStillActive = true
          } else {
            // Missed logout in the past: treat duration as 0 or single punch
            logoutTimeStr = loginTimeStr
          }
        }

        const loginSecs = timeToSeconds(loginTimeStr)
        const logoutSecs = timeToSeconds(logoutTimeStr)

        return {
          id: log.id || `session_${idx}`,
          loginTimeStr,
          logoutTimeStr,
          loginSecs,
          logoutSecs,
          isStillActive,
          status: isStillActive ? 'active' : 'logged_out'
        }
      }).filter(s => s.loginTimeStr).sort((a, b) => a.loginSecs - b.loginSecs)

      const totalSeconds = sessions.reduce((sum, s) => sum + Math.max(0, s.logoutSecs - s.loginSecs), 0)
      const extraSeconds = totalSeconds > 28800 ? totalSeconds - 28800 : 0 // Overtime after 8 hours

      stats[dateStr] = {
        day: d,
        dateStr,
        sessions,
        totalSeconds,
        extraSeconds
      }
    }

    return stats
  }, [activities, selectedEmpId, selectedMonth, selectedYear, daysInMonth, todayDateStr, currentISTTimeStr])

  return (
    <div className="bg-[#F0EDF8] font-['Inter',sans-serif] text-[#151c27] overflow-hidden h-screen flex">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden md:ml-[104px] transition-all duration-300">
        <TopNav title="Activity Tracker" showSearch={false} />

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 pb-6">
          <div className="max-w-[1400px] mx-auto">

            {/* Header Section */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#702c91] text-[32px]">monitoring</span>
                <h2 className="text-[26px] font-black text-[#702c91] m-0">Employee Activity & Attendance</h2>
              </div>
              
              <div className="flex items-center gap-3">
                {profile?.systemRole !== 'Employee' && (
                  <select
                    value={selectedEmpId}
                    onChange={e => setSelectedEmpId(e.target.value)}
                    className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 text-[13px] font-bold text-[#1E1B2E] focus:border-[#702c91] outline-none min-w-[220px] cursor-pointer shadow-sm hover:bg-gray-50 transition-colors"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                )}
                
                <button
                  onClick={loadData}
                  className="flex items-center justify-center p-2 bg-white border border-[#E5E7EB] rounded-lg text-gray-500 hover:text-[#702c91] hover:border-[#702c91]/30 transition-all cursor-pointer shadow-sm"
                  title="Refresh Logs"
                >
                  <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>sync</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-[#E5E7EB] shadow-sm">
                <span className="material-symbols-outlined text-[48px] text-[#702c91] animate-spin mb-4">progress_activity</span>
                <p className="text-[15px] font-medium text-gray-500">Fetching activity records from sheet...</p>
              </div>
            ) : (
              <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-[0_8px_24px_rgba(91,33,182,0.08)] overflow-hidden">
                
                {/* Attendance details card header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
                  <h3 className="text-[16px] font-bold text-[#1E1B2E] m-0">Attendance details</h3>
                  
                  {/* Date range selector */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handlePrevMonth}
                      className="p-1 bg-transparent border-none text-[#2563EB] hover:bg-blue-50 rounded-md cursor-pointer transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[20px] font-bold">chevron_left</span>
                    </button>
                    
                    <span className="text-[13px] font-bold text-gray-700 min-w-[150px] text-center select-none">
                      {dateRangeStr}
                    </span>
                    
                    <button 
                      onClick={handleNextMonth}
                      className="p-1 bg-transparent border-none text-[#2563EB] hover:bg-blue-50 rounded-md cursor-pointer transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[20px] font-bold">chevron_right</span>
                    </button>
                  </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-[#E5E7EB]">
                        <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[12%]">DATE</th>
                        <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[54%]">PUNCHES</th>
                        <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-right w-[12%]">WORKHOURS</th>
                        <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-right w-[12%]">EXTRA TIME</th>
                        <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-center w-[10%]">OP LOGS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const dayNumStr = String(day).padStart(2, '0')
                        const monthNumStr = String(selectedMonth).padStart(2, '0')
                        const dateFormatted = `${dayNumStr}/${monthNumStr}/${selectedYear}`
                        const dateStr = `${selectedYear}-${monthNumStr}-${dayNumStr}`
                        
                        const stat = dayStats[dateStr] || { sessions: [], totalSeconds: 0, extraSeconds: 0 }
                        const hasSessions = stat.sessions.length > 0

                        // Merge overlapping sessions for clean timeline rendering
                        const processedSessions = (() => {
                          const sorted = [...stat.sessions].sort((a, b) => a.loginSecs - b.loginSecs)
                          const merged = []
                          for (const s of sorted) {
                            const prev = merged[merged.length - 1]
                            if (prev && s.loginSecs < prev.logoutSecs) {
                              prev.logoutSecs = Math.max(prev.logoutSecs, s.logoutSecs)
                              prev.isStillActive = prev.isStillActive || s.isStillActive
                            } else {
                              merged.push({ ...s })
                            }
                          }
                          return merged
                        })()

                        // Calculate chevrons position relative to the 09:30-19:00 window
                        const firstSession = processedSessions[0]
                        const lastSession = processedSessions[processedSessions.length - 1]

                        const firstPercent = firstSession ? toWindowPercent(firstSession.loginSecs) : 0
                        const lastPercent = lastSession ? toWindowPercent(lastSession.logoutSecs) : 0

                        return (
                          <tr 
                            key={day} 
                            onClick={() => {
                              if (hasSessions) {
                                setSelectedDay(dateStr)
                                setShowDayModal(true)
                              }
                            }}
                            className={`hover:bg-gray-50/50 transition-colors ${hasSessions ? 'cursor-pointer' : ''}`}
                          >
                            {/* DATE */}
                            <td className="py-6 px-6 text-[13px] font-semibold text-[#374151]">
                              {dateFormatted}
                            </td>

                            {/* PUNCHES TIMELINE BAR — Vertical */}
                            <td className="py-2 px-6">
                              <div className="flex items-start gap-4 select-none" style={{ height: 130 }}>
                                {/* Vertical Bar */}
                                <div className="relative flex-shrink-0" style={{ width: 40, height: '100%' }}>
                                  {/* Background track */}
                                  <div className="absolute inset-0 bg-[#E2E8F0]/50 rounded-full overflow-hidden" style={{ width: 8, left: 16 }}>
                                    {/* Hour tick marks */}
                                    <div className="absolute inset-0 pointer-events-none">
                                      {[8, 10, 12, 14, 16, 18, 20].map(h => {
                                        const secs = h * 3600
                                        const pct = toWindowPercent(secs)
                                        return (
                                          <div
                                            key={h}
                                            className="absolute w-full bg-[#94A3B8]/40"
                                            style={{ bottom: `${pct}%`, height: 1 }}
                                          />
                                        )
                                      })}
                                    </div>

                                    {/* Session segments */}
                                    {processedSessions.map((s, idx) => {
                                      const bottomPct = toWindowPercent(s.loginSecs)
                                      const topPct = toWindowPercent(s.logoutSecs)
                                      const heightPct = topPct - bottomPct
                                      if (heightPct <= 0) return null

                                      return (
                                        <div
                                          key={s.id || idx}
                                          className={`absolute left-0 w-full rounded-full transition-all duration-300 ${
                                            s.isStillActive
                                              ? 'bg-gradient-to-t from-[#2563EB] to-[#60A5FA] animate-shimmer shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                                              : 'bg-[#2563EB] hover:bg-blue-600'
                                          }`}
                                          style={{
                                            bottom: `${bottomPct}%`,
                                            height: `${Math.max(3, heightPct)}%`
                                          }}
                                          title={`${s.loginTimeStr} - ${s.logoutTimeStr}${s.isStillActive ? ' (Active)' : ''}`}
                                        />
                                      )
                                    })}
                                  </div>

                                  {/* Time labels along the bar */}
                                  <div className="absolute left-0 w-full h-full pointer-events-none" style={{ fontSize: 9 }}>
                                    {processedSessions.length > 0 && (
                                      <>
                                        <span className="absolute text-[#2563EB] font-bold whitespace-nowrap" style={{ bottom: `${toWindowPercent(processedSessions[0].loginSecs)}%`, left: 0, transform: 'translateY(50%)' }}>
                                          {processedSessions[0].loginTimeStr}
                                        </span>
                                        <span className="absolute text-[#2563EB] font-bold whitespace-nowrap" style={{ bottom: `${toWindowPercent(processedSessions[processedSessions.length - 1].logoutSecs)}%`, left: 0, transform: 'translateY(-50%)' }}>
                                          {processedSessions[processedSessions.length - 1].isStillActive ? 'NOW' : processedSessions[processedSessions.length - 1].logoutTimeStr}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Session info */}
                                <div className="flex flex-col gap-1.5 pt-1" style={{ fontSize: 11 }}>
                                  {processedSessions.length > 0 ? (
                                    processedSessions.slice(0, 2).map((s, idx) => (
                                      <div key={s.id || idx} className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.isStillActive ? 'bg-[#2563EB] animate-shimmer' : 'bg-[#2563EB]'}`} />
                                        <span className="font-semibold text-[#374151]">
                                          {s.loginTimeStr} – {s.isStillActive ? 'Active' : s.logoutTimeStr}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-[#9CA3AF] italic">No punches</span>
                                  )}
                                  {processedSessions.length > 2 && (
                                    <span className="text-[#9CA3AF] font-semibold mt-0.5">+{processedSessions.length - 2} more</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* WORKHOURS */}
                            <td className="py-6 px-6 text-[13px] font-semibold text-[#1F2937] text-right">
                              {formatSecondsToHMS(stat.totalSeconds)}
                            </td>

                            {/* EXTRA TIME */}
                            <td className="py-6 px-6 text-[13px] font-semibold text-[#4B5563] text-right">
                              {formatSecondsToHMS(stat.extraSeconds)}
                            </td>

                            {/* OP LOGS */}
                            <td className="py-6 px-6 text-center text-gray-400 text-[13px]">
                              -
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

          </div>
        </div>
      </main>

      {/* Detailed Day Modal */}
      {showDayModal && selectedDay && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] overflow-hidden animate-scale-in flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-[17px] font-bold text-[#702c91] flex items-center gap-2 m-0">
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                Day Timeline - {selectedDay}
              </h2>
              <button
                onClick={() => setShowDayModal(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-5">
              <div className="mb-4 bg-purple-50 rounded-xl p-4 border border-purple-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#702c91] flex items-center justify-center text-white text-[14px] font-bold shadow-md">
                  {selectedEmployee.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="m-0 text-[14px] font-bold text-[#1E1B2E]">{selectedEmployee.name}</h4>
                  <p className="m-0 text-[12px] text-gray-500">{selectedEmployee.role} • {selectedEmployee.department}</p>
                </div>
              </div>

              {dayStats[selectedDay]?.sessions?.length > 0 ? (
                <>
                  {/* Vertical Timeline */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="text-[13px] font-bold text-[#1E1B2E] mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#702c91">timeline</span>
                      Session Timeline (IST)
                    </h3>
                    <div className="relative flex gap-5" style={{ height: 260 }}>
                      {/* Time axis labels */}
                      <div className="flex flex-col justify-between text-right flex-shrink-0" style={{ width: 38, fontSize: 10, fontWeight: 600, color: '#94A3B8' }}>
                        {[22, 20, 18, 16, 14, 12, 10, 8, 6].map(h => (
                          <span key={h}>{String(h).padStart(2, '0')}:00</span>
                        ))}
                      </div>

                      {/* Vertical track */}
                      <div className="relative flex-grow bg-[#F1F5F9] rounded-full" style={{ width: 14, minWidth: 14 }}>
                        {/* Hour lines */}
                        {[6, 8, 10, 12, 14, 16, 18, 20, 22].map(h => {
                          const secs = h * 3600
                          const pct = ((secs - WINDOW_START) / WINDOW_DURATION) * 100
                          return (
                            <div key={h} className="absolute left-0 right-0 border-t border-[#CBD5E1]/40" style={{ bottom: `${pct}%` }} />
                          )
                        })}

                        {/* Session segments */}
                        {dayStats[selectedDay].sessions.map((s, idx) => {
                          const bottomPct = toWindowPercent(s.loginSecs)
                          const topPct = toWindowPercent(s.logoutSecs)
                          const heightPct = topPct - bottomPct
                          if (heightPct <= 0) return null

                          return (
                            <div
                              key={s.id || idx}
                              className={`absolute left-1/2 -translate-x-1/2 w-full rounded-full transition-all duration-300 ${
                                s.isStillActive
                                  ? 'bg-gradient-to-t from-[#2563EB] to-[#60A5FA] animate-shimmer shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                                  : 'bg-[#3B82F6]'
                              }`}
                              style={{
                                bottom: `${bottomPct}%`,
                                height: `${Math.max(4, heightPct)}%`,
                                minWidth: 8,
                              }}
                              title={`${s.loginTimeStr} - ${s.logoutTimeStr || 'Active'}`}
                            />
                          )
                        })}
                      </div>

                      {/* Session list — plain vertical, decoupled from chart y-axis */}
                      <div className="flex flex-col justify-center flex-grow gap-y-3 overflow-y-auto" style={{ fontSize: 11, minHeight: 0 }}>
                        {dayStats[selectedDay].sessions
                          .slice()
                          .reverse()
                          .map((s, idx) => {
                          const total = dayStats[selectedDay].sessions.length
                          const realIdx = total - 1 - idx

                          return (
                            <div key={s.id || realIdx} className="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0" style={{ minHeight: 40 }}>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.isStillActive ? 'bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-[#3B82F6]'}`} />
                                <div className="min-w-0">
                                  <span className="font-bold text-[#1E1B2E] whitespace-nowrap">
                                    {s.loginTimeStr} – {s.isStillActive ? 'Active' : s.logoutTimeStr}
                                  </span>
                                  <span className="text-[#94A3B8] ml-1.5 whitespace-nowrap">
                                    ({formatDuration(s.logoutSecs - s.loginSecs)})
                                  </span>
                                </div>
                              </div>
                              <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                s.isStillActive ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {s.isStillActive ? 'LIVE' : `#${realIdx + 1}`}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Summary bar */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider">Total Time</span>
                      <span className="text-[18px] font-black text-[#702c91]">
                        {formatDuration(dayStats[selectedDay].totalSeconds)}
                      </span>
                    </div>
                  </div>

                  {/* Session detail cards */}
                  <div className="space-y-3">
                    <h3 className="text-[13px] font-bold text-[#1E1B2E] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#702c91]">list_alt</span>
                      All Sessions ({dayStats[selectedDay].sessions.length})
                    </h3>
                    {dayStats[selectedDay].sessions.map((s, idx) => (
                      <div 
                        key={s.id || idx} 
                        className="bg-[#F8FAFC] rounded-xl p-4 border border-slate-100 transition-all hover:border-[#702c91]/20"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[12px] font-extrabold text-[#702c91] uppercase bg-purple-50 px-2.5 py-1 rounded-md">
                            Session #{idx + 1}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            s.isStillActive ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {s.isStillActive ? 'Active Now' : 'Logged Out'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[13px]">
                          <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <span className="text-[#64748B] block text-[10px] font-bold uppercase tracking-wider mb-1">
                              <span className="material-symbols-outlined text-[14px] align-text-bottom">login</span> Punch In
                            </span>
                            <span className="font-bold text-slate-800 text-[15px]">{s.loginTimeStr || '-'}</span>
                            <span className="block text-[10px] text-[#94A3B8] mt-0.5">IST</span>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <span className="text-[#64748B] block text-[10px] font-bold uppercase tracking-wider mb-1">
                              <span className="material-symbols-outlined text-[14px] align-text-bottom">logout</span> Punch Out
                            </span>
                            <span className="font-bold text-slate-800 text-[15px]">{s.isStillActive ? '—' : s.logoutTimeStr}</span>
                            <span className="block text-[10px] text-[#94A3B8] mt-0.5">IST</span>
                          </div>
                          <div className="col-span-2 bg-[#702c91]/5 rounded-lg p-3 border border-[#702c91]/10 flex items-center justify-between">
                            <span className="text-[#64748B] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">schedule</span> Duration
                            </span>
                            <span className="font-black text-[#702c91] text-[16px]">
                              {formatDuration(s.logoutSecs - s.loginSecs)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <span className="material-symbols-outlined text-[40px] mb-2">info</span>
                  <p className="text-[14px]">No punches recorded for this day.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowDayModal(false)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#702c91] to-[#ec008c] border-none text-white font-bold rounded-lg shadow-md active:scale-95 transition-all text-[13px] cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
