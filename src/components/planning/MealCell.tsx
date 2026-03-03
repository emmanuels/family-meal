'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MealSlot, MealType } from '@/types/index'

interface MealCellProps {
  slot: MealSlot | null
  slotType: MealType
  isVegetarian: boolean
  variant: 'mobile' | 'desktop'
  /** Optional tap handler — provided only for non-empty mobile slots (FR4 slot swap) */
  onTap?: () => void
}

export const MealCell = React.memo(function MealCell({
  slot,
  slotType,
  isVegetarian,
  variant,
  onTap,
}: MealCellProps) {
  const isEmpty = slot === null || slot.recipeId === null

  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded px-3 py-2',
        variant === 'mobile' ? 'h-[84px]' : 'h-[76px]',
        isEmpty && 'border border-dashed border-warm',
        isEmpty && onTap && 'cursor-pointer active:opacity-70',
        !isEmpty && isVegetarian && 'bg-sage-light',
        !isEmpty && !isVegetarian && 'bg-cream border border-warm',
        !isEmpty && onTap && 'cursor-pointer active:opacity-80',
      )}
      onClick={onTap}
    >
      {/* Slot type label — shown on mobile only; desktop MealGrid provides row headers */}
      {variant === 'mobile' && <p className="text-xs text-charcoal/50">{slotType}</p>}

      {isEmpty ? (
        /* Empty state: + icon centred */
        <div className="flex flex-1 items-center justify-center">
          <span className="text-xl text-charcoal/30">+</span>
        </div>
      ) : (
        <>
          {/* Recipe name — 2-line clamp for readability */}
          <p className="line-clamp-2 text-xs font-medium leading-tight text-charcoal">{slot.recipeName}</p>
          {/* Omnivore annotation badge (FR8) — shows omni variant text when present.
              slot is narrowed to non-null here (isEmpty === false). Empty string ""
              is intentionally treated as falsy — no badge shown for blank annotations. */}
          {slot.notes ? (
            <Badge
              variant="outline"
              className="max-w-full truncate rounded border-terracotta/30 bg-terracotta-light/20 px-1.5 py-0 text-xs text-terracotta"
            >
              {slot.notes}
            </Badge>
          ) : (
            <p className="h-4" />
          )}
        </>
      )}
    </div>
  )
})
