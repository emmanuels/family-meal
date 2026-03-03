'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { RecipeCard } from './RecipeCard'
import type { Recipe } from '@/types/index'

export function DraggableRecipeCard({ recipe }: { recipe: Recipe }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: recipe.id,
    data: { recipe },
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
      <RecipeCard recipe={recipe} />
    </div>
  )
}
