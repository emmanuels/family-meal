import { useState, useCallback } from 'react'
import { useAppStore } from '@/store/store'
import { RAYONS, rayonSortKey } from '@/lib/utils'
import { toast } from 'sonner'
import type { ShoppingItem } from '@/types/index'

/**
 * useCopyShoppingList hook — fetches shopping list from API and copies to clipboard
 * 
 * Handles:
 * - Fetching `/api/shopping-list?week={{currentWeek}}` endpoint
 * - Formatting response into plain text with rayon headers
 * - Copying to clipboard via Web Clipboard API
 * - Fallback handling if clipboard unavailable
 * - Loading and error states
 * 
 * @returns Object with copy function, loading state, error state, and clipboard availability
 */
export function useCopyShoppingList() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [clipboardAvailable, setClipboardAvailable] = useState(
    typeof navigator !== 'undefined' && !!navigator.clipboard
  )
  const [formattedContent, setFormattedContent] = useState('')

  const currentWeek = useAppStore((state) => state.currentWeek)

  /**
   * Format shopping items into plain text with rayon headers
   * 
   * Example output:
   * ```
   * Fruits & Légumes
   * 200 g — Tomate cerise
   * 500 g — Carotte
   * 
   * Produits frais
   * 1 L — Lait
   * ```
   */
  const formatShoppingList = (items: ShoppingItem[]): string => {
    if (items.length === 0) {
      return 'Aucun repas planifié pour cette semaine'
    }

    // Group by rayon
    const byRayon = new Map<string, ShoppingItem[]>()
    for (const item of items) {
      const key = item.rayon || 'Autre'
      if (!byRayon.has(key)) {
        byRayon.set(key, [])
      }
      byRayon.get(key)!.push(item)
    }

    // Build formatted text with rayon headers
    const lines: string[] = []
    const rayonOrder = RAYONS

    for (const rayon of rayonOrder) {
      const items = byRayon.get(rayon)
      if (!items || items.length === 0) continue

      lines.push(rayon)
      for (const item of items) {
        lines.push(`${item.quantity} ${item.unit} — ${item.name}`)
      }
      lines.push('') // Empty line between rayons
    }

    // Handle unknown rayons (not in RAYONS constant)
    const unknownItems = byRayon.get('Autre')
    if (unknownItems && unknownItems.length > 0) {
      lines.push('Autre')
      for (const item of unknownItems) {
        lines.push(`${item.quantity} ${item.unit} — ${item.name}`)
      }
    }

    // Remove trailing empty line
    return lines.join('\n').trim()
  }

  /**
   * Main copy function — fetches shopping list and copies to clipboard
   */
  const copy = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch shopping list from Story 4.1 endpoint
      const response = await fetch(`/api/shopping-list?week=${currentWeek}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = (await response.json()) as { shoppingList: ShoppingItem[] }
      const items = data.shoppingList || []

      // Check for empty shopping list
      if (items.length === 0) {
        toast.warning('Aucun repas planifié pour cette semaine')
        setIsLoading(false)
        return // Don't copy empty list
      }

      // Format for clipboard
      const formatted = formatShoppingList(items)
      setFormattedContent(formatted)

      // Try clipboard API first
      if (clipboardAvailable) {
        try {
          await navigator.clipboard.writeText(formatted)
          toast.success('Liste copiée — prête pour Carrefour Drive')
        } catch (clipboardError) {
          // Clipboard API failed (e.g., permission denied)
          console.warn('Clipboard API failed:', clipboardError)
          setClipboardAvailable(false)
          // Will show fallback modal on next render
          throw new Error('Clipboard API unavailable — showing fallback')
        }
      } else {
        // Clipboard API not available
        throw new Error('Clipboard API unavailable')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to copy shopping list:', errorMsg)
      
      // Differentiate error types for better UX
      if (errorMsg.includes('Clipboard')) {
        // No toast for clipboard unavailable (fallback modal will show)
        console.warn('Clipboard unavailable, will show fallback modal')
      } else if (errorMsg.includes('HTTP')) {
        toast.error('Impossible de charger la liste: serveur indisponible')
      } else if (errorMsg.includes('Aucun repas')) {
        // Already handled above
      } else {
        toast.error('Erreur: Impossible de copier la liste')
      }
      
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [currentWeek, clipboardAvailable])

  return {
    copy,
    isLoading,
    error,
    clipboardAvailable,
    formattedContent,
    formatShoppingList,
  }
}
