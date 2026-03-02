'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/store'
import { WeekNav } from '@/components/planning/WeekNav'
import { MealGrid } from '@/components/planning/MealGrid'
import { ErrorBanner } from '@/components/planning/ErrorBanner'

function LoadingSkeleton() {
  return (
    <div className="p-4">
      {Array.from({ length: 5 }, (_, rowIdx) => (
        <div key={rowIdx} className="mb-2 grid grid-cols-[9rem_repeat(7,minmax(0,1fr))] gap-2">
          <div className="h-[76px] animate-pulse rounded bg-warm/60" />
          {Array.from({ length: 7 }, (_, colIdx) => (
            <div key={colIdx} className="h-[76px] animate-pulse rounded bg-warm" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DesktopPlanningView() {
  const [error, setError] = useState(false)

  const currentWeek = useAppStore((s) => s.currentWeek)
  const isLoadingPlan = useAppStore((s) => s.isLoadingPlan)

  useEffect(() => {
    let cancelled = false
    const { setWeekPlan, setLoadingPlan, setRecipes, setLoadingRecipes } = useAppStore.getState()

    const load = async () => {
      setError(false)
      setLoadingPlan(true)
      setLoadingRecipes(true)
      try {
        const [planRes, recipesRes] = await Promise.all([
          fetch(`/api/planning?week=${currentWeek}`),
          fetch('/api/recipes'),
        ])
        if (!planRes.ok || !recipesRes.ok) throw new Error('Fetch failed')
        const [weekPlan, recipes] = await Promise.all([planRes.json(), recipesRes.json()])
        if (!cancelled) {
          setWeekPlan(weekPlan)
          setRecipes(recipes)
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
    <div className="flex min-h-screen">
      {/* Left: Library sidebar placeholder — Epic 3 */}
      <aside className="w-60 flex-none border-r border-warm/40 bg-cream p-4">
        <p className="text-xs text-charcoal/40">Bibliothèque — Epic 3</p>
      </aside>

      {/* Center: Main content */}
      <section className="flex flex-1 flex-col overflow-y-auto">
        {/* AC6: non-blocking — error banner renders above content, never replaces it */}
        {error && <ErrorBanner />}
        {isLoadingPlan ? (
          <LoadingSkeleton />
        ) : (
          <>
            <WeekNav />
            <div className="flex-1 p-4">
              <MealGrid />
            </div>
          </>
        )}
      </section>

      {/* Right: Shopping panel placeholder — Epic 4 */}
      <aside className="w-[280px] flex-none border-l border-warm/40 bg-cream p-4">
        <p className="text-xs text-charcoal/40">Liste de courses — Epic 4</p>
      </aside>
    </div>
  )
}
