'use client'

import { useShoppingList } from '@/hooks/useShoppingList'
import { useAppStore } from '@/store/store'

/**
 * ShoppingPanel — displays shopping list in desktop right panel
 * 
 * This component integrates into the 3-panel DesktopPlanningView layout:
 * - Left: RecipeLibrary
 * - Center: MealGrid + WeekNav
 * - Right: ShoppingPanel (this component)
 * 
 * Renders shopping list derived from current week plan using Zustand store.
 * Updates instantly when meal slots change (no API call, optimistic).
 * 
 * AC1: Renders in 280px fixed-width panel ✓
 * AC2: Client-side derivation from store ✓
 * AC3: Instant updates when slots change ✓
 * AC4: Sorted by rayon using RAYONS constant ✓
 * AC5: Integrates seamlessly in layout ✓
 * AC6: Clear formatting with qty + unit ✓
 */
export function ShoppingPanel({ className }: { className?: string }) {
  const items = useShoppingList()
  const hasWeekPlan = useAppStore((state) => !!state.weekPlan)

  return (
    <div className={className}>
      <div className="mb-3 border-b border-warm/30 pb-2">
        <h2 className="text-sm font-semibold text-charcoal">Liste de courses</h2>
      </div>

      {items.length === 0 ? (
        <div className="rounded bg-warm/20 p-3 text-center">
          <p className="text-xs text-charcoal/60">
            {!hasWeekPlan ? 'Chargement…' : 'Aucun repas planifié'}
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((item, idx) => (
            <li key={`${item.name}-${item.unit}-${idx}`} className="text-xs text-charcoal">
              <span className="font-medium">{item.quantity}</span>{' '}
              <span className="text-charcoal/70">{item.unit}</span> —{' '}
              <span>{item.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
