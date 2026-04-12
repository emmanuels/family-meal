import { useMemo } from 'react'
import { useAppStore } from '@/store/store'
import { normalizeUnit } from '@/lib/utils'
import type { ShoppingItem } from '@/types/index'

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const

export type MealGroup = {
  key: string
  label: string        // e.g. "Lundi — Déjeuner Midi"
  recipeName: string | null
  items: ShoppingItem[]
}

/**
 * useShoppingListByMeal — derives the shopping list grouped by individual meal slot.
 * Ingredients are NOT aggregated across meals — each slot keeps its own ingredient list.
 * Useful for cooking prep (what do I need for Monday dinner?).
 * @returns Array of MealGroup, one per slot that has a recipe assigned.
 */
export function useShoppingListByMeal(): MealGroup[] {
  const weekPlan = useAppStore((state) => state.weekPlan)
  const recipes = useAppStore((state) => state.recipes)
  const ingredientMap = useAppStore((state) => state.ingredientMap)

  return useMemo(() => {
    if (!weekPlan) return []

    try {
      const recipeMap = new Map(recipes.map((r) => [r.id, r]))
      const groups: MealGroup[] = []

      for (const slot of weekPlan.slots) {
        if (!slot.recipeId) continue

        const recipe = recipeMap.get(slot.recipeId)
        if (!recipe) continue

        const items: ShoppingItem[] = []
        for (const ingredientId of recipe.ingredientIds) {
          const ingredient = ingredientMap[ingredientId]
          if (!ingredient) continue
          items.push({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: normalizeUnit(ingredient.unit),
            rayon: ingredient.rayon,
          })
        }

        if (items.length === 0) continue

        // Sort by name within each meal group
        items.sort((a, b) => a.name.localeCompare(b.name))

        const dayName = DAY_NAMES[slot.day] ?? `Jour ${slot.day}`
        groups.push({
          key: `${slot.day}-${slot.slotType}`,
          label: `${dayName} — ${slot.slotType}`,
          recipeName: slot.recipeName,
          items,
        })
      }

      return groups
    } catch (error) {
      console.error('Failed to group shopping list by meal:', error)
      return []
    }
  }, [weekPlan, recipes, ingredientMap])
}
