'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useAppStore } from '@/store/store'
import { getCurrentWeekId, computeWeekDelta } from '@/lib/utils'
import { WeekNav } from '@/components/planning/WeekNav'
import { MealGrid } from '@/components/planning/MealGrid'
import { ErrorBanner } from '@/components/planning/ErrorBanner'
import { RecipeLibrary } from '@/components/library/RecipeLibrary'
import { RecipeCard } from '@/components/library/RecipeCard'
import { ShoppingPanel } from '@/components/ShoppingPanel'
import { CopyFAB } from '@/components/CopyFAB'
import type { DayIndex, MealSlot, MealType, Recipe } from '@/types/index'

const QuickAddDrawer = dynamic(
  () => import('@/components/recipe-form/QuickAddDrawer').then((m) => ({ default: m.QuickAddDrawer })),
  { ssr: false }
)

function LoadingSkeleton() {
  return (
    <div className="p-4">
      {Array.from({ length: 5 }, (_, rowIdx) => (
        <div key={rowIdx} className="mb-2 grid grid-cols-[9rem_repeat(7,minmax(0,1fr))] gap-2">
          <div className="h-[76px] animate-pulse rounded bg-warm/60" />
          {Array.from({ length: 7 }, (_, colIdx) => (
            <div key={colIdx} className="h-[76px] animate-pulse rounded bg-warm" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Timeout Helper ───────────────────────────────────────────────────────────
// Prevents hung API requests from blocking UI indefinitely
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DesktopPlanningView() {
  const [error, setError] = useState(false)
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null)

  // Mouse sensor only — no TouchSensor, so touch events fall through to tap-to-replace (Epic 2)
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 8 } })
  const sensors = useSensors(mouseSensor)

  const currentWeek = useAppStore((s) => s.currentWeek)
  const isLoadingPlan = useAppStore((s) => s.isLoadingPlan)
  const isDuplicating = useAppStore((s) => s.isDuplicating)

  const isPastWeek = computeWeekDelta(currentWeek, getCurrentWeekId()) < 0

  // AC2: Extract grid drag handler (Story 3.7)
  async function handleGridDrag(
    event: DragEndEvent,
    slot: MealSlot,
    targetSlot: MealSlot | null
  ): Promise<void> {
    const { updateSlot, weekPlan } = useAppStore.getState()
    if (!weekPlan) return

    // Save previous state for rollback
    const sourceSlotPrev = weekPlan.slots.find((s) => s.id === slot.id)
    const targetSlotPrev = targetSlot ? weekPlan.slots.find((s) => s.id === targetSlot.id) : null

    // Find source recipe details
    const sourceRecipeId = slot.recipeId
    const sourceRecipeName = slot.recipeName
    const sourceNotes = slot.notes

    try {
      if (!targetSlot || !targetSlot.recipeId) {
        if (!targetSlot) {
          // ── CREATE: target cell has no Airtable record — use PUT to create it ──
          const overData = event.over?.data.current
          const targetMealType = overData?.mealType as MealType
          const targetDayIndex = overData?.dayIndex as number

          // Compute the date for this dayIndex from weekStart
          const mondayDate = new Date(weekPlan.weekStart + 'T00:00:00Z')
          const slotDate = new Date(mondayDate)
          slotDate.setUTCDate(mondayDate.getUTCDate() + targetDayIndex)
          const dateStr = slotDate.toISOString().slice(0, 10)

          // Optimistic: clear source slot
          updateSlot(slot.id, null, null)

          const [clearRes, createRes] = await withTimeout(
            Promise.all([
              fetch('/api/planning', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slotId: slot.id, recipeId: null }),
              }),
              fetch('/api/planning', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  date: dateStr,
                  dayIndex: targetDayIndex,
                  mealType: targetMealType,
                  recipeId: sourceRecipeId,
                }),
              }),
            ]),
            5000
          )

          if (!clearRes.ok || !createRes.ok) {
            throw new Error(`HTTP ${!clearRes.ok ? clearRes.status : createRes.status}`)
          }

          const created = await createRes.json() as { id: string }
          const newSlot: MealSlot = {
            id: created.id,
            date: dateStr,
            day: targetDayIndex as DayIndex,
            slotType: targetMealType,
            recipeId: sourceRecipeId,
            recipeName: sourceRecipeName,
            notes: sourceNotes,
          }
          const current = useAppStore.getState().weekPlan
          if (current) {
            useAppStore.getState().setWeekPlan({ ...current, slots: [...current.slots, newSlot] })
          }
          return
        }

        // ── MOVE: target has an Airtable record but is empty (no recipe) ──
        updateSlot(slot.id, null, null)
        updateSlot(targetSlot.id, sourceRecipeId, sourceRecipeName)

        const [moveRes1, moveRes2] = await withTimeout(
          Promise.all([
            fetch('/api/planning', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slotId: slot.id, recipeId: null }),
            }),
            fetch('/api/planning', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                slotId: targetSlot.id,
                recipeId: sourceRecipeId,
                ...(sourceNotes && { notes: sourceNotes }),
              }),
            }),
          ]),
          5000
        )

        if (!moveRes1.ok || !moveRes2.ok) {
          throw new Error(`HTTP ${!moveRes1.ok ? moveRes1.status : moveRes2.status}`)
        }
      } else {
        // ── SWAP: target has a recipe ──
        const targetRecipeId = targetSlot.recipeId
        const targetRecipeName = targetSlot.recipeName
        const targetNotes = targetSlot.notes

        // Optimistic update
        updateSlot(slot.id, targetRecipeId, targetRecipeName)
        updateSlot(targetSlot.id, sourceRecipeId, sourceRecipeName)
        
        // Also update notes
        if (targetNotes) {
          useAppStore.getState().updateSlotNotes(slot.id, targetNotes)
        }
        if (sourceNotes) {
          useAppStore.getState().updateSlotNotes(targetSlot.id, sourceNotes)
        }

        // Parallel PATCH calls
        const [res1, res2] = await withTimeout(
          Promise.all([
            fetch('/api/planning', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                slotId: slot.id,
                recipeId: targetRecipeId,
                ...(targetNotes && { notes: targetNotes }),
              }),
            }),
            fetch('/api/planning', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                slotId: targetSlot.id,
                recipeId: sourceRecipeId,
                ...(sourceNotes && { notes: sourceNotes }),
              }),
            }),
          ]),
          5000
        )

        if (!res1.ok || !res2.ok) {
          throw new Error(`HTTP ${!res1.ok ? res1.status : res2.status}`)
        }
      }
    } catch {
      // Rollback both slots
      if (sourceSlotPrev) {
        updateSlot(slot.id, sourceSlotPrev.recipeId, sourceSlotPrev.recipeName)
        useAppStore.getState().updateSlotNotes(slot.id, sourceSlotPrev.notes)
      }
      if (targetSlot && targetSlotPrev) {
        updateSlot(targetSlot.id, targetSlotPrev.recipeId, targetSlotPrev.recipeName)
        useAppStore.getState().updateSlotNotes(targetSlot.id, targetSlotPrev.notes)
      }
      toast.error('Impossible de sauvegarder. Réessayez.')
    }
  }

  // AC3: Extract library drag handler (Story 3.7)
  async function handleLibraryDrag(
    recipe: Recipe,
    targetSlot: MealSlot | null,
    mealType: MealType,
    dayIndex: number
  ): Promise<void> {
    if (targetSlot) {
      // ── Existing slot: optimistic PATCH ──
      const { updateSlot, weekPlan } = useAppStore.getState()
      const currentSlot = weekPlan?.slots.find((s) => s.id === targetSlot.id)
      const prevRecipeId = currentSlot?.recipeId ?? null
      const prevRecipeName = currentSlot?.recipeName ?? null

      updateSlot(targetSlot.id, recipe.id, recipe.name)

      try {
        const res = await fetch('/api/planning', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slotId: targetSlot.id, recipeId: recipe.id }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch {
        useAppStore.getState().updateSlot(targetSlot.id, prevRecipeId, prevRecipeName)
        toast.error('Impossible de sauvegarder. Réessayez.')
      }
    } else {
      // ── No slot row in Airtable: create one ──
      const { weekPlan, setWeekPlan } = useAppStore.getState()
      if (!weekPlan) return

      // Compute the date for this dayIndex from weekStart
      const mondayDate = new Date(weekPlan.weekStart + 'T00:00:00Z')
      const slotDate = new Date(mondayDate)
      slotDate.setUTCDate(mondayDate.getUTCDate() + dayIndex)
      const dateStr = slotDate.toISOString().slice(0, 10)

      try {
        const res = await fetch('/api/planning', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateStr,
            dayIndex,
            mealType,
            recipeId: recipe.id,
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const created = (await res.json()) as { id: string }

        // Add the new slot to the store
        const newSlot = {
          id: created.id,
          date: dateStr,
          day: dayIndex as DayIndex,
          slotType: mealType,
          recipeId: recipe.id,
          recipeName: recipe.name,
          notes: null,
        }
        setWeekPlan({ ...weekPlan, slots: [...weekPlan.slots, newSlot] })
      } catch {
        toast.error('Impossible de créer le créneau. Réessayez.')
      }
    }
  }

  function handleDragStart(event: DragStartEvent) {
    if (isPastWeek) return
    const recipe = event.active.data.current?.recipe as Recipe | undefined
    const slot = event.active.data.current?.slot as MealSlot | undefined
    
    // For library drags, set activeRecipe from recipe data
    if (recipe) {
      setActiveRecipe(recipe)
    }
    // For grid drags, extract recipe from slot data
    else if (slot && slot.recipeId) {
      // We'll need to find the recipe from the store
      const recipes = useAppStore.getState().recipes
      const foundRecipe = recipes.find((r) => r.id === slot.recipeId)
      if (foundRecipe) {
        setActiveRecipe(foundRecipe)
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveRecipe(null)
    
    const source = event.active.data.current?.source
    const isGridDrag = source === 'grid'
    const recipe = event.active.data.current?.recipe as Recipe | undefined
    const slot = event.active.data.current?.slot as MealSlot | undefined
    const overData = event.over?.data.current
    
    if (!overData) return

    const targetSlot = overData.slot as MealSlot | null
    const mealType = overData.mealType as MealType
    const dayIndex = overData.dayIndex as number

    // Dispatch to appropriate handler
    if (isGridDrag && slot && slot.recipeId) {
      await handleGridDrag(event, slot, targetSlot)
      return
    }

    // ── Library-to-Grid Drag (Story 3.3) ──
    if (!recipe || !overData) return
    await handleLibraryDrag(recipe, targetSlot, mealType, dayIndex)
  }

  async function handleDuplicate() {
    const result = await useAppStore.getState().duplicateLastWeek()
    if (result === 'empty') toast.info('Aucun plan trouvé pour la semaine précédente')
    if (result === 'error') toast.error('Impossible de dupliquer le plan. Réessayez.')
  }

  useEffect(() => {
    let cancelled = false
    const { setWeekPlan, setLoadingPlan, setRecipes, setLoadingRecipes, setIngredients } = useAppStore.getState()

    const load = async () => {
      setError(false)
      setLoadingPlan(true)
      setLoadingRecipes(true)
      try {
        const [planRes, recipesRes, ingredientsRes] = await Promise.all([
          fetch(`/api/planning?week=${currentWeek}`),
          fetch('/api/recipes'),
          fetch('/api/ingredients'),
        ])
        if (!planRes.ok || !recipesRes.ok || !ingredientsRes.ok) throw new Error('Fetch failed')
        const [weekPlan, recipes, ingredients] = await Promise.all([
          planRes.json(),
          recipesRes.json(),
          ingredientsRes.json(),
        ])
        if (!cancelled) {
          setWeekPlan(weekPlan)
          setRecipes(recipes)
          setIngredients(ingredients)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) {
          setLoadingPlan(false)
          setLoadingRecipes(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [currentWeek]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex min-h-screen">
        {/* Left: Recipe library sidebar */}
        <aside className="w-60 flex-none border-r border-warm/40 bg-warm">
          <RecipeLibrary />
        </aside>

        {/* Center: Main content */}
        <section className="flex flex-1 flex-col overflow-y-auto">
          {/* AC6: non-blocking — error banner renders above content, never replaces it */}
          {error && <ErrorBanner />}
          {isLoadingPlan ? (
            <LoadingSkeleton />
          ) : (
            <>
              <WeekNav />
              {!isPastWeek && (
                <div className="flex items-center justify-end border-b border-warm/40 px-4 py-2">
                  <button
                    onClick={handleDuplicate}
                    disabled={isDuplicating || isLoadingPlan}
                    className="rounded-md bg-sage px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {isDuplicating ? 'Duplication…' : 'Dupliquer la semaine précédente'}
                  </button>
                </div>
              )}
              <div className="flex-1 p-4">
                <MealGrid readOnly={isPastWeek} />
              </div>
            </>
          )}
        </section>

        {/* Right: Shopping panel — Epic 4 */}
        <aside className="w-[280px] flex-none border-l border-warm/40 bg-cream p-4">
          <ShoppingPanel />
        </aside>
      </div>

      {/* Copy FAB — persistent button to copy shopping list */}
      <CopyFAB />

      {/* Quick-Add Drawer — lazy-loaded slide-in panel for recipe creation (desktop only) */}
      <QuickAddDrawer />

      {/* Drag overlay — renders in a portal above all content */}
      <DragOverlay>
        {activeRecipe && (
          <div className="w-52 opacity-95 shadow-lg">
            <RecipeCard recipe={activeRecipe} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
