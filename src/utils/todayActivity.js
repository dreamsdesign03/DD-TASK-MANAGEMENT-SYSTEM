import { taskDateToISO } from './taskStats'

const TZ = 'Asia/Kolkata'

// Today's calendar day in IST as YYYY-MM-DD
export function todayIST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

// "Today, 21 Oct"
export function todayLabel() {
  const label = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short' }).format(new Date())
  return `Today, ${label}`
}

// Active employees = roster everyone must belong to. isActive 'No' is excluded.
export function activeRoster(employees) {
  return (employees || [])
    .filter((e) => String(e?.isActive ?? 'Yes').trim().toLowerCase() !== 'no')
    .map((e) => ({ name: (e.name || '').trim(), email: (e.email || '').trim().toLowerCase() }))
    .filter((e) => e.name)
}

// Lowercased names of everyone who created at least one task on `day` (IST).
// Task creator = `assignedBy`; creation date = `assigned` (fallback `assignedDate`).
export function creatorsToday(tasks, day) {
  const set = new Set()
  for (const t of tasks || []) {
    if (taskDateToISO(t?.assigned || t?.assignedDate) !== day) continue
    const creator = (t?.assignedBy || '').trim().toLowerCase()
    if (creator) set.add(creator)
  }
  return set
}

// Active employees who have NOT created any task on `day` (IST).
export function computeMissingToday(tasks, employees, day) {
  const created = creatorsToday(tasks, day)
  return activeRoster(employees).filter(
    (e) => !created.has(e.name.toLowerCase()) && !(e.email && created.has(e.email))
  )
}
