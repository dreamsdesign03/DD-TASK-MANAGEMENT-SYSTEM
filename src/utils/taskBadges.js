// Shared badge style maps so the Tasks table and the Admin Board render
// priority/status uniformly. Colors must stay in sync with the list view.

export const PRIORITY_STYLES = {
  Urgent: 'bg-[#E74C3C] text-white',
  High: 'bg-[#F39C12] text-white',
  Medium: 'bg-[#3498DB] text-white',
  Low: 'bg-[#95A5A6] text-white',
}

export const STATUS_STYLES = {
  Blocked: 'bg-red-100 text-red-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Review: 'bg-blue-100 text-blue-700',
  Done: 'bg-green-100 text-green-700',
  Pending: 'bg-gray-100 text-gray-700',
}
