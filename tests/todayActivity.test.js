// Verification harness for the "active today" rule.
// Run from the project root:
//   node node_modules\rolldown\bin\cli.mjs tests\todayActivity.test.js -o tmp_ta.mjs -f esm -p node
//   node tmp_ta.mjs
import {
  todayIST,
  todayLabel,
  computeMissingToday,
  isUserActiveToday,
  activeTodayNames,
  isPastReminderStart,
  REMINDER_START_HOUR,
} from '../src/utils/todayActivity'
import { isAdminUser, isExcludedRole, systemRoleOf } from '../src/utils/roles'

let pass = 0
let fail = 0
function check(label, cond, extra = '') {
  if (cond) {
    pass++
    console.log(`  PASS  ${label}`)
  } else {
    fail++
    console.log(`  FAIL  ${label} ${extra}`)
  }
}

const DAY = todayIST()
console.log(`\n== IST day under test: ${DAY} ==\n`)

const employees = [
  { name: 'Asha Rao', email: 'asha@dreamsdesign.in', role: 'Designer', isActive: 'Yes' },
  { name: 'Bhavin Shah', email: 'bhavin@dreamsdesign.in', role: 'Developer', isActive: 'Yes' },
  { name: 'Chirag Mehta', email: 'chirag@dreamsdesign.in', role: 'SEO', isActive: 'Yes' },
  { name: 'Diya Nair', email: 'diya@dreamsdesign.in', role: 'Designer', isActive: 'No' },
]

const mk = (o) => ({
  id: 'T-1', title: 'x', status: 'Pending', assigned: 'Oct 1, 2025',
  assignedDate: 'Oct 1, 2025', assignedBy: 'Someone Else', ...o,
})

console.log('-- (a) missing detection --')
let tasks = [mk({ id: 'T-1', assigned: 'Oct 1, 2025' })]
let missing = computeMissingToday(tasks, employees, DAY).map((e) => e.name)
check('all 3 active employees missing when nothing today', missing.length === 3, JSON.stringify(missing))
check('deactivated employee excluded from roster', !missing.includes('Diya Nair'))
check('missing employee is not active', !isUserActiveToday(tasks, employees[0], DAY))

console.log('\n-- (b) status change counts as activity --')
tasks = [
  mk({ id: 'T-1', assigned: 'Oct 1, 2025', status: 'Done', statusChangedBy: 'Asha Rao', statusChangedAt: `${DAY}T11:15:00+05:30` }),
]
missing = computeMissingToday(tasks, employees, DAY).map((e) => e.name)
check('Asha disappears after a status change', !missing.includes('Asha Rao'), JSON.stringify(missing))
check('others still missing', missing.includes('Bhavin Shah') && missing.includes('Chirag Mehta'))
check('isUserActiveToday true for Asha', isUserActiveToday(tasks, employees[0], DAY))

console.log('\n-- (c) task creation counts as activity --')
tasks = [mk({ id: 'T-2', assignedBy: 'Bhavin Shah', assigned: `${DAY}T09:30:00+05:30` })]
missing = computeMissingToday(tasks, employees, DAY).map((e) => e.name)
check('Bhavin disappears after creating a task', !missing.includes('Bhavin Shah'), JSON.stringify(missing))
check('Asha still missing', missing.includes('Asha Rao'))

console.log('\n-- (d) editing title / comment does NOT count --')
tasks = [
  mk({
    id: 'T-3', assignedBy: 'Chirag Mehta', assigned: 'Oct 1, 2025',
    title: 'Renamed title', comments: [{ id: 1, text: 'a comment' }],
    statusChangedBy: '', statusChangedAt: null,
  }),
]
missing = computeMissingToday(tasks, employees, DAY).map((e) => e.name)
check('title edit alone does not count', missing.includes('Chirag Mehta'), JSON.stringify(missing))
check('comment alone does not count', missing.includes('Chirag Mehta'))
check('Chirag not active', !isUserActiveToday(tasks, employees[2], DAY))

console.log('\n-- (e) privacy: a user only ever resolves their own state --')
tasks = [mk({ id: 'T-4', assignedBy: 'Asha Rao', assigned: `${DAY}T09:00:00+05:30` })]
const ashaActive = isUserActiveToday(tasks, employees[0], DAY)
const bhavinActive = isUserActiveToday(tasks, employees[1], DAY)
const activeNames = [...activeTodayNames(tasks, DAY)]
check('Asha active', ashaActive === true)
check('Bhavin not active', bhavinActive === false)
check('active name set contains only creators/changers', activeNames.every((n) => ['asha rao', 'bhavin shah', 'chirag mehta'].includes(n)))
check('no unrelated names leak into active set', activeNames.length === 1, JSON.stringify(activeNames))

console.log('\n-- (f) IST day boundary --')
const midnightIst = `${DAY}T00:30:00+05:30`
tasks = [mk({ id: 'T-5', assignedBy: 'Asha Rao', assigned: midnightIst })]
check('activity at 00:30 IST counts for the new IST day', isUserActiveToday(tasks, employees[0], DAY))
const prevDay = new Date(new Date(`${DAY}T00:30:00+05:30`).getTime() - 60 * 60 * 1000)
const prevDayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(prevDay)
check('same activity belongs to the previous IST day', !isUserActiveToday(tasks, employees[0], prevDayStr))
// A UTC timestamp of 2026-10-21T18:30Z == 2026-10-22T00:00 IST -> must count for DAY
const utcBoundary = new Date(`${DAY}T00:00:00+05:30`).toISOString()
check('ISO/UTC storage still maps to the IST day', isUserActiveToday([mk({ id: 'T-6', assignedBy: 'Asha Rao', assigned: utcBoundary })], employees[0], DAY))

console.log('\n-- roles --')
check('admin excluded from user banner', isAdminUser({ systemRole: 'Admin' }) === true)
check('admin excluded via isExcludedRole', isExcludedRole({ systemRole: 'Admin' }) === true)
check('Manager excluded', isExcludedRole({ systemRole: 'Manager' }) === true)
check('Accountant excluded', isExcludedRole({ systemRole: 'Accountant' }) === true)
check('Employee eligible', isExcludedRole({ systemRole: 'Employee' }) === false)
check('systemRoleOf falls back to role', systemRoleOf({ role: 'HR' }) === 'HR')
check('systemRoleOf default', systemRoleOf({}) === 'Employee')

console.log('\n-- reminder start hour --')
console.log(`  REMINDER_START_HOUR = ${REMINDER_START_HOUR}, isPastReminderStart() = ${isPastReminderStart()} (current IST hour)`)
check('reminder gate is a function of the current IST hour', typeof isPastReminderStart() === 'boolean')

console.log('\n-- label --')
console.log(`  todayLabel() = "${todayLabel()}"`)
check('label matches "Today, DD MMM"', /^Today, \d{2} [A-Z][a-z]{2}$/.test(todayLabel()), todayLabel())

console.log(`\n===== ${pass} passed, ${fail} failed =====\n`)
globalThis.process?.exit?.(fail === 0 ? 0 : 1)
