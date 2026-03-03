'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/store'
import { MealCell } from '@/components/planning/MealCell'
import { SlotSwapSheet } from '@/components/planning/SlotSwapSheet'
import type { DayIndex, MealSlot, MealType } from '@/types/index'

// ─── Constants ────────────────────────────────────────────────────────────────

// Define locally — NOT imported from airtable.ts (server-only file)
const MEAL_TYPE_ORDER: MealType[] = [
  'Petit-déjeuner',
  'Déjeuner Midi',
  'Déjeuner Pique-nique',
  'Dîner',
  'Goûter',
]

const DAY_NAMES_SHORT_FR = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

// 8-column grid: row label (9rem) + 7 day columns (1fr each)
const GRID_COLS = 'grid grid-cols-[9rem_repeat(7,minmax(0,1fr))] gap-2'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDayHeader(weekStart: string, dayIndex: number): string {
  const date = new Date(weekStart + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + dayIndex)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MealGrid() {
  const weekPlan = useAppStore((s) => s.weekPlan)
  const recipes = useAppStore((s) => s.recipes)

  const [tappedSlot, setTappedSlot] = useState<MealSlot | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open)
    if (!open) setTimeout(() => setTappedSlot(null), 350)
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[680px] flex-col gap-2">
        {/* Day column headers */}
        <div className={GRID_COLS}>
          <div /> {/* Empty corner — aligns with row labels */}
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className="py-1 text-center text-xs font-medium capitalize text-charcoal/60"
            >
              {weekPlan ? getDayHeader(weekPlan.weekStart, i) : DAY_NAMES_SHORT_FR[i]}
            </div>
          ))}
        </div>

        {/* Meal-type rows — 5 rows matching MEAL_TYPE_ORDER */}
        {MEAL_TYPE_ORDER.map((mealType) => (
          <div key={mealType} className={GRID_COLS}>
            {/* Row label */}
            <div className="flex items-center pr-2 text-xs text-charcoal/50">{mealType}</div>
            {/* 7 MealCells — one per day */}
            {Array.from({ length: 7 }, (_, dayIndex) => {
              const slot =
                weekPlan?.slots.find(
                  (s) => s.day === (dayIndex as DayIndex) && s.slotType === mealType,
                ) ?? null
              const recipe = slot?.recipeId
                ? recipes.find((r) => r.id === slot.recipeId)
                : undefined
              return (
                <MealCell
                  key={dayIndex}
                  slot={slot}
                  slotType={mealType}
                  isVegetarian={recipe?.isVegetarian ?? false}
                  variant="desktop"
                  onTap={slot ? () => { setTappedSlot(slot); setSheetOpen(true) } : undefined}
                />
              )
            })}
          </div>
        ))}
      </div>

      {tappedSlot && (
        <SlotSwapSheet slot={tappedSlot} open={sheetOpen} onOpenChange={handleSheetOpenChange} />
      )}
    </div>
  )
}
