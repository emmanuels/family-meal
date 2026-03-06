'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { MealCell } from './MealCell'
import type { MealSlot, MealType } from '@/types/index'

interface DraggableMealCellProps {
  slot: MealSlot
  slotType: MealType
  isVegetarian: boolean
  variant: 'mobile' | 'desktop'
  onTap?: () => void
}

export function DraggableMealCell({
  slot,
  slotType,
  isVegetarian,
  variant,
  onTap,
}: DraggableMealCellProps) {
  // Only draggable if slot has a recipe
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `grid-${slot.id}`,
    data: { slot, source: 'grid' },
    disabled: !slot.recipeId,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-30' : undefined}
      {...attributes}
      {...listeners}
    >
      <MealCell
        slot={slot}
        slotType={slotType}
        isVegetarian={isVegetarian}
        variant={variant}
        onTap={onTap}
      />
    </div>
  )
}
