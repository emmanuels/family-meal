'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/store'
import { WeekNav } from '@/components/planning/WeekNav'
import { DaySwipeView } from '@/components/planning/DaySwipeView'
import { ErrorBanner } from '@/components/planning/ErrorBanner'

function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-[84px] animate-pulse rounded bg-warm" />
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MobilePlanningView() {
  const [error, setError] = useState(false)

  const currentWeek = useAppStore((s) => s.currentWeek)
  const isLoadingPlan = useAppStore((s) => s.isLoadingPlan)

  useEffect(() => {
    let cancelled = false
    const { setWeekPlan, setLoadingPlan, setRecipes, setLoadingRecipes, setIngredients } = useAppStore.getState()

    const load = async () => {
      setError(false)
      setLoadingPlan(true)
      setLoadingRecipes(true)
      try {
        const [planRes, recipesRes, ingredientsRes] = await Promise.all([
          fetch(`/api/planning?week=${currentWeek}`),
          fetch('/api/recipes'),
          fetch('/api/ingredients'),
        ])
        if (!planRes.ok || !recipesRes.ok || !ingredientsRes.ok) throw new Error('Fetch failed')
        const [weekPlan, recipes, ingredients] = await Promise.all([
          planRes.json(),
          recipesRes.json(),
          ingredientsRes.json(),
        ])
        if (!cancelled) {
          setWeekPlan(weekPlan)
          setRecipes(recipes)
          setIngredients(ingredients)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) {
          setLoadingPlan(false)
          setLoadingRecipes(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [currentWeek]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* AC6: non-blocking — banner renders ABOVE day view, never replaces it */}
      {error && <ErrorBanner />}
      {isLoadingPlan ? (
        <LoadingSkeleton />
      ) : (
        <>
          <WeekNav />
          <DaySwipeView />
        </>
      )}
    </>
  )
}
