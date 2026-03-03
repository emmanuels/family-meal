'use client'

import type { Recipe } from '@/types/index'

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <div
      className="rounded px-3 py-2 bg-cream hover:bg-warm transition-colors cursor-grab"
      aria-label={`Recette ${recipe.name}, catégorie ${recipe.category}`}
    >
      {recipe.isVegetarian && (
        <span className="mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-sage-light text-sage">
          Végé
        </span>
      )}
      <p className="text-xs font-medium leading-tight text-charcoal line-clamp-2">{recipe.name}</p>
      <p className="mt-0.5 text-[10px] text-charcoal/50">{recipe.category}</p>
    </div>
  )
}
