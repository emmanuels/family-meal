import { useState, useCallback, useMemo } from 'react'
import { useAppStore } from '@/store/store'
import { RAYONS, normalizeUnit, rayonSortKey } from '@/lib/utils'
import { toast } from 'sonner'
import type { ShoppingItem } from '@/types/index'

/**
 * useCopyShoppingList hook — builds shopping list from store and copies to clipboard.
 * Uses client-side aggregation (same source as ShoppingPanel) — no API call needed.
 */
export function useCopyShoppingList() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [clipboardAvailable, setClipboardAvailable] = useState(
    typeof navigator !== 'undefined' && !!navigator.clipboard
  )
  const [formattedContent, setFormattedContent] = useState('')

  const weekPlan = useAppStore((state) => state.weekPlan)
  const recipes = useAppStore((state) => state.recipes)
  const ingredientMap = useAppStore((state) => state.ingredientMap)

  // Derive shopping list from store (same logic as useShoppingList)
  const items = useMemo((): ShoppingItem[] => {
    if (!weekPlan) return []
    const recipeMap = new Map(recipes.map((r) => [r.id, r]))
    const accumulator = new Map<string, { quantity: number; unit: string; rayon: string; name: string }>()

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
          accumulator.set(key, { name: ingredient.name, quantity: ingredient.quantity, unit: normUnit, rayon: ingredient.rayon })
        }
      }
    }

    return Array.from(accumulator.values()).sort((a, b) => {
      const cmp = rayonSortKey(a.rayon) - rayonSortKey(b.rayon)
      return cmp !== 0 ? cmp : a.name.localeCompare(b.name)
    })
  }, [weekPlan, recipes, ingredientMap])

  const formatShoppingList = useCallback((shoppingItems: ShoppingItem[]): string => {
    if (shoppingItems.length === 0) return 'Aucun repas planifié pour cette semaine'

    const byRayon = new Map<string, ShoppingItem[]>()
    for (const item of shoppingItems) {
      const key = item.rayon || 'Autre'
      if (!byRayon.has(key)) byRayon.set(key, [])
      byRayon.get(key)!.push(item)
    }

    const lines: string[] = []
    for (const rayon of RAYONS) {
      const group = byRayon.get(rayon)
      if (!group || group.length === 0) continue
      lines.push(rayon)
      for (const item of group) lines.push(`${item.quantity} ${item.unit} — ${item.name}`)
      lines.push('')
    }

    const unknownItems = byRayon.get('Autre')
    if (unknownItems && unknownItems.length > 0) {
      lines.push('Autre')
      for (const item of unknownItems) lines.push(`${item.quantity} ${item.unit} — ${item.name}`)
    }

    return lines.join('\n').trim()
  }, [])

  const copy = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      if (items.length === 0) {
        toast.warning('Aucun repas planifié pour cette semaine')
        return
      }

      const formatted = formatShoppingList(items)
      setFormattedContent(formatted)

      if (clipboardAvailable) {
        try {
          await navigator.clipboard.writeText(formatted)
          toast.success('Liste copiée ✓')
        } catch (clipboardError) {
          console.warn('Clipboard API failed:', clipboardError)
          setClipboardAvailable(false)
          throw new Error('Clipboard API unavailable — showing fallback')
        }
      } else {
        throw new Error('Clipboard API unavailable')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      if (!errorMsg.includes('Clipboard')) {
        toast.error('Impossible de copier la liste')
      }
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [items, clipboardAvailable, formatShoppingList])

  return {
    copy,
    isLoading,
    error,
    clipboardAvailable,
    formattedContent,
    formatShoppingList,
  }
}
