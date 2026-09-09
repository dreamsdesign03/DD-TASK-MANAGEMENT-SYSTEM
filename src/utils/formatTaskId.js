/**
 * Helper utility to format Task IDs cleanly.
 * Preserves the actual task ID value (e.g. T-0001, T-0042) while cleaning up prefixes or scientific notation.
 */
export function formatTaskId(id) {
  if (!id) return ''
  let str = String(id).trim()

  // Convert #DD- prefix to T- if present
  if (str.toUpperCase().startsWith('#DD-')) {
    str = 'T-' + str.slice(4)
  }

  // Handle scientific notation e.g. T-1.5153779060281494e+26623854 or 1.5153779060281494e+26
  if (str.includes('e+') || str.includes('E+')) {
    const parts = str.split(/e\+/i)
    if (parts[1]) {
      const suffix = parts[1].replace(/\D/g, '')
      str = `T-${suffix || '0001'}`
    } else {
      str = 'T-' + str.replace(/\D/g, '').slice(-4)
    }
  }

  return str
}

/**
 * Normalizes a task ID string into a unified comparison key (e.g. "T-26" for T-0026, T-26, 26, #DD-T-0026)
 */
export function normalizeTaskIdKey(id) {
  if (!id) return ''
  const str = formatTaskId(id).trim()
  if (!str) return ''
  const numMatch = str.match(/^(?:#DD-)?T-?0*(\d+)$/i)
  if (numMatch && numMatch[1]) {
    return `T-${numMatch[1]}`
  }
  return str.toLowerCase()
}

/**
 * Checks if two Task IDs refer to the same task.
 */
export function isSameTaskId(id1, id2) {
  if (!id1 || !id2) return false
  if (id1 === id2) return true
  return normalizeTaskIdKey(id1) === normalizeTaskIdKey(id2)
}

/**
 * Deduplicates an array of tasks by normalized Task ID key.
 */
export function deduplicateTasks(taskList) {
  if (!Array.isArray(taskList)) return []
  const map = new Map()
  taskList.forEach(t => {
    if (!t) return
    const key = t.id ? normalizeTaskIdKey(t.id) : null
    if (key) {
      if (!map.has(key)) {
        map.set(key, t)
      } else {
        const existing = map.get(key)
        map.set(key, { ...t, ...existing })
      }
    }
  })
  return Array.from(map.values())
}

