'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { cn, getDateStrFromWeekStart } from '@/lib/utils'
import { useAppStore } from '@/store/store'
import { MealCell } from '@/components/planning/MealCell'
import { DraggableMealCell } from '@/components/planning/DraggableMealCell'
import { SlotSwapSheet } from '@/components/planning/SlotSwapSheet'
import type { DayIndex, MealSlot, MealType } from '@/types/index'

// ─── Droppable Cell Wrapper ────────────────────────────────────────────────────

interface DroppableCellProps {
  id: string
  slot: MealSlot | null
  mealType: MealType
  dayIndex: number
  children: React.ReactNode
}

function DroppableCell({ id, slot, mealType, dayIndex, children }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { slot, mealType, dayIndex },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn('rounded', isOver && 'ring-2 ring-sage')}
    >
      {children}
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Define locally — NOT imported from airtable.ts (server-only file)
const MEAL_TYPE_ORDER: MealType[] = [
  'Petit-déjeuner',
  'Déjeuner Midi',
  'Déjeuner Pique-nique',
  'Goûter',
  'Dîner',
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

interface MealGridProps {
  /** When true, drag-and-drop and slot editing are disabled (past week read-only mode) */
  readOnly?: boolean
}

export function MealGrid({ readOnly = false }: MealGridProps) {
  const weekPlan = useAppStore((s) => s.weekPlan)
  const recipes = useAppStore((s) => s.recipes)

  const [tappedSlot, setTappedSlot] = useState<MealSlot | null>(null)
  const [createContext, setCreateContext] = useState<{ date: string; day: DayIndex; slotType: MealType } | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open)
    if (!open) setTimeout(() => { setTappedSlot(null); setCreateContext(null) }, 350)
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
              // Fallback: si Airtable n'a pas renvoyé recipeName, on le lit depuis le store recipes
              const displaySlot = slot && recipe && !slot.recipeName
                ? { ...slot, recipeName: recipe.name }
                : slot
              const hasRecipe = displaySlot && displaySlot.recipeId
              // Read-only mode (past week): skip dnd-kit wrappers entirely to avoid DndContext dependency
              if (readOnly) {
                return (
                  <div key={dayIndex} className="rounded">
                    <MealCell
                      slot={displaySlot}
                      slotType={mealType}
                      isVegetarian={recipe?.isVegetarian ?? false}
                      variant="desktop"
                      readOnly
                    />
                  </div>
                )
              }

              return (
                <DroppableCell
                  key={dayIndex}
                  id={`cell-${dayIndex}-${mealType}`}
                  slot={displaySlot}
                  mealType={mealType}
                  dayIndex={dayIndex}
                >
                  {hasRecipe && displaySlot ? (
                    <DraggableMealCell
                      slot={displaySlot}
                      slotType={mealType}
                      isVegetarian={recipe?.isVegetarian ?? false}
                      variant="desktop"
                      onTap={() => { setTappedSlot(displaySlot); setCreateContext(null); setSheetOpen(true) }}
                    />
                  ) : (
                    <MealCell
                      slot={displaySlot}
                      slotType={mealType}
                      isVegetarian={recipe?.isVegetarian ?? false}
                      variant="desktop"
                      onTap={
                        displaySlot
                          ? () => { setTappedSlot(displaySlot); setCreateContext(null); setSheetOpen(true) }
                          : weekPlan
                          ? () => {
                              setTappedSlot(null)
                              setCreateContext({ date: getDateStrFromWeekStart(weekPlan.weekStart, dayIndex), day: dayIndex as DayIndex, slotType: mealType })
                              setSheetOpen(true)
                            }
                          : undefined
                      }
                    />
                  )}
                </DroppableCell>
              )
            })}
          </div>
        ))}
      </div>

      {(tappedSlot || createContext) && (
        <SlotSwapSheet
          slot={tappedSlot}
          slotType={tappedSlot?.slotType ?? createContext!.slotType}
          slotContext={createContext ?? undefined}
          open={sheetOpen}
          onOpenChange={handleSheetOpenChange}
        />
      )}
    </div>
  )
}
