'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { MealSlot, MealType } from '@/types/index'

interface MealCellProps {
  slot: MealSlot | null
  slotType: MealType
  isVegetarian: boolean
  variant: 'mobile' | 'desktop'
}

export const MealCell = React.memo(function MealCell({
  slot,
  slotType,
  isVegetarian,
  variant,
}: MealCellProps) {
  const isEmpty = slot === null || slot.recipeId === null

  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded px-3 py-2',
        variant === 'mobile' ? 'h-[84px]' : 'h-[76px]',
        isEmpty && 'border border-dashed border-warm',
        !isEmpty && isVegetarian && 'bg-sage-light',
        !isEmpty && !isVegetarian && 'bg-cream border border-warm',
      )}
    >
      {/* Slot type label */}
      <p className="text-xs text-charcoal/50">{slotType}</p>

      {isEmpty ? (
        /* Empty state: + icon centred */
        <div className="flex flex-1 items-center justify-center">
          <span className="text-xl text-charcoal/30">+</span>
        </div>
      ) : (
        <>
          {/* Recipe name */}
          <p className="truncate text-sm font-medium text-charcoal">{slot.recipeName}</p>
          {/* FR12 last-used sub-label — reserved DOM space, deferred to Growth (Story 2.x) */}
          <p className="h-4 text-xs text-charcoal/40" />
        </>
      )}
    </div>
  )
})
