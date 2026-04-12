'use client'

import { useMemo, useState } from 'react'
import { useShoppingList } from '@/hooks/useShoppingList'
import { useShoppingListByMeal } from '@/hooks/useShoppingListByMeal'
import { useAppStore } from '@/store/store'
import type { ShoppingItem } from '@/types/index'

type SortMode = 'rayon' | 'repas'

type RayonGroup = {
  rayon: string
  items: ShoppingItem[]
}

function groupByRayon(items: ShoppingItem[]): RayonGroup[] {
  // items are already sorted by rayon — just split into consecutive groups
  const groups: RayonGroup[] = []
  for (const item of items) {
    const last = groups.at(-1)
    if (last && last.rayon === item.rayon) {
      last.items.push(item)
    } else {
      groups.push({ rayon: item.rayon, items: [item] })
    }
  }
  return groups
}

export function ShoppingPanel({ className }: { className?: string }) {
  const [sortMode, setSortMode] = useState<SortMode>('rayon')

  const flatItems = useShoppingList()
  const mealGroups = useShoppingListByMeal()
  const hasWeekPlan = useAppStore((state) => !!state.weekPlan)

  const rayonGroups = useMemo(() => groupByRayon(flatItems), [flatItems])

  const isEmpty = sortMode === 'rayon' ? flatItems.length === 0 : mealGroups.length === 0

  return (
    <div className={className}>
      {/* Header with toggle */}
      <div className="mb-3 flex items-center justify-between border-b border-warm/30 pb-2">
        <h2 className="text-sm font-semibold text-charcoal">Liste de courses</h2>
        <button
          type="button"
          onClick={() => setSortMode((m) => (m === 'rayon' ? 'repas' : 'rayon'))}
          className="rounded border border-warm/60 px-2 py-0.5 text-[10px] font-medium text-charcoal/70 transition-colors hover:bg-warm"
          title="Changer le tri"
        >
          {sortMode === 'rayon' ? 'Par repas' : 'Par rayon'}
        </button>
      </div>

      {isEmpty ? (
        <div className="rounded bg-warm/20 p-3 text-center">
          <p className="text-xs text-charcoal/60">
            {!hasWeekPlan ? 'Chargement…' : 'Aucun repas planifié'}
          </p>
        </div>
      ) : sortMode === 'rayon' ? (
        /* ── Vue par rayon ─────────────────────────────────────── */
        <div className="space-y-3">
          {rayonGroups.map((group) => (
            <section key={group.rayon}>
              <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-charcoal/50">
                {group.rayon}
              </h3>
              <ul className="space-y-0.5">
                {group.items.map((item, idx) => (
                  <li key={`${item.name}-${item.unit}-${idx}`} className="text-xs text-charcoal">
                    <span className="font-medium">{item.quantity}</span>{' '}
                    <span className="text-charcoal/70">{item.unit}</span> —{' '}
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        /* ── Vue par repas ─────────────────────────────────────── */
        <div className="space-y-3">
          {mealGroups.map((group) => (
            <section key={group.key}>
              <h3 className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-charcoal/50">
                {group.label}
              </h3>
              {group.recipeName && (
                <p className="mb-1 text-[10px] italic text-charcoal/40">{group.recipeName}</p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item, idx) => (
                  <li key={`${item.name}-${item.unit}-${idx}`} className="text-xs text-charcoal">
                    <span className="font-medium">{item.quantity}</span>{' '}
                    <span className="text-charcoal/70">{item.unit}</span> —{' '}
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
