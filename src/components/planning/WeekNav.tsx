'use client'

import { Printer } from 'lucide-react'
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
  // Use Dec 28 (always in the last ISO week of any year) to handle W52 vs W53 correctly
  if (weekNum < 1) {
    const dec28Prev = new Date(Date.UTC(year - 1, 11, 28))
    const jan4Prev = new Date(Date.UTC(year - 1, 0, 4))
    const dowPrev = jan4Prev.getUTCDay() === 0 ? 7 : jan4Prev.getUTCDay()
    const weekOneMonPrev = new Date(jan4Prev)
    weekOneMonPrev.setUTCDate(jan4Prev.getUTCDate() - (dowPrev - 1))
    const lastWeek =
      Math.floor((dec28Prev.getTime() - weekOneMonPrev.getTime()) / 86_400_000 / 7) + 1
    return `${year - 1}-W${String(lastWeek).padStart(2, '0')}`
  }
  return `${year}-W${String(weekNum).padStart(2, '0')}`
})()

// ─── Component ────────────────────────────────────────────────────────────────

export function WeekNav() {
  const currentWeek = useAppStore((s) => s.currentWeek)
  // Use getState() for stable action reference — actions never change, selector subscription is wasteful
  const { setCurrentWeek } = useAppStore.getState()

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

      <div className="flex items-center gap-1">
        <button
          onClick={() => setCurrentWeek(getAdjacentWeek(currentWeek, 1))}
          aria-label="Semaine suivante"
          disabled={isCurrentWeek}
          className="p-1 text-lg text-charcoal/60 disabled:opacity-30"
        >
          ›
        </button>

        <button
          onClick={() => window.open(`/print?week=${currentWeek}`, '_blank', 'noopener,noreferrer')}
          aria-label="Imprimer le calendrier"
          className="p-1 text-charcoal/60 hover:text-charcoal"
        >
          <Printer size={16} />
        </button>
      </div>
    </div>
  )
}
