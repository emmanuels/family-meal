'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/store'
import { DraggableRecipeCard } from './DraggableRecipeCard'
import { FilterPills, type FilterCategory } from './FilterPills'
import type { Recipe } from '@/types/index'

function filterRecipes(recipes: Recipe[], filter: FilterCategory, query: string): Recipe[] {
  let result = recipes
  if (filter !== 'Tous') {
    if (filter === 'Déjeuner') {
      result = result.filter(
        (r) => r.category === 'Déjeuner Midi' || r.category === 'Déjeuner Pique-nique',
      )
    } else {
      result = result.filter((r) => r.category === filter)
    }
  }
  if (query.trim()) {
    const q = query.trim().toLowerCase()
    result = result.filter((r) => r.name.toLowerCase().includes(q))
  }
  return result
}

export function RecipeLibrary() {
  const recipes = useAppStore((s) => s.recipes)
  const isLoadingRecipes = useAppStore((s) => s.isLoadingRecipes)
  const isLoadingPlan = useAppStore((s) => s.isLoadingPlan)
  const toggleQuickAdd = useAppStore((s) => s.toggleQuickAdd)

  const isLoading = isLoadingPlan || isLoadingRecipes

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('Tous')
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Reset filter and search on week navigation
  useEffect(() => {
    if (isLoading) {
      setActiveFilter('Tous')
      setSearchQuery('')
    }
  }, [isLoading])

  const filteredRecipes = filterRecipes(recipes, activeFilter, searchQuery)
  const hasActiveFilters = activeFilter !== 'Tous' || searchQuery.trim() !== ''

  return (
    <div className="flex h-full flex-col">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">Bibliothèque</span>
        <button
          type="button"
          onClick={toggleQuickAdd}
          className="rounded bg-[#C8E6D9] px-2 py-0.5 text-sm font-medium text-[#2D2D2D] hover:bg-[#B5DCC8]"
          aria-label="Ajouter une recette"
          title="Ajouter une recette"
        >
          +
        </button>
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
          {/* Search input */}
          <div className="px-4 py-2">
            <input
              ref={searchRef}
              type="search"
              placeholder="Rechercher une recette…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded border border-warm/60 bg-cream px-2.5 py-1 text-xs text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-1 focus:ring-terracotta"
              aria-label="Rechercher une recette"
            />
          </div>

          {/* Filter pills */}
          <FilterPills value={activeFilter} onChange={setActiveFilter} />
          <div className="border-b border-warm/40" />

          {/* Recipe list */}
          {recipes.length === 0 ? (
            <p className="px-4 py-3 text-xs text-charcoal/40">Aucune recette trouvée</p>
          ) : filteredRecipes.length === 0 ? (
            <div className="px-4 py-3">
              <p className="text-xs text-charcoal/40">
                {searchQuery.trim()
                  ? 'Aucune recette correspondante.'
                  : 'Aucune recette dans cette catégorie.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => { setActiveFilter('Tous'); setSearchQuery('') }}
                  className="mt-1 text-xs text-terracotta hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              )}
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
