const STORAGE_KEY = 'dd_activity_log'

export function getISTNow() {
  const now = new Date()
  const istOffset = 5.5 * 60 * 60 * 1000
  return new Date(now.getTime() + istOffset)
}

export function getISTDate() {
  return getISTNow().toISOString().split('T')[0]
}

export function getISTTime() {
  const d = getISTNow()
  const h = String(d.getUTCHours()).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  const s = String(d.getUTCSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function getISTTimestamp() {
  return Date.now() // Timestamps are universal, no need to offset
}

export function loadActivityLog() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

export function saveActivityLog(log) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
}

export function logLogin(email, name) {
  const log = loadActivityLog()
  const today = getISTDate()
  const nowTime = getISTTime()
  const nowTs = getISTTimestamp()

  const existing = log.find(s => s.email === email && s.date === today && s.status === 'active')
  if (existing) {
    existing.lastHeartbeat = nowTs
    saveActivityLog(log)
    return log
  }

  log.push({
    id: `${email}_${today}_${nowTs}`,
    email,
    name,
    date: today,
    loginTime: nowTime,
    loginTimestamp: nowTs,
    logoutTime: null,
    logoutTimestamp: null,
    status: 'active',
    duration: 0,
    lastHeartbeat: nowTs
  })
  saveActivityLog(log)
  return log
}

export function logLogout(email) {
  const log = loadActivityLog()
  const today = getISTDate()
  const nowTime = getISTTime()
  const nowTs = getISTTimestamp()

  const session = log.find(s => s.email === email && s.date === today && s.status === 'active')
  if (session) {
    session.logoutTime = nowTime
    session.logoutTimestamp = nowTs
    session.status = 'logged_out'
    session.duration = Math.floor((nowTs - session.loginTimestamp) / 1000)
    session.lastHeartbeat = nowTs
    saveActivityLog(log)
  }
  return log
}

export function logShutdown(email) {
  const log = loadActivityLog()
  const today = getISTDate()
  const nowTs = getISTTimestamp()

  const session = log.find(s => s.email === email && s.date === today && s.status === 'active')
  if (session) {
    session.logoutTime = getISTTime()
    session.logoutTimestamp = nowTs
    session.status = 'shutdown'
    session.duration = Math.floor((nowTs - session.loginTimestamp) / 1000)
    session.lastHeartbeat = nowTs
    saveActivityLog(log)
  }
  return log
}

export function updateHeartbeat(email) {
  const log = loadActivityLog()
  const today = getISTDate()
  const nowTs = getISTTimestamp()

  const session = log.find(s => s.email === email && s.date === today && s.status === 'active')
  if (session) {
    session.lastHeartbeat = nowTs
    saveActivityLog(log)
  }
  return log
}

export function getUserActivity(email, month, year) {
  const log = loadActivityLog()
  const monthStr = String(month).padStart(2, '0')
  return log.filter(s =>
    s.email === email &&
    s.date >= `${year}-${monthStr}-01` &&
    s.date <= `${year}-${monthStr}-31`
  )
}

export function getAllUsersMonthlyActivity(month, year) {
  const log = loadActivityLog()
  const monthStr = String(month).padStart(2, '0')
  return log.filter(s =>
    s.date >= `${year}-${monthStr}-01` &&
    s.date <= `${year}-${monthStr}-31`
  )
}

export function getDailyActivityForDate(dateStr) {
  const log = loadActivityLog()
  return log.filter(s => s.date === dateStr)
}

export function getActiveUsers() {
  const log = loadActivityLog()
  const today = getISTDate()
  return log.filter(s => s.date === today && s.status === 'active')
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0h 0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

export function getMonthWorkDays(month, year) {
  const log = loadActivityLog()
  const monthStr = String(month).padStart(2, '0')
  const sessions = log.filter(s =>
    s.date >= `${year}-${monthStr}-01` &&
    s.date <= `${year}-${monthStr}-31`
  )
  const days = [...new Set(sessions.map(s => s.date))]
  return days.sort()
}

export function getAllLoggedUsers() {
  const log = loadActivityLog()
  const userMap = {}
  log.forEach(s => { userMap[s.email] = s.name })
  return Object.entries(userMap).map(([email, name]) => ({ email, name }))
}
