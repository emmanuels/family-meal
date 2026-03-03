'use client'

import { useEffect, useState } from 'react'
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
import { WeekNav } from '@/components/planning/WeekNav'
import { MealGrid } from '@/components/planning/MealGrid'
import { ErrorBanner } from '@/components/planning/ErrorBanner'
import { RecipeLibrary } from '@/components/library/RecipeLibrary'
import { RecipeCard } from '@/components/library/RecipeCard'
import type { MealSlot, Recipe } from '@/types/index'

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

  function handleDragStart(event: DragStartEvent) {
    const recipe = event.active.data.current?.recipe as Recipe | undefined
    setActiveRecipe(recipe ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveRecipe(null)
    const recipe = event.active.data.current?.recipe as Recipe | undefined
    const slot = event.over?.data.current?.slot as MealSlot | undefined
    if (!recipe || !slot) return

    const { updateSlot, weekPlan } = useAppStore.getState()
    const currentSlot = weekPlan?.slots.find((s) => s.id === slot.id)
    const prevRecipeId = currentSlot?.recipeId ?? null
    const prevRecipeName = currentSlot?.recipeName ?? null

    // Optimistic update
    updateSlot(slot.id, recipe.id, recipe.name)

    // Background Airtable write
    try {
      const res = await fetch('/api/planning', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: slot.id, recipeId: recipe.id }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      useAppStore.getState().updateSlot(slot.id, prevRecipeId, prevRecipeName)
      toast.error('Impossible de sauvegarder. Réessayez.')
    }
  }

  async function handleDuplicate() {
    const result = await useAppStore.getState().duplicateLastWeek()
    if (result === 'empty') toast.info('Aucun plan trouvé pour la semaine précédente')
    if (result === 'error') toast.error('Impossible de dupliquer le plan. Réessayez.')
  }

  useEffect(() => {
    let cancelled = false
    const { setWeekPlan, setLoadingPlan, setRecipes, setLoadingRecipes } = useAppStore.getState()

    const load = async () => {
      setError(false)
      setLoadingPlan(true)
      setLoadingRecipes(true)
      try {
        const [planRes, recipesRes] = await Promise.all([
          fetch(`/api/planning?week=${currentWeek}`),
          fetch('/api/recipes'),
        ])
        if (!planRes.ok || !recipesRes.ok) throw new Error('Fetch failed')
        const [weekPlan, recipes] = await Promise.all([planRes.json(), recipesRes.json()])
        if (!cancelled) {
          setWeekPlan(weekPlan)
          setRecipes(recipes)
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
              <div className="flex items-center justify-end border-b border-warm/40 px-4 py-2">
                <button
                  onClick={handleDuplicate}
                  disabled={isDuplicating || isLoadingPlan}
                  className="rounded-md bg-sage px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isDuplicating ? 'Duplication…' : 'Dupliquer la semaine précédente'}
                </button>
              </div>
              <div className="flex-1 p-4">
                <MealGrid />
              </div>
            </>
          )}
        </section>

        {/* Right: Shopping panel placeholder — Epic 4 */}
        <aside className="w-[280px] flex-none border-l border-warm/40 bg-cream p-4">
          <p className="text-xs text-charcoal/40">Liste de courses — Epic 4</p>
        </aside>
      </div>

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
