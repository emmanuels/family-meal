'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/store'
import { DraggableRecipeCard } from './DraggableRecipeCard'
import { FilterPills, type FilterCategory } from './FilterPills'
import type { Recipe } from '@/types/index'

function filterRecipes(recipes: Recipe[], filter: FilterCategory): Recipe[] {
  if (filter === 'Tous') return recipes
  if (filter === 'Déjeuner') {
    return recipes.filter(
      (r) => r.category === 'Déjeuner Midi' || r.category === 'Déjeuner Pique-nique',
    )
  }
  return recipes.filter((r) => r.category === filter)
}

export function RecipeLibrary() {
  const recipes = useAppStore((s) => s.recipes)
  const isLoadingRecipes = useAppStore((s) => s.isLoadingRecipes)
  const isLoadingPlan = useAppStore((s) => s.isLoadingPlan)

  // Show skeleton whenever the initial data fetch is in progress.
  // isLoadingPlan starts as true (store default), so the skeleton appears immediately
  // and avoids a flash of "Aucune recette trouvée" before the useEffect fires.
  const isLoading = isLoadingPlan || isLoadingRecipes

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('Tous')

  // Reset filter on week navigation (when isLoading transitions to true)
  useEffect(() => {
    if (isLoading) setActiveFilter('Tous')
  }, [isLoading])

  const filteredRecipes = filterRecipes(recipes, activeFilter)

  return (
    <div className="flex h-full flex-col">
      {/* Sidebar header */}
      <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-charcoal/60">
        Bibliothèque
      </div>
      <div className="border-b border-warm/40" />

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col gap-2 px-4 py-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-[52px] animate-pulse rounded bg-warm" />
          ))}
        </div>
      ) : (
        <>
          {/* Filter pills — rendered in loaded state only (not during skeleton) */}
          <FilterPills value={activeFilter} onChange={setActiveFilter} />
          <div className="border-b border-warm/40" />

          {/* Recipe list — three branches: data-empty / filter-empty / populated */}
          {recipes.length === 0 ? (
            <p className="px-4 py-3 text-xs text-charcoal/40">Aucune recette trouvée</p>
          ) : filteredRecipes.length === 0 ? (
            <div className="px-4 py-3">
              <p className="text-xs text-charcoal/40">Aucune recette dans cette catégorie.</p>
              <button
                type="button"
                onClick={() => setActiveFilter('Tous')}
                className="mt-1 text-xs text-terracotta hover:underline"
              >
                Voir toutes les recettes
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {filteredRecipes.map((recipe) => (
                <DraggableRecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
