import React, { useState, useMemo, useEffect } from 'react'
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
  const [expandedDays, setExpandedDays] = useState(new Set())

  const toggleDay = (dateStr) => {
    setExpandedDays(prev => {
      const next = new Set(prev)
      if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr)
      return next
    })
  }

  const formatGap = (secs) => {
    if (secs <= 0) return ''
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return `${h}h ${m}m`
  }

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
                          <React.Fragment key={day}>
                          <tr 
                            onClick={() => { if (hasSessions) toggleDay(dateStr) }}
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
                            <td className="py-6 px-6 text-center">
                              {hasSessions ? (
                                <span className="material-symbols-outlined text-[#702c91] text-[20px] transition-transform duration-200" style={{ transform: expandedDays.has(dateStr) ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                  expand_more
                                </span>
                              ) : (
                                <span className="text-gray-300 text-[13px]">—</span>
                              )}
                            </td>
                          </tr>
                          {hasSessions && expandedDays.has(dateStr) && (
                            <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                              <td colSpan={5} className="px-6 pb-5 pt-2">
                                <div className="flex flex-col gap-2" style={{ maxHeight: 320, overflowY: 'auto' }}>
                                  {/* Summary line */}
                                  <div className="flex items-center gap-3 mb-2 text-[12px] font-bold text-[#6B7280] px-1">
                                    <span className="material-symbols-outlined text-[16px] text-[#702c91]">schedule</span>
                                    Total: {formatDuration(stat.totalSeconds)} &middot; {stat.sessions.length} session{stat.sessions.length > 1 ? 's' : ''}
                                  </div>

                                  {stat.sessions.map((s, idx) => {
                                    const prev = idx > 0 ? stat.sessions[idx - 1] : null
                                    const gapSecs = prev ? s.loginSecs - prev.logoutSecs : 0
                                    const showGap = prev && gapSecs > 60

                                    return (
                                      <React.Fragment key={s.id || idx}>
                                        {/* Gap row */}
                                        {showGap && (
                                          <div className="flex items-center gap-3 px-1 py-1.5">
                                            <div className="flex items-center gap-2 text-[#F59E0B]">
                                              <span className="material-symbols-outlined text-[14px]">pause_circle</span>
                                              <span className="font-bold text-[11px]">Gap: {formatGap(gapSecs)}</span>
                                            </div>
                                            <span className="text-[10px] text-[#94A3B8] font-medium">
                                              ({prev.logoutTimeStr} → {s.loginTimeStr})
                                            </span>
                                            <div className="flex-1 border-b border-dashed border-[#FDE68A]" />
                                          </div>
                                        )}

                                        {/* Session row */}
                                        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-4 py-3 hover:border-[#702c91]/20 transition-colors" style={{ minHeight: 52 }}>
                                          <div className="flex items-center gap-4 min-w-0 flex-1">
                                            <span className="text-[11px] font-extrabold text-[#702c91] bg-purple-50 px-2 py-1 rounded-md whitespace-nowrap">
                                              SESSION #{idx + 1}
                                            </span>
                                            <div className="flex items-center gap-4 flex-wrap">
                                              <div>
                                                <span className="text-[10px] font-bold text-[#64748B] uppercase block">In</span>
                                                <span className="text-[13px] font-bold text-[#1E1B2E]">{s.loginTimeStr}</span>
                                              </div>
                                              <span className="material-symbols-outlined text-[14px] text-[#94A3B8]">arrow_forward</span>
                                              <div>
                                                <span className="text-[10px] font-bold text-[#64748B] uppercase block">Out</span>
                                                <span className="text-[13px] font-bold text-[#1E1B2E]">{s.isStillActive ? '—' : s.logoutTimeStr}</span>
                                              </div>
                                              <div className="bg-[#702c91]/5 rounded-lg px-3 py-1.5 border border-[#702c91]/10">
                                                <span className="text-[10px] font-bold text-[#64748B] uppercase block">Duration</span>
                                                <span className="text-[14px] font-black text-[#702c91]">{formatDuration(s.logoutSecs - s.loginSecs)}</span>
                                              </div>
                                            </div>
                                          </div>
                                          <span className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                            s.isStillActive ? 'bg-green-100 text-green-700 animate-shimmer' : 'bg-blue-100 text-blue-700'
                                          }`}>
                                            {s.isStillActive ? 'ACTIVE NOW' : 'LOGGED OUT'}
                                          </span>
                                        </div>
                                      </React.Fragment>
                                    )
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                            </React.Fragment>
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
    </div>
  )
}
