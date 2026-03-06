'use client'

import { cn } from '@/lib/utils'

export type FilterCategory = 'Tous' | 'Petit-déjeuner' | 'Déjeuner' | 'Goûter' | 'Dîner'

const FILTER_CATEGORIES: FilterCategory[] = [
  'Tous',
  'Petit-déjeuner',
  'Déjeuner',
  'Goûter',
  'Dîner',
]

interface FilterPillsProps {
  value: FilterCategory
  onChange: (cat: FilterCategory) => void
}

export function FilterPills({ value, onChange }: FilterPillsProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const pills = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
    )
    const currentIndex = pills.findIndex((p) => p === document.activeElement)
    if (currentIndex === -1) return
    const nextIndex =
      e.key === 'ArrowRight'
        ? (currentIndex + 1) % pills.length
        : (currentIndex - 1 + pills.length) % pills.length
    pills[nextIndex].focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Filtrer par catégorie"
      className="flex flex-wrap gap-1 px-4 py-2"
      onKeyDown={handleKeyDown}
    >
      {FILTER_CATEGORIES.map((cat) => {
        const isActive = value === cat
        return (
          <button
            key={cat}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(value === cat ? 'Tous' : cat)}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors',
              isActive
                ? 'bg-terracotta text-white'
                : 'border border-warm/60 bg-cream text-charcoal/70 hover:bg-warm',
            )}
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}
