import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserColor, getInitials } from '../utils/avatar'

const MAX_VISIBLE_TASKS = 2

export default function TaskCalendar({ tasks }) {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showMonthDropdown, setShowMonthDropdown] = useState(false)
  const [popupDay, setPopupDay] = useState(null)
  const monthDropdownRef = useRef(null)
  const popupRef = useRef(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  useEffect(() => {
    function handleClickOutside(event) {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target)) {
        setShowMonthDropdown(false)
      }
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setPopupDay(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const daysInPrevMonth = getDaysInMonth(year, month - 1)

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  const days = []
  
  // Previous month days
  for (let i = 0; i < firstDay; i++) {
    days.unshift({
      day: daysInPrevMonth - i,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false
    })
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      month: month,
      year: year,
      isCurrentMonth: true
    })
  }

  // Next month days to complete 6 weeks (42 cells)
  const remainingCells = 42 - days.length
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      day: i,
      month: month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false
    })
  }

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map = {}
    tasks.forEach(t => {
      if (!t.dueDate || t.dueDate === 'No') return
      const d = new Date(t.dueDate)
      if (isNaN(d.getTime())) return
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(t)
    })
    return map
  }, [tasks])

  const getStatusColor = (status) => {
    if (status === 'Done') return 'bg-green-100 text-green-700 border-green-200'
    if (status === 'In Progress' || status === 'Review') return 'bg-amber-100 text-amber-700 border-amber-200'
    if (status === 'Blocked') return 'bg-red-100 text-red-700 border-red-200'
    return 'bg-blue-100 text-blue-700 border-blue-200'
  }

  const today = new Date()
  const isToday = (d, m, y) => {
    return d === today.getDate() && m === today.getMonth() && y === today.getFullYear()
  }

  const getDateKey = (cell) => `${cell.year}-${cell.month}-${cell.day}`

  return (
    <div className="bg-white rounded-[20px] shadow-[0_8px_24px_rgba(91,33,182,0.08)] border border-[#E5E7EB] overflow-hidden flex flex-col min-h-[450px] md:min-h-[700px] h-auto md:h-[calc(100vh-280px)]">
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#E5E7EB]">
        <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full">
          <button 
            onClick={goToToday}
            className="px-3 md:px-4 py-1.5 border border-[#E5E7EB] rounded-md text-[12px] md:text-[13px] font-semibold text-[#4B5563] hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
          >
            Today
          </button>
          
          <div className="relative shrink-0" ref={monthDropdownRef}>
            <button 
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              className="flex items-center gap-1 px-3 md:px-4 py-1.5 border border-[#E5E7EB] rounded-md text-[12px] md:text-[13px] font-semibold text-[#4B5563] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="truncate max-w-[80px] sm:max-w-none">{months[month]}</span>
              <span className="material-symbols-outlined text-[16px]">{showMonthDropdown ? 'expand_less' : 'expand_more'}</span>
            </button>
            
            {showMonthDropdown && (
              <div className="absolute top-full left-0 mt-2 w-40 bg-white border border-[#E5E7EB] rounded-md shadow-lg z-50 overflow-hidden animate-fade-in-up">
                {months.map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => {
                      setCurrentDate(new Date(year, idx, 1))
                      setShowMonthDropdown(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-[13px] font-medium transition-colors ${
                      idx === month 
                        ? 'bg-[#F5F3FF] text-[#702c91]' 
                        : 'text-[#4B5563] hover:bg-gray-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#6B7280] transition-colors cursor-pointer border-none bg-transparent">
              <span className="material-symbols-outlined text-[18px] md:text-[20px]">chevron_left</span>
            </button>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#6B7280] transition-colors cursor-pointer border-none bg-transparent">
              <span className="material-symbols-outlined text-[18px] md:text-[20px]">chevron_right</span>
            </button>
          </div>
          
          <h2 className="text-[16px] md:text-[18px] font-bold text-[#1E1B2E] m-0 ml-1 md:ml-2 whitespace-nowrap">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}
          </h2>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => {
            const shortDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]
            return (
              <div key={day} className="py-2 text-center text-[10px] md:text-[12px] font-bold text-[#6B7280] border-r border-[#E5E7EB] last:border-r-0 truncate">
                <span className="hidden md:inline">{day}</span>
                <span className="md:hidden">{shortDay}</span>
              </div>
            )
          })}
        </div>

        {/* Days grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr min-h-0">
          {days.map((cell, idx) => {
            const dateKey = getDateKey(cell)
            const dayTasks = tasksByDate[dateKey] || []
            const currentIsToday = isToday(cell.day, cell.month, cell.year)
            const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS)
            const extraCount = dayTasks.length - MAX_VISIBLE_TASKS
            const isPopupOpen = popupDay === dateKey

            return (
              <div 
                key={idx} 
                className={`relative border-r border-b border-[#E5E7EB] p-0.5 md:p-1.5 flex flex-col min-h-[60px] md:min-h-[90px] group ${!cell.isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'} ${currentIsToday ? 'bg-purple-50/30' : ''}`}
              >
                {/* Date Number at top-left */}
                <div className={`shrink-0 text-[10px] md:text-[13px] font-medium mb-0.5 md:mb-1 ${!cell.isCurrentMonth ? 'text-[#D1D5DB]' : currentIsToday ? 'text-white bg-[#702c91] w-4 h-4 md:w-6 md:h-6 rounded-full flex items-center justify-center' : 'text-[#6B7280]'}`}>
                  {cell.day}
                </div>

                {/* Task chips */}
                <div className="flex-1 flex flex-col gap-0.5 md:gap-1 min-h-0">
                  {visibleTasks.map((t, i) => (
                    <div 
                      key={i}
                      onClick={() => navigate(`/tasks/${t.id}`)}
                      className={`px-1 md:px-1.5 py-0.5 md:py-1 text-[8px] md:text-[10px] font-bold rounded-sm md:rounded-md border cursor-pointer hover:shadow-sm transition-all truncate ${getStatusColor(t.status)}`}
                      title={`${t.title} (${t.status})`}
                    >
                      <div className="truncate leading-tight">{t.title}</div>
                    </div>
                  ))}
                  {extraCount > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPopupDay(isPopupOpen ? null : dateKey) }}
                      className="text-[9px] md:text-[11px] font-bold text-[#702c91] hover:text-[#5a2374] text-left px-1 py-0.5 rounded transition-colors cursor-pointer border-none bg-transparent"
                    >
                      +{extraCount} more
                    </button>
                  )}
                </div>

                {/* Popup overlay */}
                {isPopupOpen && (
                  <div
                    ref={popupRef}
                    className="absolute z-50 top-full left-0 mt-1 w-56 bg-white border border-[#E5E7EB] rounded-lg shadow-xl p-2 max-h-48 overflow-y-auto"
                    style={{ minWidth: 200 }}
                  >
                    <div className="text-[10px] font-bold text-[#6B7280] mb-1.5 px-1">
                      {dayTasks.length} tasks on {months[cell.month]} {cell.day}
                    </div>
                    {dayTasks.map((t, i) => (
                      <div
                        key={i}
                        onClick={() => { navigate(`/tasks/${t.id}`); setPopupDay(null) }}
                        className={`px-2 py-1.5 text-[11px] font-bold rounded-md border cursor-pointer hover:shadow-sm transition-all mb-1 last:mb-0 ${getStatusColor(t.status)}`}
                        title={`${t.title} (${t.status})`}
                      >
                        <div className="leading-tight">{t.title}</div>
                        <div className="text-[9px] font-normal text-gray-500 mt-0.5">{t.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
