const TZ = 'Asia/Kolkata'

function toDate(date) {
  if (date instanceof Date) return date
  if (date === undefined || date === null) return new Date()
  return new Date(date)
}

export function formatTime(date) {
  return toDate(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

export function formatDateShort(date) {
  return toDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ })
}

export function formatDateLong(date) {
  return toDate(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: TZ })
}

export function formatDateTime(date) {
  return toDate(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

export function formatMonthYear(date) {
  return toDate(date).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: TZ })
}

export function formatMonthYearShort(date) {
  return toDate(date).toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: TZ })
}
