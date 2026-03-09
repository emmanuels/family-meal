'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppStore } from '@/store/store'
import type { Recipe, MealSlot, MealType } from '@/types/index'
import './print.css'

// ─── Week Date Range Formatter ────────────────────────────────────────────────

function getWeekDateRange(weekId: string): string {
  const match = weekId.match(/^(\d{4})-W(\d{1,2})$/)
  if (!match) return weekId // fallback: show raw weekId

  const year = parseInt(match[1], 10)
  const week = parseInt(match[2], 10)

  // Compute ISO week Monday (ISO 8601: week 1 = week containing Jan 4)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (week - 1) * 7)

  // Sunday = Monday + 6 days
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)

  const mondayDay = monday.getUTCDate()
  const sundayDay = sunday.getUTCDate()
  const mondayMonth = monday.toLocaleDateString('fr-FR', { month: 'long', timeZone: 'UTC' })
  const sundayMonth = sunday.toLocaleDateString('fr-FR', { month: 'long', timeZone: 'UTC' })
  const sundayYear = sunday.getUTCFullYear()

  if (monday.getUTCMonth() === sunday.getUTCMonth()) {
    return `Semaine du ${mondayDay} au ${sundayDay} ${sundayMonth} ${sundayYear}`
  }
  return `Semaine du ${mondayDay} ${mondayMonth} au ${sundayDay} ${sundayMonth} ${sundayYear}`
}

// ─────────────────────────────────────────────────────────────────────────────

const MEAL_CATEGORIES = [
  'Petit-déjeuner',
  'Déjeuner Midi',
  'Déjeuner Pique-nique',
  'Goûter',
  'Dîner',
] as const


const DAYS_OF_WEEK = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
]

function PrintPageContent() {
  const searchParams = useSearchParams()
  const currentWeekStore = useAppStore((state) => state.currentWeek)
  const weekPlanStore = useAppStore((state) => state.weekPlan)
  const recipes = useAppStore((state) => state.recipes)

  const [weekPlan, setWeekPlan] = useState(weekPlanStore)
  const [localRecipes, setLocalRecipes] = useState<Recipe[]>(recipes)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekParam = searchParams?.get('week') || currentWeekStore

  useEffect(() => {
    // Always fetch both — store may be empty when opened in a new tab
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [planRes, recipesRes] = await Promise.all([
          fetch(`/api/planning?week=${weekParam}`),
          fetch('/api/recipes'),
        ])

        if (!planRes.ok) throw new Error(`Failed to load week plan: ${planRes.statusText}`)
        if (!recipesRes.ok) throw new Error(`Failed to load recipes: ${recipesRes.statusText}`)

        const [planData, recipesData] = await Promise.all([planRes.json(), recipesRes.json()])
        setWeekPlan(planData)
        setLocalRecipes(recipesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [weekParam])

  // Function to get recipe by ID — uses locally fetched recipes, not Zustand store
  const getRecipe = (recipeId: string | null): Recipe | null => {
    if (!recipeId) return null
    return localRecipes.find((r) => r.id === recipeId) || null
  }

  // Function to render a meal cell
  const renderMealCell = (slot: MealSlot) => {
    const recipe = getRecipe(slot.recipeId)
    const displayName = recipe?.name ?? slot.recipeName

    if (!displayName) {
      return (
        <div className="print-cell print-cell-empty">
          <span className="print-empty-indicator">—</span>
        </div>
      )
    }

    return (
      <div className="print-cell">
        <div className="print-recipe-name">
          {displayName}
          {recipe?.isVegetarian && <span className="print-veggie-indicator">(V)</span>}
        </div>
        {slot.notes && <div className="print-annotation">{slot.notes}</div>}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="print-page print-loading">
        <p>Chargement du calendrier...</p>
      </div>
    )
  }

  if (error || !weekPlan) {
    return (
      <div className="print-page print-error">
        <p>Impossible de charger le plan de repas pour cette semaine</p>
        {error && <p style={{ fontSize: '12px' }}>{error}</p>}
      </div>
    )
  }

  // Group slots by day and meal type
  const slotsByDayAndMeal: Record<string, Record<string, MealSlot>> = {}

  for (let day = 0; day < 7; day++) {
    slotsByDayAndMeal[day] = {}
    for (const category of MEAL_CATEGORIES) {
      slotsByDayAndMeal[day][category] = {
        id: `empty-${day}-${category}`,
        date: '',
        day,
        slotType: category as MealType,
        recipeId: null,
        recipeName: null,
        notes: null,
      }
    }
  }

  // Fill in actual slots - match by day and slotType
  weekPlan.slots.forEach((slot) => {
    const dayIndex = slot.day
    const slotType = slot.slotType // Use .slotType property from MealSlot schema
    if (slotsByDayAndMeal[dayIndex] && slotsByDayAndMeal[dayIndex][slotType]) {
      slotsByDayAndMeal[dayIndex][slotType] = slot
    }
  })

  return (
    <div className="print-page">
      <div className="print-header">
        <div className="print-header-decos print-decos-left">
          <span>🥕</span><span>🫛</span><span>🥦</span><span>🍎</span>
        </div>
        <div className="print-header-center">
          <h1 className="print-title">Menu de la semaine</h1>
          <p className="print-subtitle">{getWeekDateRange(weekParam).toLowerCase()}</p>
        </div>
        <div className="print-header-decos print-decos-right">
          <span>🧅</span><span>🥬</span><span>🍐</span><span>🎃</span>
        </div>
      </div>

      <table className="print-calendar">
        <thead>
          <tr>
            <th className="print-category-header"></th>
            {DAYS_OF_WEEK.map((day) => (
              <th key={day} className="print-day-header">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEAL_CATEGORIES.map((category) => (
            <tr key={category} className="print-row">
              <th className="print-category-label">
                <span>{category}</span>
              </th>
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <td key={`${category}-${dayIndex}`} className="print-cell-wrapper">
                  {renderMealCell(slotsByDayAndMeal[dayIndex][category])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-footer">
        <p>Imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
      </div>
    </div>
  )
}

export default function PrintPage() {
  return (
    <Suspense
      fallback={
        <div className="print-page print-loading">
          <p>Chargement du calendrier...</p>
        </div>
      }
    >
      <PrintPageContent />
    </Suspense>
  )
}
