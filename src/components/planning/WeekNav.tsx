'use client'

import { useAppStore } from '@/store/store'
import { getAdjacentWeek } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekLabel(weekId: string): string {
  const match = weekId.match(/^(\d{4})-W(\d{1,2})$/)
  if (!match) return weekId

  const year = parseInt(match[1], 10)
  const week = parseInt(match[2], 10)

  // ISO week 1 Monday: Jan 4 is always in week 1 (ISO 8601)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const weekOneMon = new Date(jan4)
  weekOneMon.setUTCDate(jan4.getUTCDate() - (dow - 1))

  // Monday of target week
  weekOneMon.setUTCDate(weekOneMon.getUTCDate() + (week - 1) * 7)

  return (
    'Semaine du ' +
    weekOneMon.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    })
  )
}

// Computed once at module load — today's ISO weekId for "dim forward" comparison
const TODAY_WEEK_ID = (() => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const weekOneMon = new Date(jan4)
  weekOneMon.setUTCDate(jan4.getUTCDate() - (dow - 1))
  const days = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      weekOneMon.getTime()) /
      86_400_000,
  )
  const weekNum = Math.floor(days / 7) + 1
  if (weekNum < 1) return `${year - 1}-W52`
  return `${year}-W${String(weekNum).padStart(2, '0')}`
})()

// ─── Component ────────────────────────────────────────────────────────────────

export function WeekNav() {
  const currentWeek = useAppStore((s) => s.currentWeek)
  const setCurrentWeek = useAppStore((s) => s.setCurrentWeek)

  const isCurrentWeek = currentWeek === TODAY_WEEK_ID

  return (
    <div className="flex items-center justify-between border-b border-warm/40 px-4 py-3">
      <button
        onClick={() => setCurrentWeek(getAdjacentWeek(currentWeek, -1))}
        aria-label="Semaine précédente"
        className="p-1 text-lg text-charcoal/60"
      >
        ‹
      </button>

      <p className="text-sm font-medium text-charcoal">{getWeekLabel(currentWeek)}</p>

      <button
        onClick={() => setCurrentWeek(getAdjacentWeek(currentWeek, 1))}
        aria-label="Semaine suivante"
        disabled={isCurrentWeek}
        className="p-1 text-lg text-charcoal/60 disabled:opacity-30"
      >
        ›
      </button>
    </div>
  )
}
