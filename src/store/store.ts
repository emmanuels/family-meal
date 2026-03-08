import { create } from 'zustand'
import type { DayIndex, Ingredient, Recipe, WeekPlan } from '@/types/index'
import { getAdjacentWeek, getCurrentWeekId } from '@/lib/utils'

// ─── Duplicate Result Type ────────────────────────────────────────────────────

export type DuplicateResult = 'ok' | 'empty' | 'error'

function getCurrentDay(): DayIndex {
  const dow = new Date().getUTCDay() // 0=Sun, 1=Mon … 6=Sat
  return (dow === 0 ? 6 : dow - 1) as DayIndex // Convert to ISO: 0=Mon … 6=Sun
}

// ─── AppState Interface ───────────────────────────────────────────────────────

interface AppState {
  // ── Week Plan Slice ──────────────────────────────────────────────────────
  weekPlan: WeekPlan | null
  currentWeek: string // ISO "YYYY-WWW"
  isLoadingPlan: boolean

  setWeekPlan: (plan: WeekPlan) => void
  setCurrentWeek: (weekId: string) => void
  setLoadingPlan: (loading: boolean) => void
  /** Updates recipeId + recipeName on the slot with matching Airtable record id */
  updateSlot: (slotId: string, recipeId: string | null, recipeName: string | null) => void
  /** Updates omnivore annotation (notes) on the slot with matching Airtable record id */
  updateSlotNotes: (slotId: string, notes: string | null) => void
  isDuplicating: boolean
  setDuplicating: (v: boolean) => void
  duplicateLastWeek: () => Promise<DuplicateResult>

  // ── Recipes Slice ────────────────────────────────────────────────────────
  recipes: Recipe[]
  isLoadingRecipes: boolean
  ingredientMap: Record<string, Ingredient> // keyed by Airtable record ID

  setRecipes: (recipes: Recipe[]) => void
  /** Optimistic insert — prepends recipe to array */
  addRecipe: (recipe: Recipe) => void
  setLoadingRecipes: (loading: boolean) => void
  setIngredients: (ingredients: Ingredient[]) => void

  // ── UI Slice ─────────────────────────────────────────────────────────────
  selectedDay: DayIndex // 0–6 (0=Mon … 6=Sun); initialized to current weekday
  quickAddOpen: boolean

  setSelectedDay: (day: DayIndex) => void
  toggleQuickAdd: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()((set, get) => ({
  // ── Week Plan Slice ────────────────────────────────────────────────────────
  weekPlan: null,
  currentWeek: getCurrentWeekId(),
  isLoadingPlan: true, // true on init — MobilePlanningView shows skeleton immediately (no flash)

  setWeekPlan: (plan) => set({ weekPlan: plan }),

  setCurrentWeek: (weekId) => set({ currentWeek: weekId }),

  setLoadingPlan: (loading) => set({ isLoadingPlan: loading }),

  updateSlot: (slotId, recipeId, recipeName) =>
    set((state) => ({
      weekPlan: state.weekPlan
        ? {
            ...state.weekPlan,
            slots: state.weekPlan.slots.map((slot) =>
              slot.id === slotId ? { ...slot, recipeId, recipeName } : slot,
            ),
          }
        : null,
    })),

  updateSlotNotes: (slotId, notes) =>
    set((state) => ({
      weekPlan: state.weekPlan
        ? {
            ...state.weekPlan,
            slots: state.weekPlan.slots.map((slot) =>
              slot.id === slotId ? { ...slot, notes } : slot,
            ),
          }
        : null,
    })),

  isDuplicating: false,

  setDuplicating: (v) => set({ isDuplicating: v }),

  duplicateLastWeek: async () => {
    const { currentWeek, weekPlan, setDuplicating } = get()
    const prevWeekId = getAdjacentWeek(currentWeek, -1)

    setDuplicating(true)
    const prevWeekPlanSnapshot = weekPlan // rollback snapshot

    try {
      // Fetch prev week to check if it has any recipes
      const prevRes = await fetch(`/api/planning?week=${prevWeekId}`)
      if (!prevRes.ok) throw new Error(`HTTP ${prevRes.status}`)
      const prevPlan = (await prevRes.json()) as WeekPlan

      const hasRecipes = prevPlan.slots.some((s) => s.recipeId !== null)
      if (!hasRecipes) {
        get().setDuplicating(false)
        return 'empty'
      }

      // Optimistic update: map prev week slots onto current week slots by (day, slotType)
      const currentPlan = get().weekPlan
      if (currentPlan) {
        const fromSlotMap = new Map(
          prevPlan.slots.map((s) => [`${s.day}-${s.slotType}`, s]),
        )
        const optimisticSlots = currentPlan.slots.map((slot) => {
          const fromSlot = fromSlotMap.get(`${slot.day}-${slot.slotType}`)
          return fromSlot
            ? { ...slot, recipeId: fromSlot.recipeId, recipeName: fromSlot.recipeName }
            : slot
        })
        get().setWeekPlan({ ...currentPlan, slots: optimisticSlots })
      }

      // Server write — batch PATCH all slots via POST /api/planning
      const res = await fetch('/api/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate', fromWeek: prevWeekId, toWeek: currentWeek }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const serverPlan = (await res.json()) as WeekPlan
      // Guard: only sync authoritative state if user hasn't navigated to another week
      if (get().currentWeek === currentWeek) get().setWeekPlan(serverPlan)
      get().setDuplicating(false)
      return 'ok'
    } catch {
      // Rollback: only restore if user is still on the same week
      if (prevWeekPlanSnapshot && get().currentWeek === currentWeek)
        get().setWeekPlan(prevWeekPlanSnapshot)
      get().setDuplicating(false)
      return 'error'
    }
  },

  // ── Recipes Slice ──────────────────────────────────────────────────────────
  recipes: [],
  isLoadingRecipes: false,
  ingredientMap: {},

  setRecipes: (recipes) => set({ recipes }),

  addRecipe: (recipe) => set((state) => ({ recipes: [recipe, ...state.recipes] })),

  setLoadingRecipes: (loading) => set({ isLoadingRecipes: loading }),

  setIngredients: (ingredients) =>
    set({ ingredientMap: Object.fromEntries(ingredients.map((i) => [i.id, i])) }),

  // ── UI Slice ───────────────────────────────────────────────────────────────
  selectedDay: getCurrentDay(),
  quickAddOpen: false,

  setSelectedDay: (day) => set({ selectedDay: day }),

  toggleQuickAdd: () => set((state) => ({ quickAddOpen: !state.quickAddOpen })),
}))
