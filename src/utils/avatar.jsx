export const AVATAR_COLORS = [
  '#f56565', // red-500
  '#ed8936', // orange-500
  '#d69e2e', // yellow-600
  '#48bb78', // green-500
  '#38b2ac', // teal-500
  '#4299e1', // blue-500
  '#667eea', // indigo-500
  '#9f7aea', // purple-500
  '#ed64a6', // pink-500
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#d946ef', // fuchsia-500
  '#f43f5e', // rose-500
]

export function getUserColor(name, email) {
  const key = email ? `${name}:${email}` : name
  if (!key) return '#702c91'
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash)
  }
  hash = Math.abs(hash)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function getInitials(name) {
  if (!name) return '?'
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return '?'
}

export function renderAvatar(avatar, name, sizeClass = "w-10 h-10 rounded-full", textClass = "text-[13px]", email) {
  const isValidImage = avatar &&
    (avatar.startsWith('http') || avatar.startsWith('/') || avatar.startsWith('data:')) &&
    !avatar.includes('dicebear.com')

  if (isValidImage) {
    return (
      <img
        src={avatar}
        alt={name || '?'}
        className={`${sizeClass} object-cover flex-shrink-0`}
      />
    )
  }

  const initials = getInitials(name)
  const bgColor = getUserColor(name, email)

  return (
    <div
      className={`${sizeClass} flex items-center justify-center text-white font-bold flex-shrink-0 ${textClass}`}
      style={{ backgroundColor: bgColor }}
      title={name}
    >
      {initials}
    </div>
  )
}
