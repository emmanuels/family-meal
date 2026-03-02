import { create } from 'zustand'
import type { DayIndex, Recipe, WeekPlan } from '@/types/index'

// ─── ISO Week Helpers ─────────────────────────────────────────────────────────

function getCurrentWeekId(): string {
  const now = new Date()
  const year = now.getUTCFullYear()

  // Jan 4 is always in ISO week 1 (ISO 8601)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay() // Mon=1 … Sun=7

  // Monday of week 1
  const weekOneMon = new Date(jan4)
  weekOneMon.setUTCDate(jan4.getUTCDate() - (dow - 1))

  // Days since week 1 Monday (UTC)
  const daysSinceWeekOne = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      weekOneMon.getTime()) /
      86_400_000,
  )

  const weekNum = Math.floor(daysSinceWeekOne / 7) + 1

  // Edge case: early January may compute week < 1 → last week of previous year
  // Use Dec 28 (always in the last ISO week of any year) to find the correct week number
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
}

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
  /** Stub — full implementation in Story 3.1 */
  duplicateLastWeek: () => void

  // ── Recipes Slice ────────────────────────────────────────────────────────
  recipes: Recipe[]
  isLoadingRecipes: boolean

  setRecipes: (recipes: Recipe[]) => void
  /** Optimistic insert — prepends recipe to array */
  addRecipe: (recipe: Recipe) => void
  setLoadingRecipes: (loading: boolean) => void

  // ── UI Slice ─────────────────────────────────────────────────────────────
  selectedDay: DayIndex // 0–6 (0=Mon … 6=Sun); initialized to current weekday
  quickAddOpen: boolean

  setSelectedDay: (day: DayIndex) => void
  toggleQuickAdd: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()((set) => ({
  // ── Week Plan Slice ────────────────────────────────────────────────────────
  weekPlan: null,
  currentWeek: getCurrentWeekId(),
  isLoadingPlan: false,

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

  duplicateLastWeek: () => {
    // TODO: implemented in Story 3.1
    // Will: compute prevWeekId → fetch /api/planning?week=prevWeekId →
    //       write all slots to current week via /api/planning PATCH →
    //       call setWeekPlan() with result
  },

  // ── Recipes Slice ──────────────────────────────────────────────────────────
  recipes: [],
  isLoadingRecipes: false,

  setRecipes: (recipes) => set({ recipes }),

  addRecipe: (recipe) => set((state) => ({ recipes: [recipe, ...state.recipes] })),

  setLoadingRecipes: (loading) => set({ isLoadingRecipes: loading }),

  // ── UI Slice ───────────────────────────────────────────────────────────────
  selectedDay: getCurrentDay(),
  quickAddOpen: false,

  setSelectedDay: (day) => set({ selectedDay: day }),

  toggleQuickAdd: () => set((state) => ({ quickAddOpen: !state.quickAddOpen })),
}))
