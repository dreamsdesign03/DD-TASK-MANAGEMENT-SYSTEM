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
