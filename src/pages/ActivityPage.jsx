import { useState, useMemo } from 'react'
import Sidebar from '../components/Sidebar'
import TopNav from '../components/TopNav'
import { useApp } from '../context/AppContext'
import { loadActivityLog, formatDuration } from '../utils/activityLog'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(month, year) {
  return new Date(year, month - 1, 1).getDay()
}

function getMonthRange(month, year) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = getDaysInMonth(month, year)
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export default function ActivityPage() {
  const { profile, getAllLoggedUsers, getISTDate } = useApp()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedUser, setSelectedUser] = useState('all')
  const [selectedDay, setSelectedDay] = useState(null)
  const [showDayModal, setShowDayModal] = useState(false)

  const allUsers = getAllLoggedUsers()
  const activityLog = loadActivityLog()
  const today = getISTDate()

  const filteredLog = useMemo(() => {
    const { start, end } = getMonthRange(selectedMonth, selectedYear)
    let logs = activityLog.filter(s => s.date >= start && s.date <= end)
    if (selectedUser !== 'all') {
      logs = logs.filter(s => s.email === selectedUser)
    }
    return logs
  }, [activityLog, selectedMonth, selectedYear, selectedUser])

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
  const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear)

  const dayStats = useMemo(() => {
    const stats = {}
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayLogs = filteredLog.filter(s => s.date === dateStr)
      const totalSecs = dayLogs.reduce((sum, s) => sum + (s.duration || 0), 0)
      const activeUsers = dayLogs.filter(s => s.status === 'active').length
      const shutdowns = dayLogs.filter(s => s.status === 'shutdown').length
      stats[dateStr] = {
        date: dateStr,
        day: d,
        totalSessions: dayLogs.length,
        totalSeconds: totalSecs,
        activeUsers,
        shutdowns,
        sessions: dayLogs
      }
    }
    return stats
  }, [filteredLog, daysInMonth, selectedMonth, selectedYear])

  const monthTotalSeconds = Object.values(dayStats).reduce((sum, d) => sum + d.totalSeconds, 0)

  const usersInMonth = useMemo(() => {
    const userSet = new Set()
    filteredLog.forEach(s => userSet.add(s.email))
    const userStats = []
    userSet.forEach(email => {
      const userSessions = filteredLog.filter(s => s.email === email)
      const name = userSessions[0]?.name || email
      const totalSecs = userSessions.reduce((sum, s) => sum + (s.duration || 0), 0)
      const presentDays = new Set(userSessions.map(s => s.date)).size
      const shutdownDays = userSessions.filter(s => s.status === 'shutdown').length
      userStats.push({ email, name, totalSeconds: totalSecs, presentDays, shutdownDays, sessions: userSessions.length })
    })
    userStats.sort((a, b) => b.totalSeconds - a.totalSeconds)
    return userStats
  }, [filteredLog])

  const getDayColor = (dateStr) => {
    const stat = dayStats[dateStr]
    if (!stat || stat.totalSessions === 0) return 'bg-[#F3F4F6]'
    if (stat.shutdowns > 0) return 'bg-[#FEF2F2]'
    if (stat.totalSeconds > 0) return 'bg-[#F0FDF4]'
    return 'bg-[#F3F4F6]'
  }

  const getDayStatus = (dateStr) => {
    const stat = dayStats[dateStr]
    if (!stat || stat.totalSessions === 0) return 'No activity'
    if (stat.shutdowns > 0) return 'Shutdown'
    if (stat.totalSeconds > 0) return `${formatDuration(stat.totalSeconds)}`
    return 'No activity'
  }

  return (
    <div className="bg-[#F0EDF8] font-['Inter',sans-serif] text-[#151c27] overflow-hidden h-screen flex">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F8; border-radius: 10px; }
      `}</style>
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden md:ml-[104px] transition-all duration-300">
        <TopNav title="Activity Log" showSearch={false} />

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-5 pb-6 animate-fade-in-up">
          <div className="w-full">

            {/* Header Section */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-[26px] font-bold text-[#702c91] m-0">Team Activity Tracker</h2>
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                  className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 text-[13px] font-bold text-[#1E1B2E] focus:border-[#702c91] outline-none min-w-[180px] cursor-pointer"
                >
                  <option value="all">All Users</option>
                  {allUsers.map(u => (
                    <option key={u.email} value={u.email}>{u.name}</option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 text-[13px] font-bold text-[#1E1B2E] focus:border-[#702c91] outline-none cursor-pointer"
                >
                  {MONTHS.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 text-[13px] font-bold text-[#1E1B2E] focus:border-[#702c91] outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB] relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/10">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#702c91]"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Total Sessions</p>
                    <h3 className="text-[28px] font-black text-[#702c91] leading-none m-0">{filteredLog.length}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#702c91]">assignment</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB] relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/10">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#10B981]"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Total Hours</p>
                    <h3 className="text-[28px] font-black text-[#10B981] leading-none m-0">{formatDuration(monthTotalSeconds)}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#10B981]">schedule</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB] relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/10">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#F59E0B]"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Active Users</p>
                    <h3 className="text-[28px] font-black text-[#F59E0B] leading-none m-0">{usersInMonth.length}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#F59E0B]">group</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB] relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/10">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#EF4444]"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Shutdowns</p>
                    <h3 className="text-[28px] font-black text-[#EF4444] leading-none m-0">{filteredLog.filter(s => s.status === 'shutdown').length}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#EF4444]">power_off</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6 mb-8">
              <h3 className="text-[16px] font-bold text-[#1E1B2E] mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#702c91]">calendar_month</span>
                {MONTHS[selectedMonth - 1]} {selectedYear} - Daily Activity
              </h3>

              {/* Legend */}
              <div className="flex items-center gap-6 mb-6 text-[12px] font-medium text-[#6B7280]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#F0FDF4] border border-[#10B981]/30"></div>
                  <span>Active (worked)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#FEF2F2] border border-[#EF4444]/30"></div>
                  <span>Shutdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#F3F4F6] border border-[#E5E7EB]"></div>
                  <span>No Activity</span>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square rounded-lg"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const stat = dayStats[dateStr]
                  const isToday = dateStr === today
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (stat && stat.totalSessions > 0) {
                          setSelectedDay(dateStr)
                          setShowDayModal(true)
                        }
                      }}
                      disabled={!stat || stat.totalSessions === 0}
                      className={`aspect-square rounded-xl border text-[13px] font-bold transition-all relative flex flex-col items-center justify-center ${
                        isToday ? 'ring-2 ring-[#702c91] ring-offset-2' : ''
                      } ${
                        stat && stat.totalSessions > 0
                          ? `${getDayColor(dateStr)} border-[#E5E7EB] cursor-pointer hover:scale-105 hover:shadow-md`
                          : 'bg-[#FAFAFA] border-[#F3F4F6] cursor-default opacity-60'
                      }`}
                    >
                      <span className={stat && stat.totalSessions > 0 ? 'text-[#1E1B2E]' : 'text-[#9CA3AF]'}>{day}</span>
                      {stat && stat.totalSessions > 0 && (
                        <span className="text-[8px] font-medium mt-0.5 leading-tight">
                          {stat.shutdowns > 0 ? (
                            <span className="text-[#EF4444]">Shutdown</span>
                          ) : (
                            <span className="text-[#10B981]">{formatDuration(stat.totalSeconds)}</span>
                          )}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* User-wise Monthly Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E5E7EB] overflow-hidden">
              <div className="p-6 pb-4 border-b border-[#E5E7EB]">
                <h3 className="text-[16px] font-bold text-[#1E1B2E] flex items-center gap-2 m-0">
                  <span className="material-symbols-outlined text-[#702c91]">group</span>
                  User-wise Working Hours
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">User</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Present Days</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Total Sessions</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Total Hours</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Avg / Day</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Shutdowns</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersInMonth.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-[#9CA3AF] text-[14px]">
                          No activity data for this month.
                        </td>
                      </tr>
                    ) : (
                      usersInMonth.map((u, idx) => {
                        const avgSecs = u.presentDays > 0 ? Math.floor(u.totalSeconds / u.presentDays) : 0
                        const status = u.sessions > 0 && u.sessions === u.shutdownDays ? 'Shutdown' : u.totalSeconds > 0 ? 'Active' : 'Inactive'
                        return (
                          <tr key={u.email} className={`border-b border-[#E5E7EB] transition-all ${idx === usersInMonth.length - 1 ? 'border-b-0' : ''}`}>
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#702c91] text-[12px] font-bold">
                                  {u.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="text-[13px] font-bold text-[#1E1B2E]">{u.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-[13px] font-bold text-[#4B5563]">{u.presentDays}</td>
                            <td className="py-4 px-5 text-[13px] text-[#6B7280]">{u.sessions}</td>
                            <td className="py-4 px-5 text-[13px] font-bold text-[#702c91]">{formatDuration(u.totalSeconds)}</td>
                            <td className="py-4 px-5 text-[13px] text-[#6B7280]">{formatDuration(avgSecs)}</td>
                            <td className="py-4 px-5 text-[13px] text-[#EF4444]">{u.shutdownDays > 0 ? u.shutdownDays : '-'}</td>
                            <td className="py-4 px-5">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                status === 'Active' ? 'bg-[#F0FDF4] text-[#10B981]' :
                                status === 'Shutdown' ? 'bg-[#FEF2F2] text-[#EF4444]' :
                                'bg-[#F3F4F6] text-[#9CA3AF]'
                              }`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Day Detail Modal */}
      {showDayModal && selectedDay && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] overflow-hidden animate-scale-in flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h2 className="text-[18px] font-bold text-[#702c91] flex items-center gap-2 m-0">
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                Activity - {selectedDay}
              </h2>
              <button
                onClick={() => setShowDayModal(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded-full hover:bg-gray-100"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
              {dayStats[selectedDay]?.sessions?.length > 0 ? (
                dayStats[selectedDay].sessions.map(s => (
                  <div key={s.id} className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB] transition-all hover:border-[#702c91]/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#702c91] text-[11px] font-bold">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[14px] font-bold text-[#1E1B2E]">{s.name}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        s.status === 'active' ? 'bg-[#F0FDF4] text-[#10B981]' :
                        s.status === 'shutdown' ? 'bg-[#FEF2F2] text-[#EF4444]' :
                        'bg-[#F3F4F6] text-[#6B7280]'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[13px]">
                      <div>
                        <span className="text-[#9CA3AF] block text-[11px] font-medium">Login Time</span>
                        <span className="font-bold text-[#1E1B2E]">{s.loginTime || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[#9CA3AF] block text-[11px] font-medium">Logout Time</span>
                        <span className="font-bold text-[#1E1B2E]">{s.logoutTime || 'Still active'}</span>
                      </div>
                      <div>
                        <span className="text-[#9CA3AF] block text-[11px] font-medium">Duration</span>
                        <span className="font-bold text-[#702c91]">{formatDuration(s.duration)}</span>
                      </div>
                      <div>
                        <span className="text-[#9CA3AF] block text-[11px] font-medium">Status</span>
                        <span className="font-bold text-[#1E1B2E] capitalize">{s.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[#9CA3AF]">
                  <span className="material-symbols-outlined text-[40px] mb-2">info</span>
                  <p className="text-[14px]">No activity data for this day.</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDayModal(false)}
                className="px-6 py-2.5 btn-gradient border-none rounded-lg font-bold shadow-md active:scale-95 transition-all text-[13px] cursor-pointer"
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
