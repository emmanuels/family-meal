'use client'

import { Printer } from 'lucide-react'
import { useAppStore } from '@/store/store'
import { getAdjacentWeek, getCurrentWeekId, computeWeekDelta } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of weeks ahead of today that can be navigated to. */
const MAX_FUTURE_WEEKS = 8

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

// ─── Component ────────────────────────────────────────────────────────────────

export function WeekNav() {
  const currentWeek = useAppStore((s) => s.currentWeek)
  // Use getState() for stable action reference — actions never change, selector subscription is wasteful
  const { setCurrentWeek } = useAppStore.getState()

  const weekDelta = computeWeekDelta(currentWeek, getCurrentWeekId())
  const isPastWeek = weekDelta < 0
  const isAtFutureLimit = weekDelta >= MAX_FUTURE_WEEKS

  return (
    <div className="flex items-center justify-between border-b border-warm/40 px-4 py-3">
      <button
        onClick={() => setCurrentWeek(getAdjacentWeek(currentWeek, -1))}
        aria-label="Semaine précédente"
        className="p-1 text-lg text-charcoal/60"
      >
        ‹
      </button>

      <p className="flex items-center gap-1.5 text-sm font-medium text-charcoal">
        {getWeekLabel(currentWeek)}
        {isPastWeek && (
          <span className="text-xs font-normal text-charcoal/40" aria-label="semaine passée, lecture seule">(passée)</span>
        )}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setCurrentWeek(getAdjacentWeek(currentWeek, 1))}
          aria-label="Semaine suivante"
          disabled={isAtFutureLimit}
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
