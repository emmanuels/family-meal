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
import type { DayIndex, MealSlot, MealType, Recipe } from '@/types/index'

interface SlotSwapSheetProps {
  /** null = creation mode (no Airtable record exists yet for this cell) */
  slot: MealSlot | null
  /** Meal type for category filter — always required (replaces slot.slotType when slot is null) */
  slotType: MealType
  /** Required when slot === null: provides date/dayIndex for PUT /api/planning */
  slotContext?: { date: string; day: DayIndex }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SlotSwapSheet({ slot, slotType, slotContext, open, onOpenChange }: SlotSwapSheetProps) {
  const recipes = useAppStore((s) => s.recipes)
  const weekPlan = useAppStore((s) => s.weekPlan)

  // Collect recipeIds already used this week, excluding the slot being replaced (null-safe)
  const usedRecipeIds = new Set(
    weekPlan?.slots
      .filter((s) => s.id !== slot?.id && s.recipeId !== null)
      .map((s) => s.recipeId as string) ?? [],
  )

  // Smart suggestions: same category as slotType + not already used this week, max 5
  const suggestions = recipes
    .filter((r) => r.category === slotType && !usedRecipeIds.has(r.id))
    .slice(0, 5)

  const [annotation, setAnnotation] = useState(slot?.notes ?? '')
  const annotationRef = useRef(slot?.notes ?? '')

  const [query, setQuery] = useState('')

  // ── New recipe inline form ──
  const [showNewRecipeForm, setShowNewRecipeForm] = useState(false)
  const [newRecipeName, setNewRecipeName] = useState('')
  const [newRecipeVegetarian, setNewRecipeVegetarian] = useState(false)
  const [creatingRecipe, setCreatingRecipe] = useState(false)

  // When query is active: search all same-category recipes (no "not-this-week" cap)
  // When empty: fall back to the 5 smart suggestions
  const displayList = query.trim()
    ? recipes.filter(
        (r) =>
          r.category === slotType &&
          r.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : suggestions

  async function handleAnnotationBlur() {
    // Annotation is only for edit mode (existing slot)
    if (!slot) return

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
    if (!slot) {
      // ── Creation mode: PUT to create new Airtable slot ──
      if (!slotContext) return
      const { weekPlan: currentWeekPlan, setWeekPlan } = useAppStore.getState()
      if (!currentWeekPlan) return

      onOpenChange(false)

      try {
        const res = await fetch('/api/planning', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: slotContext.date,
            dayIndex: slotContext.day,
            mealType: slotType,
            recipeId: recipe.id,
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { id } = await res.json() as { id: string }
        const newSlot: MealSlot = {
          id,
          date: slotContext.date,
          day: slotContext.day,
          slotType,
          recipeId: recipe.id,
          recipeName: recipe.name,
          notes: null,
        }
        setWeekPlan({ ...currentWeekPlan, slots: [...currentWeekPlan.slots, newSlot] })
        toast.success('Repas ajouté')
      } catch {
        toast.error('Impossible de créer le repas. Réessayez.')
      }
      return
    }

    // ── Edit mode: PATCH existing slot ──
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

  async function handleCreateRecipe() {
    const name = newRecipeName.trim()
    if (!name) return

    setCreatingRecipe(true)
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category: slotType,
          isVegetarian: newRecipeVegetarian,
          prepTime: 0,
          season: 'Toutes saisons',
          ingredients: [],
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string; message?: string }
        throw new Error(errData.message || errData.error || `HTTP ${res.status}`)
      }

      const created = await res.json() as Recipe
      useAppStore.getState().addRecipe(created)
      setShowNewRecipeForm(false)
      setNewRecipeName('')
      setNewRecipeVegetarian(false)
      await handleSelect(created)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Impossible de créer la recette : ${msg}`)
    } finally {
      setCreatingRecipe(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl px-4 pb-8 pt-4">
        <SheetHeader className="mb-3 p-0">
          <SheetTitle className="text-base font-semibold text-charcoal">
            {slot ? `Changer ${slotType}` : `Ajouter ${slotType}`}
          </SheetTitle>
        </SheetHeader>

        {/* Omnivore annotation section — only in edit mode (not creation) */}
        {slot && (
          <>
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
          </>
        )}

        {showNewRecipeForm ? (
          /* ── Inline new recipe form ── */
          <div className="flex flex-col gap-3">
            <p className="text-xs text-charcoal/50">
              Catégorie : <span className="font-medium text-charcoal">{slotType}</span>
            </p>
            <Input
              placeholder="Nom de la recette…"
              value={newRecipeName}
              onChange={(e) => setNewRecipeName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRecipe() }}
              autoFocus
            />
            {/* Végétarien toggle */}
            <button
              type="button"
              onClick={() => setNewRecipeVegetarian((v) => !v)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                newRecipeVegetarian
                  ? 'bg-sage/20 text-sage'
                  : 'bg-cream text-charcoal/60',
              )}
            >
              <span
                className={cn(
                  'h-2.5 w-2.5 flex-shrink-0 rounded-full',
                  newRecipeVegetarian ? 'bg-sage' : 'bg-terracotta/40',
                )}
              />
              {newRecipeVegetarian ? 'Végétarien' : 'Omnivore'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowNewRecipeForm(false); setNewRecipeName('') }}
                className="flex-1 rounded-lg border border-charcoal/20 py-2 text-sm text-charcoal/60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateRecipe}
                disabled={!newRecipeName.trim() || creatingRecipe}
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm font-semibold text-white transition-colors',
                  newRecipeName.trim() && !creatingRecipe
                    ? 'bg-sage active:bg-sage/80'
                    : 'bg-charcoal/20',
                )}
              >
                {creatingRecipe ? 'Création…' : 'Créer et ajouter'}
              </button>
            </div>
          </div>
        ) : (
          <>
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
              <div className="max-h-[40vh] overflow-y-auto">
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

            {/* Always-visible "Nouvelle recette" button */}
            <button
              type="button"
              onClick={() => { setShowNewRecipeForm(true); setQuery('') }}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-charcoal/30 py-2.5 text-sm text-charcoal/60 active:bg-cream"
            >
              <span className="text-base leading-none">＋</span>
              Nouvelle recette
            </button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
