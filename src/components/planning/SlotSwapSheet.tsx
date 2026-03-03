'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/store'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { MealSlot } from '@/types/index'

interface SlotSwapSheetProps {
  slot: MealSlot
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SlotSwapSheet({ slot, open, onOpenChange }: SlotSwapSheetProps) {
  const recipes = useAppStore((s) => s.recipes)
  const weekPlan = useAppStore((s) => s.weekPlan)

  // Collect recipeIds already used this week, excluding the slot being replaced
  const usedRecipeIds = new Set(
    weekPlan?.slots
      .filter((s) => s.id !== slot.id && s.recipeId !== null)
      .map((s) => s.recipeId as string) ?? [],
  )

  // Smart suggestions: same category as slot + not already used this week, max 5
  const suggestions = recipes
    .filter((r) => r.category === slot.slotType && !usedRecipeIds.has(r.id))
    .slice(0, 5)

  const [annotation, setAnnotation] = useState(slot.notes ?? '')
  const annotationRef = useRef(slot.notes ?? '')

  const [query, setQuery] = useState('')

  // When query is active: search all same-category recipes (no "not-this-week" cap)
  // When empty: fall back to the 5 smart suggestions
  const displayList = query.trim()
    ? recipes.filter(
        (r) =>
          r.category === slot.slotType &&
          r.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : suggestions

  async function handleAnnotationBlur() {
    const trimmed = annotation.trim()
    const normalised = trimmed || null

    // AC4: no-op if value unchanged
    if (normalised === (annotationRef.current || null)) return

    // Capture previous value for rollback BEFORE optimistic update
    const prevNotes = annotationRef.current || null

    const { updateSlotNotes } = useAppStore.getState()
    updateSlotNotes(slot.id, normalised)
    annotationRef.current = normalised ?? ''

    try {
      const res = await fetch('/api/planning', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: slot.id, notes: normalised }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      useAppStore.getState().updateSlotNotes(slot.id, prevNotes)
      setAnnotation(prevNotes ?? '')
      annotationRef.current = prevNotes ?? ''
      toast.error('Impossible de sauvegarder. Réessayez.')
    }
  }

  async function handleSelect(recipe: (typeof recipes)[number]) {
    const { updateSlot, weekPlan: currentWeekPlan } = useAppStore.getState()

    // 1. Capture rollback values before any mutation
    const prevRecipeId = currentWeekPlan?.slots.find((s) => s.id === slot.id)?.recipeId ?? null
    const prevRecipeName = currentWeekPlan?.slots.find((s) => s.id === slot.id)?.recipeName ?? null

    // 2. Optimistic update — instant UI feedback
    updateSlot(slot.id, recipe.id, recipe.name)

    // 3. Close sheet immediately — don't wait for network
    onOpenChange(false)

    // 4. Background Airtable write
    try {
      const res = await fetch('/api/planning', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: slot.id, recipeId: recipe.id }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      // 5. Rollback on failure + user feedback
      useAppStore.getState().updateSlot(slot.id, prevRecipeId, prevRecipeName)
      toast.error('Impossible de sauvegarder. Réessayez.')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl px-4 pb-8 pt-4">
        <SheetHeader className="mb-3 p-0">
          <SheetTitle className="text-base font-semibold text-charcoal">
            Changer {slot.slotType}
          </SheetTitle>
        </SheetHeader>

        {/* Omnivore annotation section */}
        <label
          htmlFor="annotation-input"
          className="mb-1 block text-xs font-medium text-charcoal/60"
        >
          Variante omnivore
        </label>
        <Input
          id="annotation-input"
          placeholder="ex: + lardons ×1"
          value={annotation}
          onChange={(e) => setAnnotation(e.target.value)}
          onBlur={handleAnnotationBlur}
          className="mb-4"
          autoComplete="off"
        />

        <Input
          placeholder="Rechercher une recette…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-3"
        />

        {displayList.length === 0 ? (
          <p className="py-6 text-center text-sm text-charcoal/50">
            {query ? 'Aucune recette trouvée pour ce repas' : 'Aucune suggestion disponible'}
          </p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto">
            <ul className="flex flex-col gap-2">
              {displayList.map((recipe) => (
                <li key={recipe.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(recipe)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left',
                      'bg-cream active:bg-warm',
                    )}
                  >
                    {/* Veggie indicator dot */}
                    <span
                      className={cn(
                        'h-2.5 w-2.5 flex-shrink-0 rounded-full',
                        recipe.isVegetarian ? 'bg-sage' : 'bg-terracotta/40',
                      )}
                      aria-label={recipe.isVegetarian ? 'Végétarien' : 'Omnivore'}
                    />
                    <span className="truncate text-sm font-medium text-charcoal">
                      {recipe.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
