/**
 * Helper utility to format Task IDs cleanly (e.g. T-0001)
 * Safely parses and sanitizes scientific notation, raw numbers, or timestamp suffixes.
 */
export function formatTaskId(id) {
  if (!id) return 'T-0000'
  let str = String(id).trim()

  // Replace #DD- or raw prefixes with T-
  str = str.replace(/^#DD-/i, 'T-')

  // Handle scientific notation e.g. T-1.5153779060281494e+26623854 or 1.5153779060281494e+26
  if (str.includes('e+') || str.includes('E+')) {
    const digits = str.replace(/\D/g, '')
    if (digits.length >= 4) {
      str = 'T-' + digits.slice(0, 4)
    } else {
      str = 'T-0001'
    }
    return str
  }

  // Handle standard T- prefix or clean number
  const match = str.match(/^(T-?)(\d+)/i)
  if (match) {
    const numStr = match[2]
    if (numStr.length > 4) {
      const leadingZeroMatch = numStr.match(/^(0+\d{1,3})/)
      if (leadingZeroMatch) {
        str = 'T-' + leadingZeroMatch[1].padStart(4, '0')
      } else {
        str = 'T-' + numStr.slice(0, 4)
      }
    } else {
      str = 'T-' + numStr.padStart(4, '0')
    }
  } else {
    const digitsOnly = str.replace(/\D/g, '')
    if (digitsOnly) {
      str = 'T-' + digitsOnly.slice(0, 4).padStart(4, '0')
    } else {
      str = 'T-' + str
    }
  }

  return str
}
