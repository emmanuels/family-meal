import { useMemo } from 'react'
import { useAppStore } from '@/store/store'
import { rayonSortKey, normalizeUnit } from '@/lib/utils'
import type { ShoppingItem } from '@/types/index'

/**
 * useShoppingList hook — derives shopping list from current week plan + ingredients cache.
 * Client-side aggregation for instant updates (no API call, < 100ms latency).
 * @returns Sorted array of ShoppingItem objects (Carrefour rayon order, then name)
 */
export function useShoppingList(): ShoppingItem[] {
  const weekPlan = useAppStore((state) => state.weekPlan)
  const recipes = useAppStore((state) => state.recipes)
  const ingredientMap = useAppStore((state) => state.ingredientMap)

  const shoppingList = useMemo(() => {
    if (!weekPlan) return []

    try {
      const recipeMap = new Map(recipes.map((r) => [r.id, r]))

      // Accumulator: key = (normalizedName + '|' + normalizedUnit) → aggregated item
      const accumulator = new Map<
        string,
        { quantity: number; unit: string; rayon: string; name: string }
      >()

      for (const slot of weekPlan.slots) {
        if (!slot.recipeId) continue

        const recipe = recipeMap.get(slot.recipeId)
        if (!recipe) continue

        for (const ingredientId of recipe.ingredientIds) {
          const ingredient = ingredientMap[ingredientId]
          if (!ingredient) continue

          const normUnit = normalizeUnit(ingredient.unit)
          const key = `${ingredient.name.toLowerCase()}|${normUnit}`
          const existing = accumulator.get(key)
          if (existing) {
            existing.quantity += ingredient.quantity
          } else {
            accumulator.set(key, {
              name: ingredient.name,
              quantity: ingredient.quantity,
              unit: normUnit,
              rayon: ingredient.rayon,
            })
          }
        }
      }

      // Convert accumulator to ShoppingItem array
      const items: ShoppingItem[] = Array.from(accumulator.values())

      // Sort by rayon order, then by name
      items.sort((a, b) => {
        const rayonCmp = rayonSortKey(a.rayon) - rayonSortKey(b.rayon)
        if (rayonCmp !== 0) return rayonCmp
        return a.name.localeCompare(b.name)
      })

      return items
    } catch (error) {
      // Log error but don't crash — let panel show empty list
      console.error('Failed to aggregate shopping list:', error)
      return []
    }
  }, [weekPlan, recipes, ingredientMap])

  return shoppingList
}
