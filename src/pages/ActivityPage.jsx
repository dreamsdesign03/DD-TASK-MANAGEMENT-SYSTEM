import React, { useState, useMemo, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'
import { getISTDate, getISTTime, formatDuration } from '../utils/activityLog'

function parseSheetDateTime(val) {
  if (!val) return null
  const str = String(val).trim()
  if (!str) return null
  const parts = str.split(/[ T]/)
  const datePart = parts[0]
  const timePart = parts[1] ? parts[1].split('.')[0] : '00:00:00'
  return { date: datePart, time: timePart, full: str }
}

function timeToSeconds(timeStr) {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  return parseInt(parts[0] || 0) * 3600 + parseInt(parts[1] || 0) * 60 + parseInt(parts[2] || 0)
}

function fmtHMS(seconds) {
  if (isNaN(seconds) || seconds <= 0) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

export default function ActivityPage() {
  const { profile, employees, fetchActivities } = useApp()

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const currentEmpId = profile?.['Employee ID'] || profile?.id || ''
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentEmpId && !selectedEmpId) setSelectedEmpId(currentEmpId)
    else if (employees.length > 0 && !selectedEmpId) setSelectedEmpId(employees[0].id)
  }, [currentEmpId, employees, selectedEmpId])

  const loadData = async () => {
    setLoading(true)
    const data = await fetchActivities()
    setActivities(data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const selectedEmployee = useMemo(() => {
    const emp = employees.find(e => String(e.id).trim() === String(selectedEmpId).trim())
    return emp || {
      id: selectedEmpId,
      name: profile?.['Full Name'] || profile?.name || '',
      role: profile?.Role || profile?.role || '',
      department: profile?.Department || profile?.department || '',
      email: profile?.['Email Address'] || profile?.email || ''
    }
  }, [employees, selectedEmpId, profile])

  const daysInMonth = useMemo(() => new Date(selectedYear, selectedMonth, 0).getDate(), [selectedMonth, selectedYear])
  const dateRangeStr = `${selectedMonth}/1/${selectedYear} to ${selectedMonth}/${daysInMonth}/${selectedYear}`

  const handlePrevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }
  const handleNextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }

  const todayDateStr = getISTDate()
  const currentISTTimeStr = getISTTime()

  const dayStats = useMemo(() => {
    const stats = {}
    const userActivities = activities.filter(act => {
      if (String(act['Employee ID']).trim() === String(selectedEmpId).trim()) return true
      const actName = String(act['Full Name'] || act['Name'] || act.name || '').trim().toLowerCase()
      const selName = String(selectedEmployee?.name || '').trim().toLowerCase()
      return !!(selName && actName && actName === selName)
    })

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayLogs = userActivities.filter(act => {
        const dt = parseSheetDateTime(act['Login Date and Time'])
        return dt && dt.date === dateStr
      })

      const sessions = dayLogs.map((log, idx) => {
        const loginDt = parseSheetDateTime(log['Login Date and Time'])
        const logoutDt = parseSheetDateTime(log['Logout Date and Time'])
        const loginTimeStr = loginDt ? loginDt.time : null
        let logoutTimeStr = logoutDt ? logoutDt.time : null
        let isStillActive = false

        if (!logoutTimeStr) {
          if (dateStr === todayDateStr) { logoutTimeStr = currentISTTimeStr; isStillActive = true }
          else logoutTimeStr = loginTimeStr
        }

        return {
          id: log.id || `session_${idx}`,
          loginTimeStr,
          logoutTimeStr,
          loginSecs: timeToSeconds(loginTimeStr),
          logoutSecs: timeToSeconds(logoutTimeStr),
          isStillActive,
          status: isStillActive ? 'active' : 'logged_out'
        }
      }).filter(s => s.loginTimeStr).sort((a, b) => a.loginSecs - b.loginSecs)

      const totalSeconds = sessions.reduce((sum, s) => sum + Math.max(0, s.logoutSecs - s.loginSecs), 0)
      stats[dateStr] = { day: d, dateStr, sessions, totalSeconds }
    }
    return stats
  }, [activities, selectedEmpId, selectedMonth, selectedYear, daysInMonth, todayDateStr, currentISTTimeStr])

  const totalMonthSeconds = useMemo(() =>
    Object.values(dayStats).reduce((sum, d) => sum + d.totalSeconds, 0),
    [dayStats]
  )

  return (
    <div className="bg-[#F0EDF8] font-['Inter',sans-serif] text-[#151c27] overflow-hidden h-screen flex">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
      `}</style>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden md:ml-[104px] transition-all duration-300">
        <TopNav title="Activity Tracker" showSearch={false} />
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 pb-6">
          <div className="max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#702c91] text-[32px]">monitoring</span>
                <h2 className="text-[26px] font-black text-[#702c91] m-0">Punch In / Out Logs</h2>
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
                <p className="text-[15px] font-medium text-gray-500">Loading activity records...</p>
              </div>
            ) : (
              <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-[0_8px_24px_rgba(91,33,182,0.08)] overflow-hidden">
                {/* Summary card */}
                <div className="px-6 py-5 border-b border-[#E5E7EB]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-[16px] font-bold text-[#1E1B2E] m-0">
                      {selectedEmployee?.name || 'Employee'} — Attendance
                    </h3>
                    <div className="flex items-center gap-3">
                      <button onClick={handlePrevMonth} className="p-1 bg-transparent border-none text-[#2563EB] hover:bg-blue-50 rounded-md cursor-pointer transition-colors flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] font-bold">chevron_left</span>
                      </button>
                      <span className="text-[13px] font-bold text-gray-700 min-w-[150px] text-center select-none">{dateRangeStr}</span>
                      <button onClick={handleNextMonth} className="p-1 bg-transparent border-none text-[#2563EB] hover:bg-blue-50 rounded-md cursor-pointer transition-colors flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] font-bold">chevron_right</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-3 text-[13px]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#702c91">work_history</span>
                      <span className="text-gray-500">Total Hours:</span>
                      <span className="font-bold text-[#1E1B2E]">{formatDuration(totalMonthSeconds)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#702c91]">calendar_month</span>
                      <span className="text-gray-500">Days Active:</span>
                      <span className="font-bold text-[#1E1B2E]">
                        {Object.values(dayStats).filter(d => d.sessions.length > 0).length} / {daysInMonth}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-[#E5E7EB]">
                        <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[15%]">Date</th>
                        <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[22%]">Session #1</th>
                        <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[22%]">Session #2</th>
                        <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider w-[22%]">Session #3+</th>
                        <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-right w-[10%]">Total</th>
                        <th className="py-4 px-6 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider text-center w-[9%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const dateFormatted = `${String(day).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`
                        const stat = dayStats[dateStr] || { sessions: [], totalSeconds: 0 }
                        const hasSessions = stat.sessions.length > 0

                        const s1 = stat.sessions[0] || null
                        const s2 = stat.sessions[1] || null
                        const extraCount = stat.sessions.length > 2 ? stat.sessions.length - 2 : 0

                        return (
                          <tr key={day} className={`hover:bg-gray-50/50 transition-colors ${!hasSessions ? 'opacity-50' : ''}`}>
                            <td className="py-5 px-6 text-[13px] font-semibold text-[#374151] whitespace-nowrap">
                              {dateFormatted}
                            </td>
                            <td className="py-5 px-6">
                              {s1 ? (
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2 text-[12px]">
                                    <span className="text-green-600 font-medium">{'Punch In'}:</span>
                                    <span className="font-bold text-[#1E1B2E]">{s1.loginTimeStr}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[12px]">
                                    <span className="text-red-600 font-medium">{'Punch Out'}:</span>
                                    <span className="font-bold text-[#1E1B2E]">
                                      {s1.isStillActive ? (
                                        <span className="text-green-600">Active Now</span>
                                      ) : s1.logoutTimeStr}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[12px]">
                                    <span className="text-blue-600 font-medium">Duration:</span>
                                    <span className="font-bold text-[#702c91]">{formatDuration(s1.logoutSecs - s1.loginSecs)}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#9CA3AF] text-[12px] italic">—</span>
                              )}
                            </td>
                            <td className="py-5 px-6">
                              {s2 ? (
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2 text-[12px]">
                                    <span className="text-green-600 font-medium">In:</span>
                                    <span className="font-bold text-[#1E1B2E]">{s2.loginTimeStr}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[12px]">
                                    <span className="text-red-600 font-medium">Out:</span>
                                    <span className="font-bold text-[#1E1B2E]">
                                      {s2.isStillActive ? (
                                        <span className="text-green-600">Active Now</span>
                                      ) : s2.logoutTimeStr}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[12px]">
                                    <span className="text-blue-600 font-medium">Duration:</span>
                                    <span className="font-bold text-[#702c91]">{formatDuration(s2.logoutSecs - s2.loginSecs)}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[#9CA3AF] text-[12px] italic">—</span>
                              )}
                            </td>
                            <td className="py-5 px-6">
                              {extraCount > 0 ? (
                                <span className="text-[12px] font-bold text-[#702c91] bg-purple-50 px-3 py-1.5 rounded-lg">
                                  +{extraCount} more sessions
                                </span>
                              ) : (
                                <span className={`text-[12px] font-bold ${hasSessions ? 'text-gray-400' : 'text-[#9CA3AF] italic'}`}>
                                  {hasSessions ? 'No more' : 'No punches'}
                                </span>
                              )}
                            </td>
                            <td className="py-5 px-6 text-right">
                              <span className="text-[14px] font-black text-[#1E1B2E]">{fmtHMS(stat.totalSeconds)}</span>
                            </td>
                            <td className="py-5 px-6 text-center">
                              {s1 ? (
                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full ${
                                  s1.isStillActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  <span className={`w-2 h-2 rounded-full ${s1.isStillActive ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`} />
                                  {s1.isStillActive ? 'Active' : 'Done'}
                                </span>
                              ) : (
                                <span className="text-gray-300 text-[13px]">—</span>
                              )}
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
    </div>
  )
}
