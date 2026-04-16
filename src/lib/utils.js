/**
 * Shared constants and pure utility functions used across components.
 */

export const RATINGS = [
  { key: 'h', label: '夯',     emoji: '🔥', points: 5 },
  { key: 'd', label: '顶级',   emoji: '⭐', points: 4 },
  { key: 'r', label: '人上人', emoji: '👑', points: 3 },
  { key: 'n', label: 'NPC',    emoji: '🤖', points: 2 },
  { key: 'l', label: '拉完了', emoji: '👎', points: 1 },
]

export function calcScore(votes) {
  let ws = 0, total = 0
  RATINGS.forEach(r => {
    const c = votes?.[r.key] || 0
    ws += r.points * c
    total += c
  })
  return total === 0 ? { score: 0, total } : { score: Math.round(ws / total * 10) / 10, total }
}

/* ── Date helpers ────────────────────────────────── */

export function isToday(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function isYesterday(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  )
}

/**
 * Fix 4: "Last week" now means the previous calendar week (Mon–Sun).
 */
export function isLastWeek(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()

  // Find start of *this* week (Monday 00:00)
  const thisMonday = new Date(now)
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay() // treat Sunday as 7
  thisMonday.setDate(now.getDate() - (dayOfWeek - 1))
  thisMonday.setHours(0, 0, 0, 0)

  // Previous Monday 00:00
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(thisMonday.getDate() - 7)

  return d >= lastMonday && d < thisMonday
}

export function isLastMonth(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return d >= lastMonth && d < thisMonth
}
