'use client'

import { useRef } from 'react'
import { useAppStore } from '@/store/store'
import { MealCell } from '@/components/planning/MealCell'
import { cn } from '@/lib/utils'
import type { DayIndex, MealType } from '@/types/index'

// ─── Constants ────────────────────────────────────────────────────────────────

// Defined locally — airtable.ts is server-only and cannot be imported here
const MEAL_TYPE_ORDER: MealType[] = [
  'Petit-déjeuner',
  'Déjeuner Midi',
  'Déjeuner Pique-nique',
  'Dîner',
  'Goûter',
]

const SWIPE_THRESHOLD = 40 // px

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDayLabel(weekStart: string, dayIndex: number): string {
  const date = new Date(weekStart + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + dayIndex)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

function getTodayIndex(): number {
  const dow = new Date().getUTCDay() // 0=Sun … 6=Sat
  return dow === 0 ? 6 : dow - 1 // 0=Mon … 6=Sun
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DaySwipeView() {
  const weekPlan = useAppStore((s) => s.weekPlan)
  const selectedDay = useAppStore((s) => s.selectedDay)
  const recipes = useAppStore((s) => s.recipes)
  const setSelectedDay = useAppStore((s) => s.setSelectedDay)

  const touchStartX = useRef<number>(0)
  const today = getTodayIndex()

  // Build slot list for selected day in display order
  const daySlots = MEAL_TYPE_ORDER.map((mealType) => ({
    mealType,
    slot: weekPlan?.slots.find((s) => s.day === selectedDay && s.slotType === mealType) ?? null,
  }))

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (deltaX > SWIPE_THRESHOLD && selectedDay > 0) {
      setSelectedDay((selectedDay - 1) as DayIndex)
    } else if (deltaX < -SWIPE_THRESHOLD && selectedDay < 6) {
      setSelectedDay((selectedDay + 1) as DayIndex)
    }
  }

  const dayLabel = weekPlan ? getDayLabel(weekPlan.weekStart, selectedDay) : ''

  return (
    <div
      className="flex flex-col px-4 pb-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Day header: prev chevron | day label + dots | next chevron */}
      <div className="flex items-center justify-between py-3">
        <button
          onClick={() => selectedDay > 0 && setSelectedDay((selectedDay - 1) as DayIndex)}
          aria-label="Jour précédent"
          disabled={selectedDay === 0}
          className="p-2 text-lg text-charcoal/60 disabled:opacity-30"
        >
          ‹
        </button>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium capitalize text-charcoal">{dayLabel}</p>

          {/* Day indicator dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: 7 }, (_, i) => {
              const isToday = i === today
              const isPast = i < today
              const isSelected = i === selectedDay
              return (
                <span
                  key={i}
                  aria-current={isToday ? 'date' : undefined}
                  className={cn(
                    'h-2 w-2 rounded-full',
                    isToday && 'bg-terracotta',
                    isPast && !isSelected && 'bg-charcoal/30',
                    !isToday && !isPast && 'border border-charcoal/40 bg-cream',
                    isSelected && !isToday && 'bg-charcoal',
                  )}
                />
              )
            })}
          </div>
        </div>

        <button
          onClick={() => selectedDay < 6 && setSelectedDay((selectedDay + 1) as DayIndex)}
          aria-label="Jour suivant"
          disabled={selectedDay === 6}
          className="p-2 text-lg text-charcoal/60 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* Meal cards */}
      <div className="flex flex-col gap-2">
        {daySlots.map(({ mealType, slot }) => {
          const recipe = slot?.recipeId ? recipes.find((r) => r.id === slot.recipeId) : undefined
          const isVegetarian = recipe?.isVegetarian ?? false
          return (
            <MealCell
              key={mealType}
              slot={slot}
              slotType={mealType}
              isVegetarian={isVegetarian}
              variant="mobile"
            />
          )
        })}
      </div>
    </div>
  )
}
